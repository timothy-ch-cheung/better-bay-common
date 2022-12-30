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
