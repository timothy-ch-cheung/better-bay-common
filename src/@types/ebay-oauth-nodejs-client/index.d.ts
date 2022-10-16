interface AuthCredentials {
    clientId: string,
    clientSecret: string,
    redirectUri: string
}

declare class EbayAuthToken {
    constructor(credentails: AuthCredentials) { }

    getApplicationToken(environment: string): Promise<string> {

    }
}

declare module "ebay-oauth-nodejs-client" {
    export default EbayAuthToken;
}