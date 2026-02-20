import { writable } from 'svelte/store'
import { deletePhoto, loadCellar, loadSyncState, saveCellar } from './persist'
import { producerKey } from './producer-key'
import type { Cellar, WineEntry, WineType } from './types'
import { validate } from './validate'
import type { ImportEntry } from './csv'

function uuid(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
		(+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
	)
}

let cellar: Cellar = { schemaVersion: 1, wines: [] }

export const cellarStore = writable<Cellar>(cellar)

export async function initStore(): Promise<void> {
	cellar = await loadCellar()
	cellarStore.set(cellar)
	await loadSyncState()
}

export async function reloadStore(): Promise<void> {
	cellar = await loadCellar()
	cellarStore.set(cellar)
}

async function persist(): Promise<void> {
	const result = validate(cellar)
	if (!result.valid) {
		throw new Error(`Validation failed: ${result.errors}`)
	}
	await saveCellar(cellar)
	cellarStore.set(cellar)
}

export interface CreateWineInput {
	type: WineType
	producer: string
	name: string
	vintage: number | 'NV'
	bottles: number
	notes: string
	country: string
}

export async function createWine(input: CreateWineInput): Promise<WineEntry> {
	const entry: WineEntry = {
		id: uuid(),
		type: input.type,
		producer: input.producer,
		producerKey: producerKey(input.producer),
		name: input.name,
		vintage: input.vintage,
		bottles: Math.max(0, input.bottles),
		notes: input.notes,
		country: input.country,
		photoRef: '',
		addedAt: new Date().toISOString()
	}

	// Temporarily add to validate, then persist
	cellar = { ...cellar, wines: [...cellar.wines, entry] }
	await persist()
	return entry
}

export async function updateWine(
	id: string,
	updates: Partial<Omit<WineEntry, 'id' | 'producerKey' | 'addedAt'>>
): Promise<void> {
	const index = cellar.wines.findIndex((w) => w.id === id)
	if (index === -1) throw new Error(`Wine not found: ${id}`)

	const existing = cellar.wines[index]
	const updated = { ...existing, ...updates }

	// Recompute producerKey if producer changed
	if (updates.producer) {
		updated.producerKey = producerKey(updates.producer)
	}

	const wines = [...cellar.wines]
	wines[index] = updated
	cellar = { ...cellar, wines }
	await persist()
}

export async function deleteWine(id: string): Promise<void> {
	const wine = cellar.wines.find((w) => w.id === id)
	if (wine?.photoRef) {
		await deletePhoto(id)
	}
	cellar = { ...cellar, wines: cellar.wines.filter((w) => w.id !== id) }
	await persist()
}

export async function adjustCount(id: string, delta: number): Promise<void> {
	const index = cellar.wines.findIndex((w) => w.id === id)
	if (index === -1) throw new Error(`Wine not found: ${id}`)

	const wines = [...cellar.wines]
	wines[index] = {
		...wines[index],
		bottles: Math.max(0, wines[index].bottles + delta)
	}
	cellar = { ...cellar, wines }
	await persist()
}

export function getWine(id: string): WineEntry | undefined {
	return cellar.wines.find((w) => w.id === id)
}

export function getAllWines(): WineEntry[] {
	return cellar.wines
}

export function getTotalBottles(): number {
	return cellar.wines.reduce((sum, w) => sum + w.bottles, 0)
}

function dupKey(pKey: string, name: string, vintage: number | 'NV'): string {
	return `${pKey}::${name.toLowerCase().trim()}::${vintage}`
}

export async function importWines(
	entries: ImportEntry[],
	duplicateMode: 'skip' | 'overwrite'
): Promise<void> {
	if (entries.length === 0) return

	const now = new Date().toISOString()

	const existingIndex = new Map<string, number>()
	for (let i = 0; i < cellar.wines.length; i++) {
		const w = cellar.wines[i]
		existingIndex.set(dupKey(w.producerKey, w.name, w.vintage), i)
	}

	const wines = [...cellar.wines]

	for (const entry of entries) {
		const key = dupKey(entry.producerKey, entry.name, entry.vintage)
		const idx = existingIndex.get(key)

		if (idx !== undefined) {
			if (duplicateMode === 'overwrite') {
				wines[idx] = { ...wines[idx], bottles: entry.bottles, notes: entry.notes }
			}
		} else {
			const wine: WineEntry = {
				id: uuid(),
				type: entry.type,
				producer: entry.producer,
				producerKey: entry.producerKey,
				name: entry.name,
				vintage: entry.vintage,
				bottles: entry.bottles,
				notes: entry.notes,
				country: entry.country,
				photoRef: '',
				addedAt: now
			}
			wines.push(wine)
			existingIndex.set(key, wines.length - 1)
		}
	}

	cellar = { ...cellar, wines }
	await persist()
}
