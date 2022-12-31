import { BetterBayItem } from '../types.js'
import { BetterBayScore, Processor } from './Processor.js'
import { KnownPropertyProcessor } from './processors/KnownPropertyProcessor.js'

const processors: Processor[] = [new KnownPropertyProcessor()]
const CONFIDENCE_THRESHOLD = 0.65
const SCORE_THRESHHOLD = 0.5

export class BetterBayNLP {
  async isRelevantToListing (
    item: BetterBayItem,
    items: BetterBayItem[],
    title: string
  ): Promise<boolean> {
    const scores = await this.score(items, title)
    if (Object.keys(scores).length === 0) {
      return true
    }

    const itemScore = scores[item.id]
    if (
      itemScore.confidence > CONFIDENCE_THRESHOLD &&
      itemScore.score < SCORE_THRESHHOLD
    ) {
      return false
    }
    return true
  }

  async score (
    items: BetterBayItem[],
    title: string
  ): Promise<Record<string, BetterBayScore>> {
    for (const processor of processors) {
      const report = await processor.score(items, title)
      if (report.confidence > CONFIDENCE_THRESHOLD) {
        return report.scores
      }
    }
    return {}
  }
}
