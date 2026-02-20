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

export async function runOcr(file: File): Promise<OcrResult> {
	const worker = await getWorker()
	const { data } = await worker.recognize(file, undefined, { blocks: true })
	const words: OcrWord[] = []
	for (const block of data.blocks ?? []) {
		for (const para of block.paragraphs) {
			for (const line of para.lines) {
				for (const word of line.words) {
					words.push({
						text: word.text,
						confidence: word.confidence,
						bbox: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 }
					})
				}
			}
		}
	}
	return { text: data.text, words }
}
