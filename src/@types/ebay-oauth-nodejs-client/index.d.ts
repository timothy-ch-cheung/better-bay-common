interface AuthCredentials {
    clientId: string,
    clientSecret: string,
    redirectUri: string
}

interface ApplicationToken {
    access_token: string,
    expires_in: number,
    token_type: string
}

declare class EbayAuthToken {
    constructor(credentails: AuthCredentials) { }

    getApplicationToken(environment: string): ApplicationToken {

    }
}

declare module "ebay-oauth-nodejs-client" {
    export default EbayAuthToken;
}