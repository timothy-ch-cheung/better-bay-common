import { describe, expect, test, beforeAll } from '@jest/globals'
import * as dotenv from 'dotenv'
import { BetterBayClient, buildBetterBayClient } from './index.js'
import { BetterBayItemResponse, BetterBayLimit } from './types.js'
import { AxiosError } from 'axios'

dotenv.config()

describe('BetterBayClient', () => {
  let client: BetterBayClient

  beforeAll(async () => {
    process.env.EBAY_CLIENT_ID ??= 'client_id'
    process.env.EBAY_CLIENT_SECRET ??= 'client_secret'
    process.env.EBAY_REDIRECT_URI ??= 'redirect_uri'
    return await buildBetterBayClient(
      process.env.EBAY_CLIENT_ID,
      process.env.EBAY_CLIENT_SECRET,
      process.env.EBAY_REDIRECT_URI,
      false
    ).then((betterBayClient) => {
      client = betterBayClient
    })
  })

  describe('Buy API', () => {
    test('Get cheapest item, single item group', async () => {
      const ITEM_GROUP_ID = '183636048622'
      const response: Promise<Record<string, BetterBayItemResponse>> =
        client.getCheapestItems([ITEM_GROUP_ID])

      return await response.then((cheapestItems) => {
        const cheapestItem = cheapestItems[ITEM_GROUP_ID]

        expect(cheapestItem.currency).toEqual('GBP')
        expect(cheapestItem.id).toEqual('v1|183636048622|691086221725')
        expect(cheapestItem.price).toEqual('1.69')
        expect(cheapestItem.title).toEqual(
          'Carolina Reaper Chilli Pepper Seeds Super Hot!!! Genuine Viable Seeds, UK Stock'
        )

        expect(Object.keys(cheapestItem.description).length).toEqual(1)
        expect(cheapestItem.description['Seeds Quantity']).toEqual('5 Seeds')
      })
    })

    test('Get cheapest item, single item group, multiple options', async () => {
      const ITEM_GROUP_ID = '354294946878'
      const response: Promise<Record<string, BetterBayItemResponse>> =
        client.getCheapestItems([ITEM_GROUP_ID])

      return await response.then((cheapestItems) => {
        const cheapestItem = cheapestItems[ITEM_GROUP_ID]

        expect(cheapestItem.currency).toEqual('GBP')
        expect(cheapestItem.id).toEqual('v1|354294946878|623687040110')
        expect(cheapestItem.price).toEqual('0.99')
        expect(cheapestItem.title).toEqual(
          'Genuine USB Type C Fast Charging Charger Cable for Samsung Galaxy S8 S9 S10 S20+'
        )

        expect(Object.keys(cheapestItem.description).length).toEqual(2)
        expect(cheapestItem.description.Colour).toEqual('Sim Tray Pin')
        expect(cheapestItem.description['Item Length']).toEqual('1 Piece')
      })
    })

    test('Get cheapest item, multiple item groups', async () => {
      const ITEM_GROUP_ID_1 = '294949898083'
      const ITEM_GROUP_ID_2 = '204264026067'
      const response: Promise<Record<string, BetterBayItemResponse>> =
        client.getCheapestItems([ITEM_GROUP_ID_1, ITEM_GROUP_ID_2])

      return await response.then((cheapestItems) => {
        const cheapestItem1 = cheapestItems[ITEM_GROUP_ID_1]

        expect(cheapestItem1.currency).toEqual('GBP')
        expect(cheapestItem1.id).toEqual('v1|294949898083|593517639533')
        expect(cheapestItem1.price).toEqual('0.99')
        expect(cheapestItem1.title).toEqual(
          'Fits Google Pixel 7 /Pixel 8 / Google Pixel 8 Pro Gel Case Clear Cover TPU Soft'
        )

        expect(Object.keys(cheapestItem1.description).length).toEqual(2)
        expect(cheapestItem1.description.COLOURS).toEqual(
          'Royal Mail will deliver your ORDER'
        )
        expect(cheapestItem1.description.MODELS).toEqual('Google Pixel 6 Pro')

        const cheapestItem2 = cheapestItems[ITEM_GROUP_ID_2]

        expect(cheapestItem2.currency).toEqual('GBP')
        expect(cheapestItem2.id).toEqual('v1|204264026067|504828824989')
        expect(cheapestItem2.price).toEqual('1.99')
        expect(cheapestItem2.title).toEqual(
          'Case For Google Pixel 7/6a/6/5a/5/4a/4/3a 5G PU Leather Wallet Flip Phone Cover'
        )

        expect(Object.keys(cheapestItem2.description).length).toEqual(2)
        expect(cheapestItem2.description.Models).toEqual(
          'Google Pixel 5a 5G (2021)'
        )
        expect(cheapestItem2.description.Colour).toEqual('Charging Cable')
      })
    })

    test('Get non existent item', async () => {
      const ITEM_GROUP_ID = '1234567890AB'
      await expect(async () => {
        await client.getCheapestItems([ITEM_GROUP_ID])
      }).rejects.toThrowError(
        new AxiosError('Request failed with status code 404')
      )
    })
  })

  describe('Developer API', () => {
    test('Health Check', async () => {
      const response: Promise<Record<string, BetterBayLimit>> =
        client.healthCheck()
      return await response.then((resource) => {
        expect(resource.cheapestItem.limit).toBe(5000)
      })
    })
  })
})
