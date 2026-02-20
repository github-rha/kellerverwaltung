import { describe, expect, it } from 'vitest'
import { parseCSV } from './csv'

const HEADER = 'producer,name,type,vintage,bottles,notes'

function csv(...rows: string[]) {
	return [HEADER, ...rows].join('\n')
}

describe('parseCSV', () => {
	it('parses a valid row into an ImportEntry', () => {
		const result = parseCSV(csv('Weingut Keller,Riesling,red,2021,6,Nice wine'))
		expect(result).toHaveLength(1)
		expect(result[0].valid).toBe(true)
		expect(result[0].entry).toMatchObject({
			producer: 'Weingut Keller',
			name: 'Riesling',
			type: 'red',
			vintage: 2021,
			bottles: 6,
			notes: 'Nice wine',
			producerKey: 'weingut-keller'
		})
	})

	it('returns empty array when there are no data rows', () => {
		expect(parseCSV(HEADER)).toHaveLength(0)
	})

	it('returns empty array for empty input', () => {
		expect(parseCSV('')).toHaveLength(0)
	})

	it('skips empty rows', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,6,', '', '   '))
		expect(result).toHaveLength(1)
	})

	it('ignores extra columns', () => {
		const result = parseCSV(
			'producer,name,type,vintage,bottles,notes,extra\nKeller,Riesling,red,2021,6,note,ignored'
		)
		expect(result).toHaveLength(1)
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.producer).toBe('Keller')
	})

	it('accepts all four wine types case-insensitively', () => {
		const cases: [string, string][] = [
			['Red', 'red'],
			['WHITE', 'white'],
			['Sparkling', 'sparkling'],
			['DESSERT', 'dessert']
		]
		for (const [input, expected] of cases) {
			const r = parseCSV(csv(`Keller,Wine,${input},2021,6,`))
			expect(r[0].valid).toBe(true)
			expect(r[0].entry?.type).toBe(expected)
		}
	})

	it('normalizes verbose type labels from spreadsheet exports', () => {
		const cases: [string, string][] = [
			['red wine', 'red'],
			['Red Wine', 'red'],
			['white wine', 'white'],
			['White Wine', 'white'],
			['Sparkling Wine', 'sparkling'],
			['Dessert Wine', 'dessert'],
			['Fortified Wine', 'dessert'],
			['fortified', 'dessert']
		]
		for (const [input, expected] of cases) {
			const r = parseCSV(csv(`Keller,Wine,${input},2021,6,`))
			expect(r[0].valid).toBe(true)
			expect(r[0].entry?.type).toBe(expected)
		}
	})

	it('accepts NV vintage case-insensitively', () => {
		for (const v of ['NV', 'nv', 'Nv']) {
			const r = parseCSV(csv(`Keller,Riesling,red,${v},6,`))
			expect(r[0].valid).toBe(true)
			expect(r[0].entry?.vintage).toBe('NV')
		}
	})

	it('treats empty vintage field as NV', () => {
		const result = parseCSV(csv('Keller,Riesling,red,,6,'))
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.vintage).toBe('NV')
	})

	it('accepts bottles of 0', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,0,'))
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.bottles).toBe(0)
	})

	it('trims whitespace from all fields', () => {
		const result = parseCSV(csv('  Keller  , Riesling , red , 2021 , 6 , note '))
		expect(result[0].valid).toBe(true)
		const entry = result[0].entry!
		expect(entry.producer).toBe('Keller')
		expect(entry.name).toBe('Riesling')
		expect(entry.vintage).toBe(2021)
		expect(entry.bottles).toBe(6)
		expect(entry.notes).toBe('note')
	})

	it('uses empty string for notes when notes column is absent', () => {
		const result = parseCSV('producer,name,type,vintage,bottles\nKeller,Riesling,red,2021,6')
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.notes).toBe('')
	})

	it('handles quoted fields with embedded commas', () => {
		const result = parseCSV(csv('"Weingut Müller, Sohn",Riesling,red,2021,6,'))
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.producer).toBe('Weingut Müller, Sohn')
	})

	it('handles CRLF line endings', () => {
		const result = parseCSV(
			'producer,name,type,vintage,bottles,notes\r\nKeller,Riesling,red,2021,6,\r\n'
		)
		expect(result).toHaveLength(1)
		expect(result[0].valid).toBe(true)
	})

	it('assigns sequential row numbers to non-empty data rows', () => {
		const result = parseCSV(csv('Keller,Valid,red,2021,6,', '', 'Keller,,red,2021,6,'))
		expect(result).toHaveLength(2)
		expect(result[0].rowNumber).toBe(1)
		expect(result[1].rowNumber).toBe(2)
	})

	it('errors all rows when a required column is missing', () => {
		const result = parseCSV('name,type,vintage,bottles\nRiesling,red,2021,6')
		expect(result).toHaveLength(1)
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Missing column: producer')
	})

	it('returns empty array when required column is missing but no data rows exist', () => {
		expect(parseCSV('name,type,vintage,bottles')).toHaveLength(0)
	})

	it('errors the row when producer is empty', () => {
		const result = parseCSV(csv(',Riesling,red,2021,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Producer')
	})

	it('errors the row when name is empty', () => {
		const result = parseCSV(csv('Keller,,red,2021,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Name')
	})

	it('errors the row when type is invalid', () => {
		const result = parseCSV(csv('Keller,Riesling,rosé,2021,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid type')
	})

	it('errors the row when vintage is non-numeric', () => {
		const result = parseCSV(csv('Keller,Riesling,red,abc,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid vintage')
	})

	it('errors the row when vintage is below 1800', () => {
		const result = parseCSV(csv('Keller,Riesling,red,1799,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid vintage')
	})

	it('errors the row when vintage is above 2100', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2101,6,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid vintage')
	})

	it('errors the row when bottles is negative', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,-1,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid bottles')
	})

	it('errors the row when bottles is non-numeric', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,six,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid bottles')
	})

	it('errors the row when bottles is empty', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,,'))
		expect(result[0].valid).toBe(false)
		expect(result[0].error).toContain('Invalid bottles')
	})

	it('uses empty string for country when country column is absent', () => {
		const result = parseCSV(csv('Keller,Riesling,red,2021,6,'))
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.country).toBe('')
	})

	it('stores country value when country column is present', () => {
		const result = parseCSV(
			'producer,name,type,vintage,bottles,notes,country\nKeller,Riesling,red,2021,6,,Germany'
		)
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.country).toBe('Germany')
	})

	it('uses empty string when country column is present but empty', () => {
		const result = parseCSV(
			'producer,name,type,vintage,bottles,notes,country\nKeller,Riesling,red,2021,6,,'
		)
		expect(result[0].valid).toBe(true)
		expect(result[0].entry?.country).toBe('')
	})

	it('parses multiple rows independently', () => {
		const result = parseCSV(
			csv('Keller,Riesling,red,2021,6,', 'Schloss,Pinot,white,2019,3,Good', 'Bad,,red,2021,6,')
		)
		expect(result).toHaveLength(3)
		expect(result[0].valid).toBe(true)
		expect(result[1].valid).toBe(true)
		expect(result[2].valid).toBe(false)
	})
})
