import { del, get, set } from 'idb-keyval'
import { writable } from 'svelte/store'
import type { Cellar } from './types'

const DB_KEY = 'kellerverwaltung-cellar'
const UNSYNCED_KEY = 'kellerverwaltung-unsynced'

export const unsyncedStore = writable<boolean>(false)

export async function saveCellar(cellar: Cellar): Promise<void> {
	await set(DB_KEY, cellar)
	await set(UNSYNCED_KEY, true)
	unsyncedStore.set(true)
}

export async function loadCellar(): Promise<Cellar> {
	const data = await get<Cellar>(DB_KEY)
	if (!data) return { schemaVersion: 1, wines: [] }
	for (const w of data.wines) {
		const entry = w as unknown as Record<string, unknown>
		if (!('country' in entry)) entry.country = ''
	}
	return data
}

export async function loadSyncState(): Promise<void> {
	const unsynced = (await get<boolean>(UNSYNCED_KEY)) ?? false
	unsyncedStore.set(unsynced)
}

export async function markSynced(): Promise<void> {
	await set(UNSYNCED_KEY, false)
	unsyncedStore.set(false)
}

function photoKey(wineId: string): string {
	return `photo:${wineId}`
}

export async function savePhoto(wineId: string, blob: Blob): Promise<void> {
	const buffer = await blob.arrayBuffer()
	await set(photoKey(wineId), buffer)
}

export async function savePhotoBuffer(wineId: string, buffer: ArrayBuffer): Promise<void> {
	await set(photoKey(wineId), buffer)
}

export async function loadPhoto(wineId: string): Promise<Blob | undefined> {
	const buffer = await get<ArrayBuffer>(photoKey(wineId))
	if (!buffer) return undefined
	return new Blob([buffer], { type: 'image/avif' })
}

export async function loadPhotoBuffer(wineId: string): Promise<ArrayBuffer | undefined> {
	return get<ArrayBuffer>(photoKey(wineId))
}

export async function deletePhoto(wineId: string): Promise<void> {
	await del(photoKey(wineId))
}
