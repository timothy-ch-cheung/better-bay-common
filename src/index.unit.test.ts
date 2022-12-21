import { describe, expect, test } from '@jest/globals'
import {
  buildAuthorization,
  getSelectionKeys,
  buildItemDescription,
  generateToken,
  buildBetterBayClient,
  BetterBayClient
} from './index.js'
import { stubInterface, StubbedInstance } from 'ts-sinon'
import { EbayItem, BetterBayItem, Limit } from './types.js'
import EbayAuthToken from 'ebay-oauth-nodejs-client'
import { AxiosInstance } from 'axios'
import sinon from 'sinon'

jest.mock('ebay-oauth-nodejs-client', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        getApplicationToken: jest
          .fn()
          .mockReturnValue(
            '{"access_token":"testToken", "expires_in":7200, "token_type": "testType"}'
          )
      }
    })
  }
})

const createItem = (colour: string): EbayItem => {
  return {
    itemId: '123',
    title: 'Item',
    price: {
      convertedFromValue: '2.42',
      convertedFromCurrency: 'GBP'
    },
    localizedAspects: [
      { type: 'STRING', name: 'Colour', value: colour },
      { type: 'STRING', name: 'Brand', value: 'Unbranded' },
      { type: 'STRING', name: 'Custom', value: 'No' }
    ]
  }
}

describe('Helper Functions', () => {
  describe('Build Authorization', () => {
    test('Token is Created', () => {
      expect(buildAuthorization('token')).toBe('Bearer token')
    })
  })

  describe('Get Selection Keys', () => {
    test('Colour is selected out from potential keys', () => {
      const keys = getSelectionKeys([
        createItem('Black'),
        createItem('Blue'),
        createItem('Red')
      ])
      expect(keys).toEqual(['Colour'])
    })

    test('Should not extract key if values are repeated', () => {
      const keys = getSelectionKeys([
        createItem('Red'),
        createItem('Red'),
        createItem('Red')
      ])
      expect(keys).toEqual([])
    })
  })

  describe('Build Item Description', () => {
    test('Extract one key', () => {
      const description = buildItemDescription(createItem('Black'), ['Colour'])
      expect(description).toEqual({ Colour: 'Black' })
    })

    test('Should ignore selection key if it does not exist', () => {
      const description = buildItemDescription(createItem('Blue'), [
        'Colour',
        'Test1',
        'Test2'
      ])
      expect(description).toEqual({ Colour: 'Blue' })
    })
  })

  describe('Generate Token', () => {
    test('Successful auth token create', async () => {
      const ebayAuthToken = stubInterface<EbayAuthToken>()
      ebayAuthToken.getApplicationToken.returns(
        new Promise((resolve) =>
          resolve(
            '{"access_token":"testToken", "expires_in":7200, "token_type": "testType"}'
          )
        )
      )
      const tokenPromise = generateToken(ebayAuthToken)

      return await tokenPromise.then((token) => {
        expect(token).toEqual({
          accessToken: 'testToken',
          expiresIn: 7200,
          tokenType: 'testType'
        })
      })
    })
  })

  describe('Build Better Bay Client', () => {
    test('When promised resolves, auth token should be defined', async () => {
      const clientPromise = buildBetterBayClient(
        'clientId',
        'clientSecret',
        'redirectUri',
        false
      )

      return await clientPromise.then((client) => {
        expect(client._instance.defaults.headers.Authorization).toEqual([
          'Bearer testToken'
        ])
      })
    })
  })
})

