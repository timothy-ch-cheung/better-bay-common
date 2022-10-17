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
    convertedFromValue: string,
    convertedFromCurrency: string
}

interface LocalizedAspect {
    type: string,
    name: string,
    value: string
}

export interface EbayItem {
    itemId: string,
    title: string,
    price: EbayPrice,
    localizedAspects: LocalizedAspect[]
}

export interface AxiosResponse<Type> {
    data: Type,
    status: number,
    statusText: string
}

export interface EbayItemResponse {
    items: EbayItem[]
}

export interface BetterBayItem {
    id: string,
    title: string,
    description,
    price: string,
    currency: string
}