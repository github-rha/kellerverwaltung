import { writable } from 'svelte/store'
import { loadCellar, saveCellar } from './persist'
import { producerKey } from './producer-key'
import type { Cellar, WineEntry, WineType } from './types'
import { validate } from './validate'

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
