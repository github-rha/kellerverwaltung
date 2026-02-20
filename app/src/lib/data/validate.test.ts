import { describe, expect, it } from 'vitest'
import type { Cellar } from './types'
import { validate } from './validate'

function validCellar(overrides: Record<string, unknown> = {}): Cellar {
	return {
		schemaVersion: 1,
		wines: [
			{
				id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				type: 'red',
				producer: 'Test Producer',
				producerKey: 'test-producer',
				name: 'Test Wine',
				vintage: 2021,
				bottles: 6,
				notes: '',
				country: '',
				photoRef: 'photos/a1b2c3d4-e5f6-7890-abcd-ef1234567890.avif',
				addedAt: '2025-01-01T00:00:00Z',
				...overrides
			}
		]
	}
}

describe('validate', () => {
	it('accepts a valid cellar', () => {
		expect(validate(validCellar())).toEqual({ valid: true })
	})

	it('rejects invalid type value', () => {
		const result = validate(validCellar({ type: 'rose' }))
		expect(result.valid).toBe(false)
	})

	it('rejects vintage outside 1900-3000 range', () => {
		const result = validate(validCellar({ vintage: 1800 }))
		expect(result.valid).toBe(false)
	})

	it('accepts NV as vintage', () => {
		const result = validate(validCellar({ vintage: 'NV' }))
		expect(result).toEqual({ valid: true })
	})

	it('rejects negative bottle count', () => {
		const result = validate(validCellar({ bottles: -1 }))
		expect(result.valid).toBe(false)
	})
})
