import { describe, expect, test } from '@jest/globals'
import { BetterBayNLP } from './BetterBayNLP.js'
import { Report } from './Processor.js'
import { item1 } from './__mocks__/betterBayMocks.js'
import { KnownPropertyProcessor } from './processors/KnownPropertyProcessor.js'

jest.mock('./processors/KnownPropertyProcessor.js')

const report: (confidenceVal: number) => Report = (confidenceVal) => {
  return {
    confidence: confidenceVal,
    scores: {
      123: { score: 1, confidence: 1 },
      234: { score: 0, confidence: 0.8 }
    }
  }
}

describe('Better Bay NLP', () => {
  let betterBayNLP: BetterBayNLP

  beforeAll(() => {
    betterBayNLP = new BetterBayNLP()
  })

  describe('Score', () => {
    test('Score should return report when above confidence threshold', async () => {
      jest
        .spyOn(KnownPropertyProcessor.prototype, 'score')
        .mockResolvedValueOnce(report(0))
      const scores = await betterBayNLP.score([item1('123')], 'Item title')

      expect(scores).toEqual({})
    })

    test('Score should not return report when below confidence threshold', async () => {
      jest
        .spyOn(KnownPropertyProcessor.prototype, 'score')
        .mockResolvedValueOnce(report(0.9))
      const scores = await betterBayNLP.score([item1('123')], 'Item title')

      expect(scores).toEqual({
        123: { score: 1, confidence: 1 },
        234: { score: 0, confidence: 0.8 }
      })
    })
  })

  describe('Return true when is relevant to listing', () => {
    test('Item is relevant to listing', async () => {
      jest
        .spyOn(KnownPropertyProcessor.prototype, 'score')
        .mockResolvedValueOnce(report(0.9))

      const firstItem = item1('123')
      const secondItem = item1('234')
      const isRelevant = await betterBayNLP.isRelevantToListing(
        firstItem,
        [firstItem, secondItem],
        'Item Title'
      )

      expect(isRelevant).toEqual(true)
    })

    test('Return false when item is not relevant to listing', async () => {
      jest
        .spyOn(KnownPropertyProcessor.prototype, 'score')
        .mockResolvedValueOnce(report(0.9))

      const firstItem = item1('123')
      const secondItem = item1('234')
      const isRelevant = await betterBayNLP.isRelevantToListing(
        secondItem,
        [firstItem, secondItem],
        'Item Title'
      )

      expect(isRelevant).toEqual(false)
    })

    test('Return true when low confidence report returned', async () => {
      jest
        .spyOn(KnownPropertyProcessor.prototype, 'score')
        .mockResolvedValueOnce(report(0))

      const firstItem = item1('123')
      const secondItem = item1('234')
      const isRelevant = await betterBayNLP.isRelevantToListing(
        secondItem,
        [firstItem, secondItem],
        'Item Title'
      )

      expect(isRelevant).toEqual(true)
    })
  })
})
