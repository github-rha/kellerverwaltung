import { get, set } from 'idb-keyval'
import type { Cellar } from './types'

const DB_KEY = 'kellerverwaltung-cellar'

export async function saveCellar(cellar: Cellar): Promise<void> {
	await set(DB_KEY, cellar)
}

export async function loadCellar(): Promise<Cellar> {
	const data = await get<Cellar>(DB_KEY)
	if (data) return data
	return { schemaVersion: 1, wines: [] }
}
