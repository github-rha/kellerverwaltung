import { describe, expect, it, beforeEach } from 'vitest'
import { saveSessionFilters, loadSessionFilters } from './session-filters'
import type { SessionFilterState } from './session-filters'

const defaults: SessionFilterState = {
	activeType: null,
	activeProducer: null,
	activeCountry: null,
	activeSort: 'vintage-desc',
	bottleFilter: 'in-stock'
}

beforeEach(() => {
	sessionStorage.clear()
})

describe('saveSessionFilters / loadSessionFilters', () => {
	it('round-trips filter state', () => {
		const state: SessionFilterState = {
			activeType: 'white',
			activeProducer: 'weingut-keller',
			activeCountry: 'Germany',
			activeSort: 'vintage-asc',
			bottleFilter: 'single'
		}
		saveSessionFilters(state)
		expect(loadSessionFilters()).toEqual(state)
	})

	it('returns null when nothing is stored', () => {
		expect(loadSessionFilters()).toBeNull()
	})

	it('returns null for corrupt JSON', () => {
		sessionStorage.setItem('kellerverwaltung-session-filters', '{bad')
		expect(loadSessionFilters()).toBeNull()
	})

	it('returns null for invalid type value', () => {
		saveSessionFilters({ ...defaults, activeType: 'beer' as never })
		expect(loadSessionFilters()).toBeNull()
	})

	it('returns null for invalid sort value', () => {
		saveSessionFilters({ ...defaults, activeSort: 'price' as never })
		expect(loadSessionFilters()).toBeNull()
	})

	it('returns null for invalid bottleFilter value', () => {
		saveSessionFilters({ ...defaults, bottleFilter: 'many' as never })
		expect(loadSessionFilters()).toBeNull()
	})

	it('accepts null activeType', () => {
		saveSessionFilters(defaults)
		expect(loadSessionFilters()?.activeType).toBeNull()
	})

	it('accepts rose as activeType', () => {
		saveSessionFilters({ ...defaults, activeType: 'rose' })
		expect(loadSessionFilters()?.activeType).toBe('rose')
	})
})
