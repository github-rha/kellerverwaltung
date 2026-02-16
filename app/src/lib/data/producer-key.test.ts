import { describe, expect, it } from 'vitest'
import { producerKey } from './producer-key'

describe('producerKey', () => {
	it('converts to lowercase kebab-case', () => {
		expect(producerKey('Weingut Keller')).toBe('weingut-keller')
	})

	it('handles diacritics', () => {
		expect(producerKey('Domaine de la Romanée-Conti')).toBe('domaine-de-la-romanee-conti')
	})

	it('collapses multiple separators', () => {
		expect(producerKey('Pol   Roger')).toBe('pol-roger')
	})

	it('strips leading and trailing separators', () => {
		expect(producerKey(' -Keller- ')).toBe('keller')
	})
})
