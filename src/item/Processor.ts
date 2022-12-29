import { BetterBayItem } from '../types.js'

export interface BetterBayScore {
  score: number
  confidence: number
}

export interface Report {
  confidence: number
  scores: Record<string, BetterBayScore>
}

export interface Processor {
  score: (items: BetterBayItem[], title: string) => Promise<Report>
}
