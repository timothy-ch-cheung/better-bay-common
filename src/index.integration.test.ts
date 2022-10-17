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
            expect(cheapestItem.id).toEqual("v1|183636048622|691086221725");
            expect(cheapestItem.price).toEqual("1.69")
            expect(cheapestItem.title).toEqual("Carolina Reaper Chilli Pepper Seeds Super Hot!!! Genuine Viable Seeds, UK Stock")
            expect(cheapestItem.description).toEqual("[Seeds Quantity: 5 Seeds]")
        })
    });

    test('Get cheapest item, single item group, multiple options', () => {
        const ITEM_GROUP_ID = "354294946878"
        const response: Promise<Record<string, BetterBayItem>> = client.getCheapestItems([ITEM_GROUP_ID]);

        return response.then(cheapestItems => {
            const cheapestItem = cheapestItems[ITEM_GROUP_ID]

            expect(cheapestItem.currency).toEqual("GBP")
            expect(cheapestItem.id).toEqual("v1|354294946878|623687040110");
            expect(cheapestItem.price).toEqual("0.99")
            expect(cheapestItem.title).toEqual("USB Type C Fast Charging Charger Cable for Samsung Galaxy S8 S9 S10 S20+ Note UK")
            expect(cheapestItem.description).toEqual("[Colour: Sim Tray Pin][Item Length: 1 Piece]")
        })
    });
});