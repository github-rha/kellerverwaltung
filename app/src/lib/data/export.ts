import type { WineEntry } from './types'

function pad(s: string, width: number): string {
	return s + ' '.repeat(Math.max(0, width - s.length))
}

function rpad(s: string, width: number): string {
	return ' '.repeat(Math.max(0, width - s.length)) + s
}

export function exportText(wines: WineEntry[], date: string): string {
	const inStock = wines
		.filter((w) => w.bottles > 0)
		.sort((a, b) => {
			const p = a.producer.localeCompare(b.producer)
			if (p !== 0) return p
			const n = a.name.localeCompare(b.name)
			if (n !== 0) return n
			if (a.vintage === 'NV') return 1
			if (b.vintage === 'NV') return -1
			return (a.vintage as number) - (b.vintage as number)
		})

	const total = inStock.reduce((sum, w) => sum + w.bottles, 0)

	if (inStock.length === 0) {
		return `Keller \u2014 ${date}\n\nNo bottles in stock.\n`
	}

	const vintageStr = (w: WineEntry) => String(w.vintage)

	const colProducer = Math.max(16, ...inStock.map((w) => w.producer.length)) + 2
	const colName = Math.max(16, ...inStock.map((w) => w.name.length)) + 2
	const colVintage = Math.max(7, ...inStock.map((w) => vintageStr(w).length)) + 1
	const colBottles = Math.max(7, ...inStock.map((w) => String(w.bottles).length)) + 1

	const rowWidth = colProducer + colName + colVintage + colBottles

	const header =
		pad('Producer', colProducer) +
		pad('Wine', colName) +
		rpad('Vintage', colVintage) +
		rpad('Bottles', colBottles)

	const separator = '\u2500'.repeat(rowWidth)

	const rows = inStock.map(
		(w) =>
			pad(w.producer, colProducer) +
			pad(w.name, colName) +
			rpad(vintageStr(w), colVintage) +
			rpad(String(w.bottles), colBottles)
	)

	return [
		`Keller \u2014 ${date}`,
		'',
		header,
		separator,
		...rows,
		'',
		`Total: ${total} bottle${total !== 1 ? 's' : ''}`,
		''
	].join('\n')
}
