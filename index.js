"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios = require('axios').default;
const EbayAuthToken = require('ebay-oauth-nodejs-client');
const EBAY_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item';
class BetterBayClient {
    constructor(clientId, clientSecret, redirectUri) {
        this._ebayAuthToken = new EbayAuthToken({
            clientId: clientId,
            clientSecret: clientSecret,
            redirectUri: redirectUri
        });
        this._token = "";
        this._instance = axios.create({
            headers: {
                common: {
                    Authorization: this._token
                }
            }
        });
        let response = this._generateToken();
        response.then(token => {
            setInterval(() => this._generateToken(), token.expiresIn);
        });
    }
    _generateToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this._ebayAuthToken.getApplicationToken('PRODUCTION');
            this._token = 'Bearer ' + response.access_token;
            return { accessToken: response.access_token, expiresIn: response.expires_in, tokenType: response.token_type };
        });
    }
    _getItemGroup(itemGroupId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios.get(`${EBAY_BASE_URL}/get_items_by_item_group?item_group_id=${itemGroupId}`);
            return response.items.map((item) => {
                return {
                    id: item.itemId,
                    title: item.title,
                    price: item.price.convertedFromValue,
                    currency: item.price.convertedFromCurrency
                };
            });
        });
    }
    getCheapestItems(itemIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const cheapestItems = {};
            for (const id in itemIds) {
                const itemGroup = yield this._getItemGroup(id);
                const cheapestItem = itemGroup.reduce((prev, curr) => { return (prev.price < curr.price) ? prev : curr; });
                cheapestItems[id] = cheapestItem;
            }
            return cheapestItems;
        });
    }
}
module.exports = {
    BetterBayClient
};
