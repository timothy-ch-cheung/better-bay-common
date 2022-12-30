import { KnownPropertyProcessor, Type } from './KnownPropertyProcessor.js'
import { BetterBayItem } from '../../types.js'

describe('KnownPropertyProcessor helper methods', () => {
  let knownPropertyProcessor: KnownPropertyProcessor
  const item1: BetterBayItem = {
    id: '123',
    price: '0.99',
    description: {
      color: 'black'
    }
  }

  const item2: BetterBayItem = {
    id: '234',
    price: '1.99',
    description: {
      quantity: '4',
      size: 'large'
    }
  }

  beforeAll(() => {
    knownPropertyProcessor = new KnownPropertyProcessor()
  })

  describe('Get description string', () => {
    test('One property', () => {
      const description = knownPropertyProcessor._getDescriptionString(item1)
      expect(description).toEqual('black')
    })

    test('Two properties', () => {
      const description = knownPropertyProcessor._getDescriptionString(item2)
      expect(description).toEqual('4 large')
    })
  })

  describe('Description contains prop', () => {
    test('Returns true when description contains colour', () => {
      expect(
        knownPropertyProcessor._descriptionContainsProp(item1, Type.COLOUR)
      ).toEqual(true)
    })

    test('Returns false when description does not contain colour', () => {
      expect(
        knownPropertyProcessor._descriptionContainsProp(item2, Type.COLOUR)
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
