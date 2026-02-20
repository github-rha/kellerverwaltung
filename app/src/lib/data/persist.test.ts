import { beforeEach, describe, expect, it } from 'vitest'
import { clear, set } from 'idb-keyval'
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
					country: 'Germany',
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

	it('migrates old entries without country by setting country to empty string', async () => {
		const oldCellar = {
			schemaVersion: 1,
			wines: [
				{
					id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
					type: 'red',
					producer: 'Keller',
					producerKey: 'keller',
					name: 'Riesling',
					vintage: 2021,
					bottles: 6,
					notes: '',
					photoRef: '',
					addedAt: '2025-01-01T00:00:00Z'
					// no country field
				}
			]
		}
		await set('kellerverwaltung-cellar', oldCellar)
		const loaded = await loadCellar()
		expect(loaded.wines[0].country).toBe('')
	})
})
