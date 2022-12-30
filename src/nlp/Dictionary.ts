import axios from 'axios'

export const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
export const NO_DEFS_FOUND = 'No Definitions Found'
export const NOUN = 'noun'

export interface NoDefinitionResponse {
  title?: string
}

export interface Definition {
  definition: string
}

export interface Definitions {
  partOfSpeech: string
  definitions: Record<string, Definition>
}

export interface Word {
  meanings: Record<string, Definitions>
}

export class CachedDictionaryClient<StoredType> {
  __cache: Map<string, StoredType>
  __mappingFunc: (definitions: string[]) => StoredType
  __defaultValue: StoredType

  constructor (
    mappingFunc: (definitions: string[]) => StoredType,
    defaultValue: StoredType
  ) {
    this.__cache = new Map()
    this.__mappingFunc = mappingFunc
    this.__defaultValue = defaultValue
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

  async getDef (word: string): Promise<StoredType> {
    word = word.toLowerCase()
    const cachedDefinition = this.__cache.get(word)
    if (cachedDefinition !== undefined) {
      return cachedDefinition
    }

    const response = await this._callDictionary(word)

    if (response.title === NO_DEFS_FOUND) {
      this.__cache.set(word, this.__defaultValue)
      return this.__defaultValue
    }

    const definitions = this._getNounDefinitions(
      response as Record<string, Word>
    )
    const valToStore = this.__mappingFunc(definitions)
    this.__cache.set(word, valToStore)
    return valToStore
  }
}

export const Dictionary = new CachedDictionaryClient<string[]>(
  (definitions: string[]) => definitions,
  []
)
