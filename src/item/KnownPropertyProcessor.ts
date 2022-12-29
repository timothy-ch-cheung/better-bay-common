import { Processor, Report } from './Processor.js'
import { BetterBayItem } from '../types.js'
import axios from 'axios'
import {
  DICTIONARY_URL,
  NO_DEFS_FOUND,
  NOUN,
  NoDefinitionResponse,
  Word
} from './Dictionary.js'

enum Type {
  COLOUR = 'colour'
}

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
  score (items: BetterBayItem[], title: string): Report {
    return { confidence: 0, scores: {} }
  }
}
