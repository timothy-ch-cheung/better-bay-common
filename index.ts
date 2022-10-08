const axios = require('axios').default;

const EbayAuthToken = require('ebay-oauth-nodejs-client');
const EBAY_BASE_URL = 'https://api.ebay.com/buy/browse/v1/item';

class BetterBayClient {

    _ebayAuthToken;
    _token: String;

    constructor(clientId: String, clientSecret: String, redirectUri: String) {
        this._ebayAuthToken = new EbayAuthToken({
            clientId: clientId,
            clientSecret: clientSecret,
            redirectUri: redirectUri
        });
        this._generateToken();
    }



    async _generateToken(): Promise<void> {
        const response = await this._ebayAuthToken.getApplicationToken('PRODUCTION');
        this._token = response.access_token;
        setTimeout(() => this._generateToken(), response.expires_in);
    }
}

module.exports = {
    BetterBayClient
}