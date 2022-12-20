import {
  BetterBayItem,
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

const EBAY_ITEM_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item'
const EBAY_ANALYTICS_BASE_URL =
  'https://api.ebay.com/developer/analytics/v1_beta'

export class BetterBayClient {
  _ebayAuthToken
  _instance

  constructor (ebayAuthToken: EbayAuthToken, instance: AxiosInstance) {
    this._ebayAuthToken = ebayAuthToken
    this._instance = instance
  }

  setToken (accessToken: string): void {
    this._instance.defaults.headers.Authorization = [
      buildAuthorization(accessToken)
    ]
  }

  async _getItemGroup (itemGroupId: string): Promise<BetterBayItem[]> {
    const response: AxiosResponse<EbayItemResponse> = await this._instance.get(
      `${EBAY_ITEM_BASE_URL}/get_items_by_item_group?item_group_id=${itemGroupId}`
    )
    const selectionKeys = getSelectionKeys(response.data.items)

    return response.data.items.map((item: EbayItem) => {
      return {
        id: item.itemId,
        title: item.title,
        price: item.price.convertedFromValue,
        currency: item.price.convertedFromCurrency,
        description: buildItemDescription(item, selectionKeys)
      }
    })
  }

  async getCheapestItems (
    itemIds: string[]
  ): Promise<Record<string, BetterBayItem>> {
    const cheapestItems: Record<string, BetterBayItem> = {}
    for (const id of itemIds) {
      const itemGroup = await this._getItemGroup(id)
      const cheapestItem = itemGroup.reduce((prev, curr) => {
        return parseInt(prev.price) < parseInt(curr.price) ? prev : curr
      })
      cheapestItems[id] = cheapestItem
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

function buildAuthorization (token: string): string {
  return 'Bearer ' + token
}

function getSelectionKeys (items: EbayItem[]): string[] {
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

function buildItemDescription (
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

async function generateToken (
  ebayAuthToken: EbayAuthToken
): Promise<EbayTokenResponse> {
  const response: string = await ebayAuthToken.getApplicationToken(
    'PRODUCTION'
  )
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

  const client = new BetterBayClient(ebayAuthToken, instance)
  client.setToken(token.accessToken)
  console.log(`token will expire in ${token.expiresIn} seconds`)

  if (autoRefreshToken) {
    setInterval(() => {
      generateToken(ebayAuthToken)
        .then((newToken) => {
          client.setToken(newToken.accessToken)
          console.log(`token will expire in ${newToken.expiresIn} seconds`)
        })
        .catch(() => {
          console.log('Failed to refresh token')
        })
    }, token.expiresIn * 1000)
  }

  return client
}

export { BetterBayItem }
