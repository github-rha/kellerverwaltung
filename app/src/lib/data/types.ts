export type WineType = 'red' | 'white' | 'sparkling' | 'dessert' | 'rose'

export interface HistoryEntry {
	timestamp: string // ISO 8601
	delta: number // actual change after clamping (+1 or -1)
	bottles: number // count after this change
}

export interface WineEntry {
	id: string
	type: WineType
	producer: string
	producerKey: string
	name: string
	vintage: number | 'NV'
	bottles: number
	notes: string
	country: string
	photoRef: string
	addedAt: string
	history?: HistoryEntry[]
}

export interface Cellar {
	schemaVersion: 1
	wines: WineEntry[]
}
