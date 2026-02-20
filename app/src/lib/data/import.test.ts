import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import { createWine, getAllWines, getTotalBottles, importWines, initStore } from './store'
import type { ImportEntry } from './csv'

function makeEntry(overrides: Partial<ImportEntry> = {}): ImportEntry {
	return {
		type: 'red',
		producer: 'Weingut Keller',
		name: 'Riesling',
		vintage: 2021,
		bottles: 6,
		notes: '',
		country: '',
		producerKey: 'weingut-keller',
		...overrides
	}
}

beforeEach(async () => {
	await clear()
	await initStore()
})

describe('importWines', () => {
	it('is a no-op when given an empty array', async () => {
		await importWines([], 'skip')
		expect(getAllWines()).toHaveLength(0)
	})

	it('imports new wines as WineEntries with generated ids', async () => {
		await importWines([makeEntry()], 'skip')
		const wines = getAllWines()
		expect(wines).toHaveLength(1)
		expect(wines[0].producer).toBe('Weingut Keller')
		expect(wines[0].name).toBe('Riesling')
		expect(wines[0].vintage).toBe(2021)
		expect(wines[0].bottles).toBe(6)
		expect(wines[0].photoRef).toBe('')
		expect(wines[0].id).toMatch(/^[0-9a-f-]{36}$/)
		expect(wines[0].addedAt).toBeTruthy()
	})

	it('imports multiple rows in a single persist call', async () => {
		const entries = [
			makeEntry({ name: 'Riesling', vintage: 2021 }),
			makeEntry({ name: 'Pinot', vintage: 2020 }),
			makeEntry({ name: 'Spätburgunder', vintage: 2019 })
		]
		await importWines(entries, 'skip')
		expect(getAllWines()).toHaveLength(3)
		expect(getTotalBottles()).toBe(18)
	})

	it('skip mode: does not import a duplicate', async () => {
		await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: 'original',
			country: ''
		})
		await importWines([makeEntry({ bottles: 99 })], 'skip')
		const wines = getAllWines()
		expect(wines).toHaveLength(1)
		expect(wines[0].bottles).toBe(3)
		expect(wines[0].notes).toBe('original')
	})

	it('overwrite mode: updates bottles and notes for a duplicate', async () => {
		const existing = await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: 'original',
			country: ''
		})
		await importWines([makeEntry({ bottles: 9, notes: 'updated' })], 'overwrite')
		const wines = getAllWines()
		expect(wines).toHaveLength(1)
		expect(wines[0].bottles).toBe(9)
		expect(wines[0].notes).toBe('updated')
		expect(wines[0].id).toBe(existing.id)
		expect(wines[0].addedAt).toBe(existing.addedAt)
		expect(wines[0].photoRef).toBe(existing.photoRef)
	})

	it('overwrite mode: preserves id, addedAt, and photoRef', async () => {
		const existing = await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: '',
			country: ''
		})
		await importWines([makeEntry()], 'overwrite')
		const updated = getAllWines()[0]
		expect(updated.id).toBe(existing.id)
		expect(updated.addedAt).toBe(existing.addedAt)
		expect(updated.photoRef).toBe(existing.photoRef)
	})

	it('skip mode: imports non-duplicates and skips duplicates', async () => {
		await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: '',
			country: ''
		})
		const entries = [
			makeEntry({ bottles: 99 }), // duplicate
			makeEntry({ name: 'Pinot', vintage: 2020, bottles: 5 }) // new
		]
		await importWines(entries, 'skip')
		const wines = getAllWines()
		expect(wines).toHaveLength(2)
		const riesling = wines.find((w) => w.name === 'Riesling')!
		expect(riesling.bottles).toBe(3) // unchanged
		const pinot = wines.find((w) => w.name === 'Pinot')!
		expect(pinot.bottles).toBe(5) // imported
	})

	it('duplicate detection is case-insensitive for name', async () => {
		await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: '',
			country: ''
		})
		// Same wine but name in different case — still a duplicate
		await importWines([makeEntry({ name: 'riesling', bottles: 99 })], 'skip')
		expect(getAllWines()).toHaveLength(1)
		expect(getAllWines()[0].bottles).toBe(3)
	})

	it('does not treat same name + different vintage as a duplicate', async () => {
		await createWine({
			type: 'red',
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: 2021,
			bottles: 3,
			notes: '',
			country: ''
		})
		await importWines([makeEntry({ vintage: 2020 })], 'skip')
		expect(getAllWines()).toHaveLength(2)
	})

	it('imports NV vintage correctly', async () => {
		await importWines([makeEntry({ vintage: 'NV' })], 'skip')
		expect(getAllWines()[0].vintage).toBe('NV')
	})

	it('deduplicates within the import batch itself', async () => {
		const entries = [
			makeEntry({ bottles: 6 }),
			makeEntry({ bottles: 9 }) // same key as first entry
		]
		await importWines(entries, 'skip')
		// Second entry is a duplicate of the first (which was just inserted)
		expect(getAllWines()).toHaveLength(1)
		expect(getAllWines()[0].bottles).toBe(6)
	})
})
