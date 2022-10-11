import { BetterBayItem, EbayItem, EbayTokenResponse } from "./types";

const axios = require('axios').default;

const EbayAuthToken = require('ebay-oauth-nodejs-client');
const EBAY_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item';

export class BetterBayClient {

    _ebayAuthToken;
    _token: String;
    _instance;

    constructor(clientId: String, clientSecret: String, redirectUri: String) {
        this._ebayAuthToken = new EbayAuthToken({
            clientId: clientId,
            clientSecret: clientSecret,
            redirectUri: redirectUri
        });
        this._token = ""
        this._instance = axios.create({
            headers: {
                common: {
                    Authorization: this._token
                }
            }
        })

        let response = this._generateToken();
        response.then(token => {
            setInterval(() => this._generateToken(), token.expiresIn);
        })
    }



    async _generateToken(): Promise<EbayTokenResponse> {
        const response = await this._ebayAuthToken.getApplicationToken('PRODUCTION');
        this._token = 'Bearer ' + response.access_token;
        return { accessToken: response.access_token, expiresIn: response.expires_in, tokenType: response.token_type }
    }

    async _getItemGroup(itemGroupId: String): Promise<BetterBayItem[]> {
        const response = await axios.get(`${EBAY_BASE_URL}/get_items_by_item_group?item_group_id=${itemGroupId}`);
        return response.items.map((item: EbayItem) => {
            return {
                id: item.itemId,
                title: item.title,
                price: item.price.convertedFromValue,
                currency: item.price.convertedFromCurrency
            }
        })
    }

    async getCheapestItems(itemIds: string[]): Promise<Record<string, BetterBayItem>> {
        const cheapestItems: Record<string, BetterBayItem> = {};
        for (const id in itemIds) {
            const itemGroup = await this._getItemGroup(id);
            const cheapestItem = itemGroup.reduce((prev, curr) => { return (prev.price < curr.price) ? prev : curr })
            cheapestItems[id] = cheapestItem;
        }
        return cheapestItems;
    }
}