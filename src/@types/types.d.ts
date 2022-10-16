interface ApplicationToken {
    access_token: string,
    expires_in: number,
    token_type: string
}

export interface EbayTokenResponse {
    accessToken: string,
    expiresIn: number,
    tokenType: string
}

interface EbayPrice {
    convertedFromValue: number,
    convertedFromCurrency: string
}

export interface EbayItem {
    itemId: string,
    title: string,
    price: EbayPrice
}

export interface EbayItemResponse {
    items: EbayItem[]
}

export interface BetterBayItem {
    id: string,
    title: string,
    price: number,
    currency: string
}

declare class EbayAuthToken {
    constructor(clientId: string, clientSecret: string, redirectUri: string) { }
}

declare module "ebay-oauth-nodejs-client" {
    export default EbayAuthToken;
}