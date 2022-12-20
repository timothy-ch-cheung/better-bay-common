import { describe, expect, test } from '@jest/globals'
import {
  buildAuthorization,
  getSelectionKeys,
  buildItemDescription,
  generateToken
} from './index.js'
import { stubInterface } from 'ts-sinon'
import { EbayItem } from './types.js'

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
})
