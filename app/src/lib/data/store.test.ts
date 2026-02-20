import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import {
	adjustCount,
	createWine,
	deleteWine,
	getAllWines,
	getTotalBottles,
	getWine,
	initStore,
	updateWine,
	type CreateWineInput
} from './store'

const sampleInput: CreateWineInput = {
	type: 'red',
	producer: 'Weingut Keller',
	name: 'Riesling Trocken',
	vintage: 2021,
	bottles: 6,
	notes: 'Test note',
	country: 'Germany'
}

beforeEach(async () => {
	await clear()
	await initStore()
})

describe('createWine', () => {
	it('returns a wine with UUID, addedAt, and all fields set', async () => {
		const wine = await createWine(sampleInput)

		expect(wine.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
		expect(wine.addedAt).toBeTruthy()
		expect(wine.type).toBe('red')
		expect(wine.producer).toBe('Weingut Keller')
		expect(wine.producerKey).toBe('weingut-keller')
		expect(wine.name).toBe('Riesling Trocken')
		expect(wine.vintage).toBe(2021)
		expect(wine.bottles).toBe(6)
		expect(wine.notes).toBe('Test note')
	})

	it('with missing required field throws validation error', async () => {
		await expect(createWine({ ...sampleInput, producer: '' })).rejects.toThrow('Validation failed')
	})
})

describe('adjustCount', () => {
	it('increments bottles by 1', async () => {
		const wine = await createWine(sampleInput)
		await adjustCount(wine.id, 1)
		expect(getWine(wine.id)?.bottles).toBe(7)
	})

	it('decrements bottles by 1', async () => {
		const wine = await createWine(sampleInput)
		await adjustCount(wine.id, -1)
		expect(getWine(wine.id)?.bottles).toBe(5)
	})

	it('does not go below 0', async () => {
		const wine = await createWine({ ...sampleInput, bottles: 0 })
		await adjustCount(wine.id, -1)
		expect(getWine(wine.id)?.bottles).toBe(0)
	})
})

describe('updateWine', () => {
	it('changes fields and preserves others', async () => {
		const wine = await createWine(sampleInput)
		await updateWine(wine.id, { name: 'Updated Name' })

		const updated = getWine(wine.id)
		expect(updated?.name).toBe('Updated Name')
		expect(updated?.producer).toBe('Weingut Keller')
		expect(updated?.vintage).toBe(2021)
	})
})

describe('deleteWine', () => {
	it('removes entry from wines array', async () => {
		const wine = await createWine(sampleInput)
		expect(getAllWines()).toHaveLength(1)

		await deleteWine(wine.id)
		expect(getAllWines()).toHaveLength(0)
	})
})

describe('getAllWines', () => {
	it('returns all wines', async () => {
		await createWine(sampleInput)
		await createWine({ ...sampleInput, name: 'Second Wine' })
		expect(getAllWines()).toHaveLength(2)
	})
})

describe('getTotalBottles', () => {
	it('sums all bottle counts', async () => {
		await createWine({ ...sampleInput, bottles: 6 })
		await createWine({ ...sampleInput, bottles: 4 })
		expect(getTotalBottles()).toBe(10)
	})
})
