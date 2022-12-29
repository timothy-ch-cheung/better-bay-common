import { BetterBayItem } from '../types.js'
import { BetterBayScore } from './Processor.js'

export class BetterBayNLP {
  classify (items: BetterBayItem[], title: string): boolean {
    return false
  }

  score (items: BetterBayItem[], title: string): Record<string, BetterBayScore> {
    return {}
  }
}
