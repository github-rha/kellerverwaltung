import { producerKey } from './producer-key'
import type { WineType } from './types'

export interface ImportEntry {
	type: WineType
	producer: string
	name: string
	vintage: number | 'NV'
	bottles: number
	notes: string
	country: string
	producerKey: string
}

export interface ParsedRow {
	rowNumber: number
	valid: boolean
	error?: string
	entry?: ImportEntry
}

const REQUIRED_COLUMNS = ['producer', 'name', 'type', 'vintage', 'bottles'] as const

const TYPE_ALIASES: Record<string, WineType> = {
	red: 'red',
	'red wine': 'red',
	white: 'white',
	'white wine': 'white',
	sparkling: 'sparkling',
	'sparkling wine': 'sparkling',
	dessert: 'dessert',
	'dessert wine': 'dessert',
	fortified: 'dessert',
	'fortified wine': 'dessert'
}

function parseRows(text: string): string[][] {
	const rows: string[][] = []
	let fields: string[] = []
	let current = ''
	let inQuotes = false
	let i = 0

	while (i < text.length) {
		const ch = text[i]

		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					current += '"'
					i += 2
				} else {
					inQuotes = false
					i++
				}
			} else {
				current += ch
				i++
			}
		} else {
			if (ch === '"') {
				inQuotes = true
				i++
			} else if (ch === ',') {
				fields.push(current)
				current = ''
				i++
			} else if (ch === '\r' && text[i + 1] === '\n') {
				fields.push(current)
				current = ''
				rows.push(fields)
				fields = []
				i += 2
			} else if (ch === '\n') {
				fields.push(current)
				current = ''
				rows.push(fields)
				fields = []
				i++
			} else {
				current += ch
				i++
			}
		}
	}

	if (current !== '' || fields.length > 0) {
		fields.push(current)
		rows.push(fields)
	}

	return rows
}

export function parseCSV(text: string): ParsedRow[] {
	const allRows = parseRows(text)
	if (allRows.length === 0) return []

	const headers = allRows[0].map((h) => h.trim().toLowerCase())
	const dataRows = allRows.slice(1).filter((r) => r.some((f) => f.trim() !== ''))

	const missingCol = REQUIRED_COLUMNS.find((col) => !headers.includes(col))
	if (missingCol) {
		return dataRows.map((_, i) => ({
			rowNumber: i + 1,
			valid: false,
			error: `Missing column: ${missingCol}`
		}))
	}

	const idx = (col: string) => headers.indexOf(col)
	const notesIdx = idx('notes')
	const countryIdx = idx('country')

	const results: ParsedRow[] = []

	for (let i = 0; i < dataRows.length; i++) {
		const fields = dataRows[i]
		const rowNumber = i + 1
		const get = (col: string) => (fields[idx(col)] ?? '').trim()

		const producer = get('producer')
		if (!producer) {
			results.push({ rowNumber, valid: false, error: 'Producer is required' })
			continue
		}

		const name = get('name')
		if (!name) {
			results.push({ rowNumber, valid: false, error: 'Name is required' })
			continue
		}

		const typeRaw = get('type').toLowerCase()
		const type = TYPE_ALIASES[typeRaw]
		if (!type) {
			results.push({ rowNumber, valid: false, error: `Invalid type: "${get('type')}"` })
			continue
		}

		const vintageRaw = get('vintage')
		let vintage: number | 'NV'
		if (vintageRaw === '' || vintageRaw.toUpperCase() === 'NV') {
			vintage = 'NV'
		} else if (/^\d+$/.test(vintageRaw)) {
			const n = parseInt(vintageRaw, 10)
			if (n < 1800 || n > 2100) {
				results.push({ rowNumber, valid: false, error: `Invalid vintage: "${vintageRaw}"` })
				continue
			}
			vintage = n
		} else {
			results.push({ rowNumber, valid: false, error: `Invalid vintage: "${vintageRaw}"` })
			continue
		}

		const bottlesRaw = get('bottles')
		if (!/^\d+$/.test(bottlesRaw)) {
			results.push({ rowNumber, valid: false, error: `Invalid bottles: "${bottlesRaw}"` })
			continue
		}
		const bottles = parseInt(bottlesRaw, 10)

		const notes = notesIdx >= 0 ? (fields[notesIdx] ?? '').trim() : ''
		const country = countryIdx >= 0 ? (fields[countryIdx] ?? '').trim() : ''

		results.push({
			rowNumber,
			valid: true,
			entry: {
				type,
				producer,
				name,
				vintage,
				bottles,
				notes,
				country,
				producerKey: producerKey(producer)
			}
		})
	}

	return results
}
