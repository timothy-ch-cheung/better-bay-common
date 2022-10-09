export interface EbayTokenResponse {
    accessToken: string,
    expiresIn: number,
    tokenType: string
}

export interface EbayItem {
    id: string,
    title: string,
    price: number,
    curreny: string
}