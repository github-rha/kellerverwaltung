import { del, get, set } from 'idb-keyval'
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

function photoKey(wineId: string): string {
	return `photo:${wineId}`
}

export async function savePhoto(wineId: string, blob: Blob): Promise<void> {
	const buffer = await blob.arrayBuffer()
	await set(photoKey(wineId), buffer)
}

export async function loadPhoto(wineId: string): Promise<Blob | undefined> {
	const buffer = await get<ArrayBuffer>(photoKey(wineId))
	if (!buffer) return undefined
	return new Blob([buffer], { type: 'image/avif' })
}

export async function deletePhoto(wineId: string): Promise<void> {
	await del(photoKey(wineId))
}
