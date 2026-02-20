import Tesseract from 'tesseract.js'

export interface OcrWord {
	text: string
	confidence: number
	bbox: { x0: number; y0: number; x1: number; y1: number }
}

export interface OcrResult {
	text: string
	words: OcrWord[]
}

let workerPromise: Promise<Tesseract.Worker> | null = null

function getWorker(): Promise<Tesseract.Worker> {
	if (!workerPromise) {
		workerPromise = Tesseract.createWorker('eng', undefined, { logger: () => {} })
	}
	return workerPromise
}

function parseTsv(tsv: string): OcrWord[] {
	const words: OcrWord[] = []
	for (const line of tsv.split('\n')) {
		const cols = line.split('\t')
		if (cols.length < 12) continue
		if (parseInt(cols[0]) !== 5) continue // level 5 = word
		const conf = parseFloat(cols[10])
		const text = cols[11]?.trim()
		if (!text || conf < 60) continue // skip low-confidence and spaces (conf === -1)
		const left = parseInt(cols[6])
		const top = parseInt(cols[7])
		const width = parseInt(cols[8])
		const height = parseInt(cols[9])
		words.push({
			text,
			confidence: conf,
			bbox: { x0: left, y0: top, x1: left + width, y1: top + height }
		})
	}
	return words
}

export async function runOcr(file: File): Promise<OcrResult> {
	const worker = await getWorker()
	const { data } = await worker.recognize(file, undefined, { text: true, tsv: true })
	return {
		text: data.text ?? '',
		words: parseTsv(data.tsv ?? '')
	}
}
