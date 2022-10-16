import { describe, expect, test, beforeAll } from '@jest/globals';
import * as dotenv from 'dotenv'
import { stringify } from 'querystring';
import { BetterBayClient, buildBetterBayClient } from './index.js'
import { BetterBayItem } from './types.js'

dotenv.config()

describe('BetterBayClient', () => {

    let client: BetterBayClient;

    beforeAll(() => {
        process.env.EBAY_CLIENT_ID ??= "client_id"
        process.env.EBAY_CLIENT_SECRET ??= "client_secret"
        process.env.EBAY_REDIRECT_URI ??= "redirect_uri"
        return buildBetterBayClient(process.env.EBAY_CLIENT_ID, process.env.EBAY_CLIENT_SECRET, process.env.EBAY_REDIRECT_URI, false).then(betterBayClient => {
            client = betterBayClient
        });
    });

    test('Get cheapest item, single item group', () => {
        const ITEM_GROUP_ID = "183636048622"
        const response: Promise<Record<string, BetterBayItem>> = client.getCheapestItems([ITEM_GROUP_ID]);

        return response.then(cheapestItems => {
            const cheapestItem = cheapestItems[ITEM_GROUP_ID]

            expect(cheapestItem.currency).toEqual("GBP")
            expect(cheapestItem.id).toEqual("abc");
            expect(cheapestItem.price).toEqual(1.69)
            expect(cheapestItem.title).toEqual("title")
        })
    });
});