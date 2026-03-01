import { describe, expect, it } from 'vitest'
import { exportText } from './export'
import type { WineEntry } from './types'

function wine(overrides: Partial<WineEntry> = {}): WineEntry {
	return {
		id: 'id',
		type: 'red',
		producer: 'Producer',
		producerKey: 'producer',
		name: 'Wine',
		vintage: 2020,
		bottles: 1,
		notes: '',
		country: '',
		photoRef: '',
		addedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	}
}

describe('exportText', () => {
	it('returns a no-stock message when all wines have 0 bottles', () => {
		const result = exportText([wine({ bottles: 0 })], '2026-03-01')
		expect(result).toContain('No bottles in stock.')
	})

	it('includes the date in the header', () => {
		const result = exportText([wine()], '2026-03-01')
		expect(result).toContain('Keller — 2026-03-01')
	})

	it('excludes wines with 0 bottles', () => {
		const result = exportText(
			[wine({ name: 'InStock', bottles: 2 }), wine({ name: 'Empty', bottles: 0 })],
			'2026-03-01'
		)
		expect(result).toContain('InStock')
		expect(result).not.toContain('Empty')
	})

	it('shows NV for non-vintage wines', () => {
		const result = exportText([wine({ vintage: 'NV' })], '2026-03-01')
		expect(result).toContain('NV')
	})

	it('shows the correct total', () => {
		const result = exportText(
			[wine({ bottles: 3 }), wine({ name: 'Other', bottles: 5 })],
			'2026-03-01'
		)
		expect(result).toContain('Total: 8 bottles')
	})

	it('uses singular for exactly 1 bottle total', () => {
		const result = exportText([wine({ bottles: 1 })], '2026-03-01')
		expect(result).toContain('Total: 1 bottle')
		expect(result).not.toContain('Total: 1 bottles')
	})

	it('sorts by producer then name', () => {
		const result = exportText(
			[
				wine({ producer: 'Zoo', name: 'B' }),
				wine({ producer: 'Alpha', name: 'B' }),
				wine({ producer: 'Alpha', name: 'A' })
			],
			'2026-03-01'
		)
		const lines = result.split('\n').filter((l) => l.includes('Alpha') || l.includes('Zoo'))
		expect(lines[0]).toContain('Alpha')
		expect(lines[0]).toContain('A')
		expect(lines[1]).toContain('Alpha')
		expect(lines[1]).toContain('B')
		expect(lines[2]).toContain('Zoo')
	})

	it('aligns columns so every data row has the same length', () => {
		const result = exportText(
			[
				wine({ producer: 'Short', name: 'Short wine', vintage: 2020, bottles: 1 }),
				wine({
					producer: 'A very long producer name',
					name: 'Also a long wine name',
					vintage: 2019,
					bottles: 12
				})
			],
			'2026-03-01'
		)
		const lines = result.split('\n')
		// find the separator line and the two data rows
		const sepIdx = lines.findIndex((l) => /^─+$/.test(l))
		const dataLines = lines
			.slice(sepIdx + 1)
			.filter((l) => l.trim() !== '' && !l.startsWith('Total'))
		const lengths = dataLines.map((l) => l.length)
		expect(lengths[0]).toBe(lengths[1])
	})
})
