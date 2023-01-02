import { BetterBayItem } from '../../types.js'

export const item1: (itemId: string) => BetterBayItem = (itemId: string) => {
  return {
    id: itemId,
    price: '0.99',
    description: {
      color: 'black'
    }
  }
}

export const item2: (itemId: string) => BetterBayItem = (itemId: string) => {
  return {
    id: itemId,
    price: '1.99',
    description: {
      quantity: '4',
      size: 'large'
    }
  }
}
