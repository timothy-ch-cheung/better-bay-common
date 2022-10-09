export interface EbayTokenResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
}
interface EbayPrice {
    convertedFromValue: number;
    convertedFromCurrency: string;
}
export interface EbayItem {
    itemId: string;
    title: string;
    price: EbayPrice;
}
export interface BetterBayItem {
    id: string;
    title: string;
    price: number;
    curreny: string;
}
export {};
