import {
  KnownPropertyStore,
  KnownPropertyProcessor,
  Type
} from './KnownPropertyProcessor.js'
import { item1, item2 } from '../__mocks__/betterBayMocks.js'
import { describe, expect, test } from '@jest/globals'

const getDefMock = jest.fn()
jest.mock('./../Dictionary.js', () => {
  return {
    CachedDictionaryClient: jest.fn().mockImplementation(() => {
      return { getDef: getDefMock }
    })
  }
})

describe('KnownPropertyStore', () => {
  let knownPropertyStore: KnownPropertyStore
  let colMappingFunc: (def: string[]) => boolean

  beforeAll(() => {
    knownPropertyStore = new KnownPropertyStore()
    colMappingFunc = knownPropertyStore._createMappingFunc(Type.COLOUR)
  })

  test('Mapping function returns true when colour property exists', () => {
    const hasProp = colMappingFunc([
      'A pale greenish-blue colour, like that of the gemstone.',
      'A sky-blue, greenish-blue, or greenish-gray semi-precious gemstone.'
    ])
    expect(hasProp).toEqual(true)
  })

  test('Mapping function returns true when color property exists (alternative spelling)', () => {
    const hasProp = colMappingFunc([
      'A pale greenish-blue color, like that of the gemstone.',
      'A sky-blue, greenish-blue, or greenish-gray semi-precious gemstone.'
    ])
    expect(hasProp).toEqual(true)
  })

  test('Mapping function returns false when property does not exist', () => {
    const hasProp = colMappingFunc([
      'A sky-blue, greenish-blue, or greenish-gray semi-precious gemstone.'
    ])
    expect(hasProp).toEqual(false)
  })
})

describe('KnownPropertyProcessor helper methods', () => {
  let knownPropertyProcessor: KnownPropertyProcessor

  beforeAll(() => {
    knownPropertyProcessor = new KnownPropertyProcessor()
  })

  describe('Get description string', () => {
    test('One property', () => {
      const description = knownPropertyProcessor._getDescriptionString(
        item1('123')
      )
      expect(description).toEqual('black')
    })

    test('Two properties', () => {
      const description = knownPropertyProcessor._getDescriptionString(
        item2('123')
      )
      expect(description).toEqual('4 large')
    })
  })

  describe('Description contains prop', () => {
    test('Returns true when description contains colour', () => {
      expect(
        knownPropertyProcessor._descriptionContainsProp(
          item1('123'),
          Type.COLOUR
        )
      ).toEqual(true)
    })

    test('Returns false when description does not contain colour', () => {
      expect(
        knownPropertyProcessor._descriptionContainsProp(
          item2('123'),
          Type.COLOUR
        )
      ).toEqual(false)
    })
  })

  describe('Tag POS', () => {
    test('Simple sentence', () => {
      const tagged = knownPropertyProcessor._tagPos('The dog walked slowly.')
      expect(tagged).toEqual({
        taggedWords: [
          { tag: 'DT', token: 'the' },
          { tag: 'NN', token: 'dog' },
          { tag: 'VBD', token: 'walked' },
          { tag: 'RB', token: 'slowly' }
        ]
      })
    })
  })
})

describe('KnownPropertyProcessor scoring', () => {
  let knownPropertyProcessor: KnownPropertyProcessor
  beforeAll(() => {
    knownPropertyProcessor = new KnownPropertyProcessor()
  })

  beforeEach(() => {
    getDefMock.mockClear()
  })

  describe('Score a specific type', () => {
    test('All lookups return true', async () => {
      getDefMock.mockResolvedValueOnce(true)
      const report = await knownPropertyProcessor._score(
        [item1('123')],
        Type.COLOUR
      )
      expect(report).toEqual({
        confidence: 1,
        scores: {
          123: {
            confidence: 1,
            score: 1
          }
        }
      })
    })

    test('One return true another returns false', async () => {
      getDefMock.mockResolvedValueOnce(true).mockReturnValueOnce(false)
      const report = await knownPropertyProcessor._score(
        [item1('123'), item1('234')],
        Type.COLOUR
      )
      expect(report).toEqual({
        confidence: 0.5,
        scores: {
          123: {
            confidence: 1,
            score: 1
          },
          234: {
            confidence: 0,
            score: 0
          }
        }
      })
    })

    test('Verb in description is not looked up', async () => {
      const item = {
        id: '123',
        price: '299.99',
        description: {
          os: 'Running Windows 10'
        }
      }
      const report = await knownPropertyProcessor._score([item], Type.COLOUR)
      expect(report).toEqual({
        confidence: 0,
        scores: {
          123: {
            confidence: 0,
            score: 0
          }
        }
      })
      expect(getDefMock).not.toBeCalledWith('running')
      expect(getDefMock).toBeCalledWith('windows')
    })
  })

  describe('Score all', () => {
    test('All lookups return true', async () => {
      getDefMock.mockResolvedValueOnce(true)
      const report = await knownPropertyProcessor.score(
        [item1('123')],
        'Item Title'
      )
      expect(report).toEqual({
        confidence: 1,
        scores: {
          123: {
            confidence: 1,
            score: 1
          }
        }
      })
    })

    test('Description does not contain colour', async () => {
      getDefMock.mockResolvedValueOnce(true)
      const report = await knownPropertyProcessor.score(
        [item2('123')],
        'Item Title'
      )
      expect(report).toEqual({
        confidence: 0,
        scores: {}
      })
      expect(getDefMock).toBeCalledTimes(0)
    })
  })
})
