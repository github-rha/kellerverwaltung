import type { WineType } from './types'
import type { SortOption, BottleFilter } from './filter-sort'

export interface SessionFilterState {
	activeType: WineType | null
	activeProducer: string | null
	activeCountry: string | null
	activeSort: SortOption
	bottleFilter: BottleFilter
}

const KEY = 'kellerverwaltung-session-filters'

export function saveSessionFilters(state: SessionFilterState): void {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(state))
	} catch {
		// sessionStorage full or unavailable — silently ignore
	}
}

export function loadSessionFilters(): SessionFilterState | null {
	try {
		const raw = sessionStorage.getItem(KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		// Basic validation
		if (typeof parsed !== 'object' || parsed === null) return null
		if (!['red', 'white', 'sparkling', 'dessert', 'rose', null].includes(parsed.activeType))
			return null
		if (!['vintage-asc', 'vintage-desc', 'added-newest'].includes(parsed.activeSort)) return null
		if (!['in-stock', 'single', 'empty'].includes(parsed.bottleFilter)) return null
		return parsed as SessionFilterState
	} catch {
		return null
	}
}