describe('Better Bay Client', () => {
  let client: BetterBayClient
  let ebayAuthToken: StubbedInstance<EbayAuthToken>
  let instance: StubbedInstance<AxiosInstance>
  const defaults = stubInterface<AxiosInstance['defaults']>()
  const item = (price: string): EbayItem => {
    return {
      itemId: '123',
      title: 'Very cool item',
      price: { convertedFromCurrency: 'GBP', convertedFromValue: price },
      localizedAspects: [{ type: 'STRING', name: 'Colour', value: 'Black' }]
    }
  }

  beforeEach(() => {
    instance = stubInterface<AxiosInstance>()
    instance.defaults = defaults
    ebayAuthToken = stubInterface<EbayAuthToken>()
    client = new BetterBayClient(ebayAuthToken, instance)
  })

  describe('Constructor', () => {
    let refreshSpy: any

    beforeEach(() => {
      instance.defaults = stubInterface<AxiosInstance['defaults']>()
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    beforeAll(() => {
      jest.useFakeTimers()
      refreshSpy = jest.spyOn(BetterBayClient.prototype, '_refreshToken')
    })

    afterAll(() => {
      jest.useRealTimers()
      refreshSpy.mockClear()
    })
    test('Without auto refresh', () => {
      expect(client._interval).toEqual(undefined)
    })

    test('With auto refresh, failed to refresh', async () => {
      client = new BetterBayClient(ebayAuthToken, instance, {
        refreshToken: { delay: 100 }
      })
      expect(client._interval).toBeDefined()
      jest.runOnlyPendingTimers()
      expect(refreshSpy).toBeCalledTimes(1)
      clearInterval(client._interval)
    })

    test('With auto refresh, successful refresh', async () => {
      ebayAuthToken.getApplicationToken.returns(
        new Promise((resolve) =>
          resolve(
            '{"access_token":"testToken", "expires_in":7200, "token_type": "testType"}'
          )
        )
      )
      client = new BetterBayClient(ebayAuthToken, instance, {
        refreshToken: { delay: 100 }
      })
      expect(client._interval).toBeDefined()
      jest.runOnlyPendingTimers()
      expect(refreshSpy).toBeCalledTimes(1)
      clearInterval(client._interval)
    })
  })

  describe('Internal Methods', () => {
    test('Get Item Group', async () => {
      instance.get.returns(
        new Promise((resolve) => resolve({ data: { items: [item('100')] } }))
      )

      const getItemPromise = client._getItemGroup('123')
      return await getItemPromise.then((items: BetterBayItem[]) => {
        expect(items.length).toEqual(1)
        expect(items[0].id).toEqual('123')
        expect(items[0].title).toEqual('Very cool item')
        expect(items[0].price).toEqual('100')
        expect(items[0].currency).toEqual('GBP')
        expect(items[0].description).toEqual({})
        sinon.assert.calledOnceWithExactly(
          instance.get,
          'https://api.ebay.com/buy/browse/v1/item/get_items_by_item_group?item_group_id=123'
        )
      })
    })
  })

  describe('Get Cheapest Items', () => {
    test('No items returned', async () => {
      instance.get.returns(
        new Promise((resolve) => resolve({ data: { items: [] } }))
      )

      const getItemPromise = client.getCheapestItems(['123'])
      return await getItemPromise.catch((error) => {
        expect(error.message).toEqual(
          'Call to Ebay API succeeded by zero item groups were returned'
        )
        sinon.assert.calledOnceWithExactly(
          instance.get,
          'https://api.ebay.com/buy/browse/v1/item/get_items_by_item_group?item_group_id=123'
        )
      })
    })

    test('Cheapest Item is found', async () => {
      instance.get.returns(
        new Promise((resolve) =>
          resolve({ data: { items: [item('100'), item('2')] } })
        )
      )

      const getItemPromise = client.getCheapestItems(['123'])
      return await getItemPromise.then((items) => {
        expect(items).toEqual({
          123: {
            currency: 'GBP',
            description: {},
            id: '123',
            price: '2',
            title: 'Very cool item'
          }
        })
        sinon.assert.calledOnceWithExactly(
          instance.get,
          'https://api.ebay.com/buy/browse/v1/item/get_items_by_item_group?item_group_id=123'
        )
      })
    })

    test('Cheapest Item is found (Decimal)', async () => {
      instance.get.returns(
        new Promise((resolve) =>
          resolve({
            data: { items: [item('3.18'), item('1.18'), item('1.95')] }
          })
        )
      )

      const getItemPromise = client.getCheapestItems(['123'])
      return await getItemPromise.then((items) => {
        expect(items).toEqual({
          123: {
            currency: 'GBP',
            description: {},
            id: '123',
            price: '1.18',
            title: 'Very cool item'
          }
        })
        sinon.assert.calledOnceWithExactly(
          instance.get,
          'https://api.ebay.com/buy/browse/v1/item/get_items_by_item_group?item_group_id=123'
        )
      })
    })
  })

  describe('Health Check', () => {
    const limit = (callsLeft: string): Limit[] => {
      return [
        {
          apiName: 'Browse',
          apiContext: 'Buy',
          apiVersion: 'V1',
          resources: [
            {
              name: 'buy.browse',
              rates: [
                {
                  limit: '100',
                  remaining: callsLeft,
                  reset: '2018-08-04T07:09:00.000Z',
                  timeWindow: '86400'
                }
              ]
            }
          ]
        }
      ]
    }
    test('Should return remaining', async () => {
      instance.get.returns(
        new Promise((resolve) =>
          resolve({
            data: { rateLimits: limit('55') }
          })
        )
      )
      const healthcheckPromise = client.healthCheck()
      return await healthcheckPromise.then((status) => {
        expect(status).toEqual({ cheapestItem: { limit: 100, remaining: 55 } })
      })
    })
  })
})
