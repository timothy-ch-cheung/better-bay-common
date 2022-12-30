import { Processor, Report, BetterBayScore } from '../Processor.js'
import { BetterBayItem } from '../../types.js'
import axios from 'axios'
import natural, { BrillPOSTagger, Sentence, WordTokenizer } from 'natural'
import {
  DICTIONARY_URL,
  NO_DEFS_FOUND,
  NOUN,
  NoDefinitionResponse,
  Word
} from './../Dictionary.js'

enum Type {
  COLOUR = 'colour'
}

const NOUNS = ['N', 'NN', 'NNP', 'NNPS', 'NNS']

const PROPERTIES: Map<string, string[]> = new Map()
PROPERTIES.set(Type.COLOUR, ['color', 'colour'])

export class CachedDictionaryClient {
  __cache: Map<string, Map<string, boolean>>

  constructor () {
    this.__cache = new Map()
    for (const key of Object.values(Type)) {
      this.__cache.set(key, new Map())
    }
  }

  async _callDictionary (
    word: string
  ): Promise<NoDefinitionResponse | Record<string, Word>> {
    return await axios.get(DICTIONARY_URL + word)
  }

  _getNounDefinitions (definition: Record<string, Word>): string[] {
    return Object.values(definition)
      .map((word) => {
        return Object.values(word.meanings).map((meaning) => {
          if (meaning.partOfSpeech === NOUN) {
            return Object.values(meaning.definitions).map((defn) => {
              return defn.definition
            })
          } else {
            return []
          }
        })
      })
      .flat(3)
  }

  async hasPropertyInDefinition (type: Type, word: string): Promise<boolean> {
    const cachedDefinition = this.__cache.get(type)?.get(word)
    if (cachedDefinition !== undefined) {
      return cachedDefinition
    }
    if (PROPERTIES.get(type) === undefined) {
      return false
    }
    const props = PROPERTIES.get(type) as string[]

    await this._callDictionary(word).then(
      (response: NoDefinitionResponse | Record<string, Word>) => {
        if (response.title === NO_DEFS_FOUND) {
          this.__cache.get(type)?.set(word, false)
          return false
        }

        const definitions = this._getNounDefinitions(
          response as Record<string, Word>
        )
        for (const defn of definitions) {
          for (const prop of props) {
            if (defn.toLowerCase().includes(prop)) {
              this.__cache.get(type)?.set(word, true)
              return true
            }
          }
        }
      }
    )
    this.__cache.get(type)?.set(word, false)
    return false
  }
}
export class KnownPropertyProcessor implements Processor {
  _tagger: BrillPOSTagger
  _tokenizer: WordTokenizer
  _dictionary: CachedDictionaryClient

  constructor () {
    const lexicon = new natural.Lexicon('EN', 'N')
    const ruleSet = new natural.RuleSet('EN')
    this._tagger = new natural.BrillPOSTagger(lexicon, ruleSet)
    this._tokenizer = new natural.WordTokenizer()
    this._dictionary = new CachedDictionaryClient()
  }

  _getDescriptionString (item: BetterBayItem): string {
    return Object.values(item.description).join(' ')
  }

  _tagPos (description: string): Sentence {
    const tokenized = this._tokenizer.tokenize(description.toLowerCase())
    return this._tagger.tag(tokenized)
  }

  async score (items: BetterBayItem[], title: string): Promise<Report> {
    const reportPromises = Object.values(Type).map(
      async (type) => await this._score(items, title, type)
    )
    const reports = await Promise.all(reportPromises)
    return reports.reduce((best, curr) => {
      return best.confidence > curr.confidence ? best : curr
    })
  }

  async _score (
    items: BetterBayItem[],
    title: string,
    type: Type
  ): Promise<Report> {
    const results: Record<string, BetterBayScore> = {}
    for (const item of items) {
      const description = this._getDescriptionString(item)
      const sentence = this._tagPos(description)
      sentence.taggedWords.forEach((word) => {
        if (!NOUNS.includes(word.tag)) {
          return
        }
        const dictionaryPromise = this._dictionary.hasPropertyInDefinition(
          type,
          word.token
        )
        dictionaryPromise
          .then((hasPropInDef) => {
            if (hasPropInDef) {
              results[item.id] = { score: 1, confidence: 1 }
            }
          })
          .catch((error: Error) => console.log(error.message))
      })
      results[item.id] ??= { score: 0, confidence: 0 }
    }
    const sumConfidence = Object.values(results).reduce((acc, val) => {
      return acc + val.score
    }, 0)
    const avgConfidence = sumConfidence / Object.keys(results).length
    return { confidence: avgConfidence, scores: results }
  }
}
