import { describe, expect, it } from 'vitest'
import type { WineEntry } from './types'
import { filterByType, filterByProducer, filterByCountry, sortWines } from './filter-sort'

function makeWine(overrides: Partial<WineEntry> = {}): WineEntry {
	return {
		id: crypto.randomUUID(),
		type: 'red',
		producer: 'Weingut Keller',
		producerKey: 'weingut-keller',
		name: 'Riesling',
		vintage: 2021,
		bottles: 6,
		notes: '',
		country: '',
		photoRef: '',
		addedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	}
}

describe('filterByType', () => {
	const wines = [
		makeWine({ type: 'red' }),
		makeWine({ type: 'white' }),
		makeWine({ type: 'sparkling' }),
		makeWine({ type: 'red' })
	]

	it('returns only wines matching the type', () => {
		const result = filterByType(wines, 'red')
		expect(result).toHaveLength(2)
		expect(result.every((w) => w.type === 'red')).toBe(true)
	})

	it('returns all wines when type is null', () => {
		const result = filterByType(wines, null)
		expect(result).toHaveLength(4)
	})

	it('returns empty array when no wines match', () => {
		const result = filterByType(wines, 'dessert')
		expect(result).toHaveLength(0)
	})
})

describe('filterByProducer', () => {
	const wines = [
		makeWine({ producerKey: 'weingut-keller' }),
		makeWine({ producerKey: 'domaine-leroy' }),
		makeWine({ producerKey: 'weingut-keller' })
	]

	it('returns only wines matching the producer', () => {
		const result = filterByProducer(wines, 'weingut-keller')
		expect(result).toHaveLength(2)
		expect(result.every((w) => w.producerKey === 'weingut-keller')).toBe(true)
	})

	it('returns all wines when producerKey is null', () => {
		const result = filterByProducer(wines, null)
		expect(result).toHaveLength(3)
	})
})

describe('filterByCountry', () => {
	const wines = [
		makeWine({ country: 'Germany' }),
		makeWine({ country: 'France' }),
		makeWine({ country: 'Germany' })
	]

	it('returns only wines matching the country', () => {
		const result = filterByCountry(wines, 'Germany')
		expect(result).toHaveLength(2)
		expect(result.every((w) => w.country === 'Germany')).toBe(true)
	})

	it('returns all wines when country is null', () => {
		expect(filterByCountry(wines, null)).toHaveLength(3)
	})

	it('returns empty array when no wines match', () => {
		expect(filterByCountry(wines, 'Italy')).toHaveLength(0)
	})
})

describe('sortWines', () => {
	const wines = [
		makeWine({ vintage: 2020, addedAt: '2025-03-01T00:00:00.000Z' }),
		makeWine({ vintage: 2018, addedAt: '2025-01-01T00:00:00.000Z' }),
		makeWine({ vintage: 2022, addedAt: '2025-02-01T00:00:00.000Z' })
	]

	it('sorts by vintage ascending', () => {
		const result = sortWines(wines, 'vintage-asc')
		expect(result.map((w) => w.vintage)).toEqual([2018, 2020, 2022])
	})

	it('sorts by vintage descending', () => {
		const result = sortWines(wines, 'vintage-desc')
		expect(result.map((w) => w.vintage)).toEqual([2022, 2020, 2018])
	})

	it('sorts NV wines first when ascending', () => {
		const winesWithNV = [...wines, makeWine({ vintage: 'NV' })]
		const result = sortWines(winesWithNV, 'vintage-asc')
		expect(result[0].vintage).toBe('NV')
	})

	it('sorts by addedAt newest first', () => {
		const result = sortWines(wines, 'added-newest')
		expect(result.map((w) => w.addedAt)).toEqual([
			'2025-03-01T00:00:00.000Z',
			'2025-02-01T00:00:00.000Z',
			'2025-01-01T00:00:00.000Z'
		])
	})

	it('sorts by addedAt oldest first', () => {
		const result = sortWines(wines, 'added-oldest')
		expect(result.map((w) => w.addedAt)).toEqual([
			'2025-01-01T00:00:00.000Z',
			'2025-02-01T00:00:00.000Z',
			'2025-03-01T00:00:00.000Z'
		])
	})

	it('does not mutate the original array', () => {
		const original = [...wines]
		sortWines(wines, 'vintage-desc')
		expect(wines.map((w) => w.vintage)).toEqual(original.map((w) => w.vintage))
	})
})

describe('combined filter and sort', () => {
	it('filters then sorts correctly', () => {
		const wines = [
			makeWine({ type: 'red', vintage: 2022 }),
			makeWine({ type: 'white', vintage: 2019 }),
			makeWine({ type: 'red', vintage: 2018 }),
			makeWine({ type: 'red', vintage: 2020 })
		]

		const filtered = filterByType(wines, 'red')
		const sorted = sortWines(filtered, 'vintage-asc')

		expect(sorted).toHaveLength(3)
		expect(sorted.map((w) => w.vintage)).toEqual([2018, 2020, 2022])
	})
})
