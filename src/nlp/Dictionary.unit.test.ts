import { describe, expect, test } from '@jest/globals'
import axios from 'axios'
import turquoiseDictResponse from './__mocks__/dictionary/turquoise.json'
import noDefinitionResponse from './__mocks__/dictionary/noDefinition.json'
import abstainDictResponse from './__mocks__/dictionary/abstain.json'
import { Dictionary } from './Dictionary.js'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Dictionary', () => {
  test('Should call out to dictionary api and cache definition', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: turquoiseDictResponse
    })

    const definition = await Dictionary.getDef('turquoise')
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://api.dictionaryapi.dev/api/v2/entries/en/turquoise'
    )
    expect(mockedAxios.get).toBeCalledTimes(1)
    expect(definition.length).toEqual(4)
    expect(definition).toContain(
      'A sky-blue, greenish-blue, or greenish-gray semi-precious gemstone.'
    )
    expect(definition).toContain(
      'A pale greenish-blue colour, like that of the gemstone.'
    )
    expect(definition).toContain('Made of turquoise (the gemstone).')
    expect(definition).toContain('Having a pale greenish-blue colour.')

    return await Dictionary.getDef('turquoise').then(() => {
      expect(mockedAxios.get).toBeCalledTimes(1)
    })
  })

  test('No definition found', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: noDefinitionResponse
    })

    const definition = await Dictionary.getDef('test')
    expect(definition.length).toEqual(0)
  })

  test('Verb definitions not returned', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: abstainDictResponse
    })

    const definition = await Dictionary.getDef('abstain')
    expect(definition.length).toEqual(0)
  })
})
