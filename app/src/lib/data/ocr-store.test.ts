import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import { appendOcrEntry, loadOcrData } from './ocr-store'
import type { OcrEntry } from './ocr-store'

beforeEach(async () => {
	await clear()
})

function makeEntry(wineId: string): OcrEntry {
	return {
		wineId,
		capturedAt: '2026-02-20T18:00:00.000Z',
		ocr: {
			text: 'Weingut Keller\nRiesling Trocken\n2021',
			words: [{ text: 'Weingut', confidence: 96.1, bbox: { x0: 10, y0: 5, x1: 80, y1: 22 } }]
		},
		corrected: { producer: 'Weingut Keller', name: 'Riesling Trocken', vintage: '2021' }
	}
}

describe('loadOcrData', () => {
	it('returns empty training data when nothing is stored', async () => {
		const data = await loadOcrData()
		expect(data).toEqual({ version: 1, entries: [] })
	})
})

describe('appendOcrEntry', () => {
	it('persists an entry and it survives a reload', async () => {
		const entry = makeEntry('wine-1')
		await appendOcrEntry(entry)

		const data = await loadOcrData()
		expect(data.entries).toHaveLength(1)
		expect(data.entries[0]).toEqual(entry)
	})

	it('accumulates multiple entries without overwriting previous ones', async () => {
		await appendOcrEntry(makeEntry('wine-1'))
		await appendOcrEntry(makeEntry('wine-2'))
		await appendOcrEntry(makeEntry('wine-3'))

		const data = await loadOcrData()
		expect(data.entries).toHaveLength(3)
		expect(data.entries.map((e) => e.wineId)).toEqual(['wine-1', 'wine-2', 'wine-3'])
	})
})
