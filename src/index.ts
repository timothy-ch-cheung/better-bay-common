import { BetterBayItem, EbayItem, EbayTokenResponse, EbayItemResponse, ApplicationToken, AxiosResponse } from "./types.js";
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
            return response.data.items.map((item: EbayItem) => {
                return {
                    id: item.itemId,
                    title: item.title,
                    price: item.price.convertedFromValue,
                    currency: item.price.convertedFromCurrency
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

async function generateToken(ebayAuthToken: EbayAuthToken): Promise<EbayTokenResponse> {
    const response: string = await ebayAuthToken.getApplicationToken('PRODUCTION');
    const applicationToken: ApplicationToken = JSON.parse(response)
    return { accessToken: applicationToken.access_token, expiresIn: applicationToken.expires_in, tokenType: applicationToken.token_type }
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

    if (autoRefreshToken) {
        setInterval(async () => {
            let token = await generateToken(ebayAuthToken)
            client.setToken(buildAuthorization(token.accessToken))
        }, token.expiresIn)
    }

    let test = await client.getCheapestItems(["183636048622"]);

    return client
}