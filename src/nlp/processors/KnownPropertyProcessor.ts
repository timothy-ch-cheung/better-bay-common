import { Processor, Report, BetterBayScore } from '../Processor.js'
import { BetterBayItem } from '../../types.js'
import natural, { BrillPOSTagger, Sentence, WordTokenizer } from 'natural'
import { CachedDictionaryClient } from './../Dictionary.js'

export enum Type {
  COLOUR = 'colour'
}

const NOUNS = ['N', 'NN', 'NNP', 'NNPS', 'NNS']
const ADJECTIVE = 'JJ'

const PROPERTIES: Map<string, string[]> = new Map()
PROPERTIES.set(Type.COLOUR, ['color', 'colour'])

export class KnownPropertyStore {
  __cache: Map<Type, CachedDictionaryClient<boolean>>
  __defaultVal = false

  constructor () {
    this.__cache = new Map()
    for (const key of Object.values(Type)) {
      this.__cache.set(
        key,
        new CachedDictionaryClient<boolean>(this._createMappingFunc(key), false)
      )
    }
  }

  _createMappingFunc (key: string): (defn: string[]) => boolean {
    return (definitions: string[]): boolean => {
      for (const defn of definitions) {
        for (const prop of PROPERTIES.get(key) as string[]) {
          if (defn.toLowerCase().includes(prop)) {
            return true
          }
        }
      }
      return this.__defaultVal
    }
  }

  async hasProperty (word: string, type: Type): Promise<boolean> {
    return (await this.__cache.get(type)?.getDef(word)) ?? this.__defaultVal
  }
}

export class KnownPropertyProcessor implements Processor {
  _tagger: BrillPOSTagger
  _tokenizer: WordTokenizer
  _properties: KnownPropertyStore

  constructor () {
    const lexicon = new natural.Lexicon('EN', 'N')
    const ruleSet = new natural.RuleSet('EN')
    this._tagger = new natural.BrillPOSTagger(lexicon, ruleSet)
    this._tokenizer = new natural.WordTokenizer()
    this._properties = new KnownPropertyStore()
  }

  _getDescriptionString (item: BetterBayItem): string {
    return Object.values(item.description).join(' ')
  }

  _descriptionContainsProp (item: BetterBayItem, type: Type): boolean {
    for (const descProp of Object.keys(item.description)) {
      for (const prop of PROPERTIES.get(type) as string[]) {
        if (descProp.toLowerCase().includes(prop)) {
          return true
        }
      }
    }
    return false
  }

  _tagPos (description: string): Sentence {
    const tokenized = this._tokenizer.tokenize(description.toLowerCase())
    return this._tagger.tag(tokenized)
  }

  async score (items: BetterBayItem[], title: string): Promise<Report> {
    const reportPromises = Object.values(Type).map(async (type) => {
      if (this._descriptionContainsProp(items[0], type)) {
        return await this._score(items, type)
      }
      return { confidence: 0, scores: {} }
    })
    const reports = await Promise.all(reportPromises)
    return reports.reduce((best, curr) => {
      return best.confidence > curr.confidence ? best : curr
    })
  }

  async _score (items: BetterBayItem[], type: Type): Promise<Report> {
    const results: Record<string, BetterBayScore> = {}
    for (const item of items) {
      const description = this._getDescriptionString(item)
      const sentence = this._tagPos(description)
      for (const word of sentence.taggedWords) {
        if (!NOUNS.includes(word.tag) && word.tag !== ADJECTIVE) {
          continue
        }
        const hasProp = await this._properties.hasProperty(word.token, type)
        if (hasProp) {
          results[item.id] = { score: 1, confidence: 1 }
        }
      }
      results[item.id] ??= { score: 0, confidence: 0 }
    }
    const numResults = Object.keys(results).length

    const avgScore =
      Object.values(results).reduce((acc, val) => {
        return acc + val.score
      }, 0) / numResults
    Object.keys(results).forEach((key) => {
      if (results[key].score === 0) {
        results[key].confidence = avgScore
      }
    })

    const sumConfidence = Object.values(results).reduce((acc, val) => {
      return acc + val.confidence
    }, 0)
    const avgConfidence = sumConfidence / numResults
    return { confidence: avgConfidence, scores: results }
  }
}
