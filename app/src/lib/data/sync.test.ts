import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get as storeGet } from 'svelte/store'
import { clear } from 'idb-keyval'
import { createWine, initStore, updateWine } from './store'
import { loadCellar, loadPhoto, savePhoto, unsyncedStore } from './persist'
import { SyncError, forcePull, pull, push } from './sync'
import type { SyncSettings } from './settings'
import type { Cellar } from './types'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const settings: SyncSettings = { repo: 'user/cellar', pat: 'test-pat' }

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	})
}

function notFound(): Response {
	return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
}

function textToBase64(text: string): string {
	const bytes = new TextEncoder().encode(text)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function bufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

const emptyCellar: Cellar = { schemaVersion: 1, wines: [] }

function fakePhotoBlob(): Blob {
	const buffer = new Uint8Array([1, 2, 3, 4]).buffer
	return { arrayBuffer: () => Promise.resolve(buffer) } as unknown as Blob
}

beforeEach(async () => {
	await clear()
	await initStore()
	mockFetch.mockReset()
})

describe('push', () => {
	it('PUTs cellar.json with correct base64 content when file does not exist', async () => {
		mockFetch
			.mockResolvedValueOnce(notFound()) // GET cellar.json → 404
			.mockResolvedValueOnce(jsonResponse({}, 201)) // PUT cellar.json

		await push(settings)

		const putCall = mockFetch.mock.calls[1]
		expect(putCall[0]).toBe('https://api.github.com/repos/user/cellar/contents/data/cellar.json')
		expect(putCall[1].method).toBe('PUT')
		const body = JSON.parse(putCall[1].body)
		expect(body.message).toBe('sync: update cellar.json')
		expect(body.sha).toBeUndefined()
		// Verify the content decodes back to valid cellar JSON
		const decoded = new TextDecoder().decode(
			Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0))
		)
		expect(JSON.parse(decoded)).toMatchObject({ schemaVersion: 1, wines: [] })
	})

	it('includes SHA in PUT when cellar.json already exists on GitHub', async () => {
		mockFetch
			.mockResolvedValueOnce(
				jsonResponse({ sha: 'existing-sha', content: '' }) // GET → file exists
			)
			.mockResolvedValueOnce(jsonResponse({}, 200)) // PUT

		await push(settings)

		const body = JSON.parse(mockFetch.mock.calls[1][1].body)
		expect(body.sha).toBe('existing-sha')
	})

	it('PUTs each photo at the correct path', async () => {
		const wine = await createWine({
			type: 'red',
			producer: 'Keller',
			name: 'Riesling',
			vintage: 2020,
			bottles: 3,
			notes: '',
			country: ''
		})
		await savePhoto(wine.id, fakePhotoBlob())
		await updateWine(wine.id, { photoRef: `photos/${wine.id}.avif` })

		mockFetch
			.mockResolvedValueOnce(notFound()) // GET photo → 404
			.mockResolvedValueOnce(jsonResponse({}, 201)) // PUT photo
			.mockResolvedValueOnce(notFound()) // GET cellar.json → 404
			.mockResolvedValueOnce(jsonResponse({}, 201)) // PUT cellar.json

		await push(settings)

		const photoGetCall = mockFetch.mock.calls[0]
		expect(photoGetCall[0]).toBe(
			`https://api.github.com/repos/user/cellar/contents/data/photos/${wine.id}.avif`
		)

		const photoPutCall = mockFetch.mock.calls[1]
		expect(photoPutCall[1].method).toBe('PUT')
		const photoBody = JSON.parse(photoPutCall[1].body)
		expect(photoBody.sha).toBeUndefined()
		// Verify photo content is base64-encoded binary
		const decoded = Uint8Array.from(atob(photoBody.content), (c) => c.charCodeAt(0))
		expect(Array.from(decoded)).toEqual([1, 2, 3, 4])
	})

	it('sets unsyncedStore to false after success', async () => {
		// Create a wine to make the store unsynced
		await createWine({
			type: 'white',
			producer: 'P',
			name: 'N',
			vintage: 2021,
			bottles: 1,
			notes: '',
			country: ''
		})
		expect(storeGet(unsyncedStore)).toBe(true)

		mockFetch
			.mockResolvedValueOnce(notFound()) // GET cellar.json
			.mockResolvedValueOnce(jsonResponse({}, 201)) // PUT cellar.json

		await push(settings)

		expect(storeGet(unsyncedStore)).toBe(false)
	})

	it('throws SyncError when GitHub returns 401', async () => {
		mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))

		await expect(push(settings)).rejects.toBeInstanceOf(SyncError)
	})
})

