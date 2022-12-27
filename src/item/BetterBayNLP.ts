import { BetterBayItem } from '../types.js'

interface BetterBayScore {
  score: number
}

export class BetterBayNLP {
  classify (items: BetterBayItem[], title: string): boolean {
    return false
  }

  score (items: BetterBayItem[], title: string): Record<string, BetterBayScore> {
    return {}
  }
}
