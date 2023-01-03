import axios, { AxiosError } from 'axios'

const DICTIONARY_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
const NOUN = 'noun'
const ADJECTIVE = 'adjective'

interface Definition {
  definition: string
}

interface Definitions {
  partOfSpeech: string
  definitions: Definition[]
}

interface Word {
  word: string
  meanings: Definitions[]
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

  async _callDictionary (word: string): Promise<Word[]> {
    return await axios
      .get(DICTIONARY_URL + word)
      .then((response) => {
        return response.data
      })
      .catch((error: AxiosError) => {
        if (error.code !== '404') {
          console.log(error.response)
        }
        return []
      })
  }

  _getNounAndAdjDefinitions (definitionList: Word[]): string[] {
    return definitionList
      .map((definition) => {
        return definition.meanings.map((meaning) => {
          if (
            meaning.partOfSpeech === NOUN ||
            meaning.partOfSpeech === ADJECTIVE
          ) {
            return meaning.definitions.map((defn) => defn.definition)
          } else {
            return []
          }
        })
      })
      .flat(2)
  }

  async getDef (word: string): Promise<StoredType> {
    word = word.toLowerCase()
    const cachedDefinition = this.__cache.get(word)
    if (cachedDefinition !== undefined) {
      return cachedDefinition
    }

    const response = await this._callDictionary(word)

    if (response.length === 0) {
      this.__cache.set(word, this.__defaultValue)
      return this.__defaultValue
    }

    const definitions = this._getNounAndAdjDefinitions(response)
    const valToStore = this.__mappingFunc(definitions)
    this.__cache.set(word, valToStore)
    return valToStore
  }
}

export const Dictionary = new CachedDictionaryClient<string[]>(
  (definitions: string[]) => definitions,
  []
)
