import type { WineEntry, WineType } from './types'

export type SortOption = 'vintage-asc' | 'vintage-desc' | 'added-newest' | 'added-oldest'

export function filterByType(wines: WineEntry[], type: WineType | null): WineEntry[] {
	if (type === null) return wines
	return wines.filter((w) => w.type === type)
}

export function filterByProducer(wines: WineEntry[], producerKey: string | null): WineEntry[] {
	if (producerKey === null) return wines
	return wines.filter((w) => w.producerKey === producerKey)
}

export function filterByCountry(wines: WineEntry[], country: string | null): WineEntry[] {
	if (country === null) return wines
	return wines.filter((w) => w.country === country)
}

function vintageNumeric(v: number | 'NV'): number {
	return v === 'NV' ? 0 : v
}

export function sortWines(wines: WineEntry[], sort: SortOption): WineEntry[] {
	const copy = [...wines]
	switch (sort) {
		case 'vintage-asc':
			return copy.sort((a, b) => vintageNumeric(a.vintage) - vintageNumeric(b.vintage))
		case 'vintage-desc':
			return copy.sort((a, b) => vintageNumeric(b.vintage) - vintageNumeric(a.vintage))
		case 'added-newest':
			return copy.sort((a, b) => b.addedAt.localeCompare(a.addedAt))
		case 'added-oldest':
			return copy.sort((a, b) => a.addedAt.localeCompare(b.addedAt))
	}
}
