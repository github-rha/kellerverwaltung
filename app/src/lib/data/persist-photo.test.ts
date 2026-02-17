import { beforeEach, describe, expect, it } from 'vitest'
import { clear, get } from 'idb-keyval'
import { deletePhoto, loadPhoto, savePhoto } from './persist'
import { createWine, deleteWine, initStore, type CreateWineInput, updateWine } from './store'

beforeEach(async () => {
	await clear()
	await initStore()
})

const sampleInput: CreateWineInput = {
	type: 'red',
	producer: 'Weingut Keller',
	name: 'Riesling Trocken',
	vintage: 2021,
	bottles: 6,
	notes: ''
}

function fakePhotoBlob(): Blob {
	const buffer = new Uint8Array([1, 2, 3, 4]).buffer
	// jsdom Blob lacks .arrayBuffer(), so wrap in a real-enough object
	return { arrayBuffer: () => Promise.resolve(buffer) } as unknown as Blob
}

describe('photo persistence', () => {
	it('roundtrips photo data through IndexedDB', async () => {
		await savePhoto('wine-123', fakePhotoBlob())
		const loaded = await loadPhoto('wine-123')

		expect(loaded).toBeDefined()
		expect(loaded).toBeInstanceOf(Blob)
	})

	it('returns undefined when no photo exists', async () => {
		const loaded = await loadPhoto('nonexistent')
		expect(loaded).toBeUndefined()
	})

	it('deletes photo from IndexedDB', async () => {
		await savePhoto('wine-123', fakePhotoBlob())
		await deletePhoto('wine-123')
		const loaded = await loadPhoto('wine-123')
		expect(loaded).toBeUndefined()
	})

	it('deleteWine also deletes associated photo blob', async () => {
		const wine = await createWine(sampleInput)
		await savePhoto(wine.id, fakePhotoBlob())
		await updateWine(wine.id, { photoRef: `photos/${wine.id}.avif` })

		await deleteWine(wine.id)

		const loaded = await get(`photo:${wine.id}`)
		expect(loaded).toBeUndefined()
	})
})