describe('pull', () => {
	it('throws SyncError("unsynced") when local changes exist', async () => {
		await createWine({
			type: 'red',
			producer: 'P',
			name: 'N',
			vintage: 2020,
			bottles: 1,
			notes: '',
			country: ''
		})
		expect(storeGet(unsyncedStore)).toBe(true)

		await expect(pull(settings)).rejects.toThrow('unsynced')
	})

	it('downloads and applies cellar.json from GitHub', async () => {
		const remoteCellar: Cellar = {
			schemaVersion: 1,
			wines: [
				{
					id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
					type: 'white',
					producer: 'Remote Producer',
					producerKey: 'remote-producer',
					name: 'Remote Wine',
					vintage: 2019,
					bottles: 5,
					notes: '',
					country: '',
					photoRef: '',
					addedAt: '2025-01-01T00:00:00Z'
				}
			]
		}

		mockFetch.mockResolvedValueOnce(
			jsonResponse({
				sha: 'abc',
				content: textToBase64(JSON.stringify(remoteCellar))
			})
		)

		await pull(settings)

		const cellar = await loadCellar()
		expect(cellar.wines).toHaveLength(1)
		expect(cellar.wines[0].producer).toBe('Remote Producer')
	})

	it('downloads photos referenced in pulled cellar', async () => {
		const photoBytes = new Uint8Array([10, 20, 30])
		const wineId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
		const remoteCellar: Cellar = {
			schemaVersion: 1,
			wines: [
				{
					id: wineId,
					type: 'red',
					producer: 'P',
					producerKey: 'p',
					name: 'N',
					vintage: 2020,
					bottles: 1,
					notes: '',
					country: '',
					photoRef: `photos/${wineId}.avif`,
					addedAt: '2025-01-01T00:00:00Z'
				}
			]
		}

		mockFetch
			.mockResolvedValueOnce(
				jsonResponse({ sha: 'sha1', content: textToBase64(JSON.stringify(remoteCellar)) })
			)
			.mockResolvedValueOnce(
				jsonResponse({ sha: 'sha2', content: bufferToBase64(photoBytes.buffer) })
			)

		await pull(settings)

		const photo = await loadPhoto(wineId)
		expect(photo).toBeDefined()
		expect(photo).toBeInstanceOf(Blob)
	})

	it('deletes local photos not present in pulled cellar', async () => {
		const localWine = await createWine({
			type: 'red',
			producer: 'P',
			name: 'N',
			vintage: 2020,
			bottles: 1,
			notes: '',
			country: ''
		})
		await savePhoto(localWine.id, fakePhotoBlob())
		await updateWine(localWine.id, { photoRef: `photos/${localWine.id}.avif` })

		// Remote cellar has no wines (and thus no photos)
		mockFetch.mockResolvedValueOnce(
			jsonResponse({ sha: 'sha1', content: textToBase64(JSON.stringify(emptyCellar)) })
		)

		// Need to manually markSynced so pull isn't blocked
		const { markSynced } = await import('./persist')
		await markSynced()

		await pull(settings)

		const photo = await loadPhoto(localWine.id)
		expect(photo).toBeUndefined()
	})

	it('throws SyncError when cellar.json is not on GitHub', async () => {
		mockFetch.mockResolvedValueOnce(notFound())

		await expect(pull(settings)).rejects.toBeInstanceOf(SyncError)
	})

	it('throws SyncError when pulled cellar fails schema validation', async () => {
		const badCellar = { schemaVersion: 1, wines: [{ invalid: true }] }
		mockFetch.mockResolvedValueOnce(
			jsonResponse({ sha: 'sha1', content: textToBase64(JSON.stringify(badCellar)) })
		)

		await expect(pull(settings)).rejects.toBeInstanceOf(SyncError)
	})

	it('sets unsyncedStore to false after successful pull', async () => {
		mockFetch.mockResolvedValueOnce(
			jsonResponse({ sha: 'sha1', content: textToBase64(JSON.stringify(emptyCellar)) })
		)

		await pull(settings)

		expect(storeGet(unsyncedStore)).toBe(false)
	})
})

describe('forcePull', () => {
	it('succeeds even when unsyncedStore is true', async () => {
		await createWine({
			type: 'red',
			producer: 'P',
			name: 'N',
			vintage: 2020,
			bottles: 1,
			notes: '',
			country: ''
		})
		expect(storeGet(unsyncedStore)).toBe(true)

		mockFetch.mockResolvedValueOnce(
			jsonResponse({ sha: 'sha1', content: textToBase64(JSON.stringify(emptyCellar)) })
		)

		await expect(forcePull(settings)).resolves.toBeUndefined()

		const cellar = await loadCellar()
		expect(cellar.wines).toHaveLength(0)
	})
})
