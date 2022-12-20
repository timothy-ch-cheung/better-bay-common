import { describe, expect, test } from '@jest/globals'
import { buildAuthorization } from './index.js'

describe('Helper Functions', () => {
  describe('Build Authorization', () => {
    test('Token is Created', () => {
      expect(buildAuthorization('token')).toBe('Bearer token')
    })
  })
})
