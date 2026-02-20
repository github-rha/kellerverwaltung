import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import { loadCellar } from './persist'
import {
	adjustCount,
	createWine,
	deleteWine,
	getAllWines,
	getTotalBottles,
	initStore,
	type CreateWineInput
} from './store'

const sampleInput: CreateWineInput = {
	type: 'red',
	producer: 'Weingut Keller',
	name: 'Riesling Trocken',
	vintage: 2021,
	bottles: 6,
	notes: '',
	country: ''
}

beforeEach(async () => {
	await clear()
	await initStore()
})

describe('integration', () => {
	it('create wine persists and survives reload', async () => {
		await createWine(sampleInput)
		expect(getAllWines()).toHaveLength(1)

		// Simulate app restart
		await initStore()
		expect(getAllWines()).toHaveLength(1)
		expect(getAllWines()[0].producer).toBe('Weingut Keller')
	})

	it('create wine then adjust count reflects in total', async () => {
		const wine = await createWine(sampleInput)
		await adjustCount(wine.id, 1)
		expect(getTotalBottles()).toBe(7)

		// Verify persistence
		const cellar = await loadCellar()
		const total = cellar.wines.reduce((sum, w) => sum + w.bottles, 0)
		expect(total).toBe(7)
	})

	it('create wine then delete results in empty list', async () => {
		const wine = await createWine(sampleInput)
		await deleteWine(wine.id)
		expect(getAllWines()).toHaveLength(0)

		// Verify persistence
		await initStore()
		expect(getAllWines()).toHaveLength(0)
	})
})
