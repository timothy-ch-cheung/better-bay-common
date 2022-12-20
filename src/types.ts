export interface ApplicationToken {
  access_token: string
  expires_in: number
  token_type: string
}

export interface EbayTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: string
}

interface EbayPrice {
  convertedFromValue: string
  convertedFromCurrency: string
}

interface LocalizedAspect {
  type: string
  name: string
  value: string
}

export interface EbayItem {
  itemId: string
  title: string
  price: EbayPrice
  localizedAspects: LocalizedAspect[]
}

export interface EbayItemResponse {
  items: EbayItem[]
}

export interface Rate {
  limit: string
  remaining: string
  reset: string
  timeWindow: string
}

export interface Resource {
  name: string
  rates: Rate[]
}

export interface Limit {
  apiContext: string
  apiName: string
  apiVersion: string
  resources: Resource[]
}

export interface EbayLimitResponse {
  rateLimits: Limit[]
}

export interface BetterBayItem {
  id: string
  title: string
  description: Record<string, string>
  price: string
  currency: string
}

export interface BetterBayLimit {
  limit: number
  remaining: number
}

export interface AxiosResponse<Type> {
  data: Type
  status: number
  statusText: string
}
