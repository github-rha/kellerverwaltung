import { get, set } from 'idb-keyval'
import type { OcrResult } from '../ocr/tesseract'

const DB_KEY = 'kellerverwaltung-ocr-training'

export interface OcrEntry {
	wineId: string
	capturedAt: string
	ocr: OcrResult
	corrected: { producer: string; name: string; vintage: string }
}

export interface OcrTrainingData {
	version: 1
	entries: OcrEntry[]
}

export async function loadOcrData(): Promise<OcrTrainingData> {
	const data = await get<OcrTrainingData>(DB_KEY)
	return data ?? { version: 1, entries: [] }
}

export async function appendOcrEntry(entry: OcrEntry): Promise<void> {
	const data = await loadOcrData()
	data.entries.push(entry)
	await set(DB_KEY, data)
}

export async function saveOcrData(data: OcrTrainingData): Promise<void> {
	await set(DB_KEY, data)
}

export async function removeOcrEntry(wineId: string): Promise<void> {
	const data = await loadOcrData()
	const filtered = data.entries.filter((e) => e.wineId !== wineId)
	if (filtered.length !== data.entries.length) {
		await set(DB_KEY, { ...data, entries: filtered })
	}
}
