export type WineType = 'red' | 'white' | 'sparkling' | 'dessert'

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
}

export interface Cellar {
	schemaVersion: 1
	wines: WineEntry[]
}
