import {
  BetterBayItem,
  BetterBayItemResponse,
  BetterBayItemGroup,
  EbayItem,
  EbayTokenResponse,
  EbayItemResponse,
  ApplicationToken,
  AxiosResponse,
  EbayLimitResponse,
  Limit,
  Resource,
  BetterBayLimit
} from './types.js'
import axios, { AxiosInstance } from 'axios'
import EbayAuthToken from 'ebay-oauth-nodejs-client'
import { BetterBayNLP } from './nlp/BetterBayNLP.js'
import * as AxiosLogger from 'axios-logger'

const EBAY_ITEM_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item'
const EBAY_ANALYTICS_BASE_URL =
  'https://api.ebay.com/developer/analytics/v1_beta'

interface Refresh {
  delay: number
}
interface Options {
  refreshToken?: Refresh
}

export class BetterBayClient {
  _instance
  _interval
  _betterBayNLP
  _refreshToken (ebayAuthToken: EbayAuthToken): void {
    generateToken(ebayAuthToken)
      .then((newToken) => {
        this.setToken(newToken.accessToken)
        console.log(`token will expire in ${newToken.expiresIn} seconds`)
      })
      .catch((error: Error) => {
        console.log(`Failed to refresh token [${error.message}]`)
      })
  }

  constructor (
    ebayAuthToken: EbayAuthToken,
    instance: AxiosInstance,
    options?: Options
  ) {
    this._instance = instance
    this._betterBayNLP = new BetterBayNLP()
    if (options?.refreshToken != null) {
      this._interval = setInterval(
        () => this._refreshToken(ebayAuthToken),
        options.refreshToken.delay * 1000
      )
    }
  }

  setToken (accessToken: string): void {
    this._instance.defaults.headers.Authorization = [
      buildAuthorization(accessToken)
    ]
  }

  async _getItemGroup (itemGroupId: string): Promise<BetterBayItemGroup> {
    const response: AxiosResponse<EbayItemResponse> = await this._instance.get(
      `${EBAY_ITEM_BASE_URL}/get_items_by_item_group?item_group_id=${itemGroupId}`
    )
    const selectionKeys = getSelectionKeys(response.data.items)

    if (response.data.items.length === 0) {
      throw new Error(
        'Call to Ebay API succeeded, but zero item groups were returned'
      )
    }
    const ebayItems: BetterBayItem[] = response.data.items.map(
      (item: EbayItem) => {
        return {
          id: item.itemId,
          price: item.price.convertedFromValue,
          description: buildItemDescription(item, selectionKeys)
        }
      }
    )
    const first = response.data.items[0]
    return {
      title: first.title,
      currency: first.price.convertedFromCurrency,
      items: ebayItems
    }
  }

  async getCheapestItems (
    itemIds: string[],
    analyse: boolean = false
  ): Promise<Record<string, BetterBayItemResponse>> {
    const cheapestItems: Record<string, BetterBayItemResponse> = {}
    for (const id of itemIds) {
      const itemGroup = await this._getItemGroup(id)
      const cheapestItem = itemGroup.items.reduce((prev, curr) => {
        return parseFloat(prev.price) < parseFloat(curr.price) ? prev : curr
      })

      cheapestItems[id] = {
        ...cheapestItem,
        title: itemGroup.title,
        currency: itemGroup.currency
      }
      if (analyse) {
        const isRelevant = await this._betterBayNLP.isRelevantToListing(
          cheapestItem,
          itemGroup.items,
          itemGroup.title
        )
        cheapestItems[id].isRelevant = isRelevant
      }
    }
    return cheapestItems
  }

  async healthCheck (): Promise<Record<string, BetterBayLimit>> {
    const response: AxiosResponse<EbayLimitResponse> = await this._instance.get(
      `${EBAY_ANALYTICS_BASE_URL}/rate_limit`
    )
    const limits = response.data.rateLimits.find((limit: Limit) => {
      return limit.apiName.trim() === 'Browse'
    })
    const browseLimit = limits?.resources.find((rate: Resource) => {
      return rate.name.trim() === 'buy.browse'
    })
    const browseRateLimit = browseLimit?.rates[0]

    return {
      cheapestItem: {
        limit: browseRateLimit != null ? parseInt(browseRateLimit.limit) : -1,
        remaining:
          browseRateLimit != null ? parseInt(browseRateLimit.remaining) : -1
      }
    }
  }
}

export function buildAuthorization (token: string): string {
  return 'Bearer ' + token
}

export function getSelectionKeys (items: EbayItem[]): string[] {
  const categories: Record<string, Set<string>> = {}
  items.forEach((item) => {
    item.localizedAspects.forEach((apsect) => {
      if (!(apsect.name in categories)) {
        categories[apsect.name] = new Set()
      }
      categories[apsect.name].add(apsect.value)
    })
  })
  const selectionKeys: string[] = []
  Object.keys(categories).forEach((name) => {
    if (categories[name].size > 1) {
      selectionKeys.push(name)
    }
  })
  return selectionKeys
}

export function buildItemDescription (
  item: EbayItem,
  selectionKeys: string[]
): Record<string, string> {
  const aspects: Record<string, string> = {}
  item.localizedAspects.forEach((aspect) => {
    aspects[aspect.name] = aspect.value
  })
  const description: Record<string, string> = {}
  for (const key of selectionKeys) {
    description[key] = aspects[key]
  }
  return description
}

export async function generateToken (
  ebayAuthToken: EbayAuthToken
): Promise<EbayTokenResponse> {
  const response: string = await ebayAuthToken.getApplicationToken('PRODUCTION')
  const applicationToken: ApplicationToken = JSON.parse(response)
  return {
    accessToken: applicationToken.access_token,
    expiresIn: applicationToken.expires_in,
    tokenType: applicationToken.token_type
  }
}

export async function buildBetterBayClient (
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  autoRefreshToken: boolean
): Promise<BetterBayClient> {
  const ebayAuthToken = new EbayAuthToken({
    clientId,
    clientSecret,
    redirectUri
  })

  const token = await generateToken(ebayAuthToken)

  const instance = axios.create({
    headers: {
      common: {
        Authorization: [buildAuthorization(token.accessToken)]
      }
    }
  })
  instance.interceptors.request.use(AxiosLogger.requestLogger)
  instance.interceptors.response.use((request) => {
    return AxiosLogger.responseLogger(request, { data: false, headers: false })
  })

  const options = autoRefreshToken
    ? { refreshToken: { delay: token.expiresIn } }
    : {}
  const client = new BetterBayClient(ebayAuthToken, instance, options)
  client.setToken(token.accessToken)
  console.log(`token will expire in ${token.expiresIn} seconds`)

  return client
}

export { BetterBayItemResponse }
