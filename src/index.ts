import { BetterBayItem, EbayItem, EbayTokenResponse, EbayItemResponse, ApplicationToken, AxiosResponse } from "./types.d.js";
import axios, { AxiosInstance } from "axios";
import EbayAuthToken from "ebay-oauth-nodejs-client"

const EBAY_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item';

export class BetterBayClient {

    _ebayAuthToken;
    _instance;

    constructor(ebayAuthToken: EbayAuthToken, instance: AxiosInstance) {
        this._ebayAuthToken = ebayAuthToken;
        this._instance = instance;
    }

    setToken(accessToken: string) {
        this._instance.defaults.headers.Authorization = [buildAuthorization(accessToken)]
    }

    async _getItemGroup(itemGroupId: String): Promise<BetterBayItem[]> {
        try {
            const response: AxiosResponse<EbayItemResponse> = await this._instance.get(`${EBAY_BASE_URL}/get_items_by_item_group?item_group_id=${itemGroupId}`);
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
        } catch (error) {
            throw error;
        }
    }

    async getCheapestItems(itemIds: string[]): Promise<Record<string, BetterBayItem>> {
        const cheapestItems: Record<string, BetterBayItem> = {};
        for (const id of itemIds) {
            const itemGroup = await this._getItemGroup(id);
            const cheapestItem = itemGroup.reduce((prev, curr) => { return (prev.price < curr.price) ? prev : curr })
            cheapestItems[id] = cheapestItem;
        }
        return cheapestItems;
    }
}

function buildAuthorization(token: string) {
    return 'Bearer ' + token;
}

function getSelectionKeys(items: EbayItem[]): string[] {
    const categories: Record<string, Set<string>> = {}
    items.map(item => {
        item.localizedAspects.map(apsect => {
            if (!(apsect.name in categories)) {
                categories[apsect.name] = new Set()
            }
            categories[apsect.name].add(apsect.value)
        })
    })
    const selectionKeys: string[] = []
    Object.keys(categories).map(name => {
        if (categories[name].size > 1) {
            selectionKeys.push(name)
        }
    })
    return selectionKeys;
}

function buildItemDescription(item: EbayItem, selectionKeys: string[]): Record<string, string> {
    const aspects: Record<string, string> = {}
    item.localizedAspects.map(aspect => {
        aspects[aspect.name] = aspect.value
    })
    let description: Record<string, string> = {}
    for (let key of selectionKeys) {
        description[key] = aspects[key]
    }
    return description
}

async function generateToken(ebayAuthToken: EbayAuthToken): Promise<EbayTokenResponse> {
    try {
        const response: string = await ebayAuthToken.getApplicationToken('PRODUCTION');
        const applicationToken: ApplicationToken = JSON.parse(response)
        return { accessToken: applicationToken.access_token, expiresIn: applicationToken.expires_in, tokenType: applicationToken.token_type }
    } catch (error) {
        throw error
    }

}

export async function buildBetterBayClient(clientId: string, clientSecret: string, redirectUri: string, autoRefreshToken: boolean): Promise<BetterBayClient> {
    const ebayAuthToken = new EbayAuthToken({
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri
    });

    const token = await generateToken(ebayAuthToken);

    const instance = axios.create({
        headers: {
            common: {
                Authorization: [buildAuthorization(token.accessToken)]
            }
        }
    })

    const client = new BetterBayClient(ebayAuthToken, instance)
    client.setToken(token.accessToken)
    console.log("token will expire in " + token.expiresIn + " seconds")

    if (autoRefreshToken) {
        setInterval(async () => {
            let token = await generateToken(ebayAuthToken)
            client.setToken(token.accessToken)
            console.log("token will expire in " + token.expiresIn + " seconds")
        }, token.expiresIn * 1000)
    }

    return client
}