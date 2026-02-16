import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import { loadCellar, saveCellar } from './persist'
import type { Cellar } from './types'

beforeEach(async () => {
	await clear()
})

describe('persistence', () => {
	it('roundtrips cellar data through IndexedDB', async () => {
		const cellar: Cellar = {
			schemaVersion: 1,
			wines: [
				{
					id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
					type: 'white',
					producer: 'Weingut Keller',
					producerKey: 'weingut-keller',
					name: 'Riesling Trocken',
					vintage: 2021,
					bottles: 6,
					notes: '',
					photoRef: 'photos/a1b2c3d4-e5f6-7890-abcd-ef1234567890.avif',
					addedAt: '2025-01-01T00:00:00Z'
				}
			]
		}

		await saveCellar(cellar)
		const loaded = await loadCellar()

		expect(loaded).toEqual(cellar)
	})

	it('returns empty cellar when no data exists', async () => {
		const loaded = await loadCellar()
		expect(loaded).toEqual({ schemaVersion: 1, wines: [] })
	})
})
