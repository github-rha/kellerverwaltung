import { get as storeGet } from 'svelte/store'
import {
	deletePhoto,
	loadCellar,
	loadPhotoBuffer,
	markSynced,
	saveCellar,
	savePhotoBuffer,
	unsyncedStore
} from './persist'
import { reloadStore } from './store'
import { validate } from './validate'
import type { SyncSettings } from './settings'
import type { Cellar } from './types'

export class SyncError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'SyncError'
	}
}

// --- Base64 helpers ---

function encodeText(text: string): string {
	const bytes = new TextEncoder().encode(text)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function encodeBuffer(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return btoa(binary)
}

function decodeBase64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64.replace(/\n/g, ''))
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

// --- GitHub API helpers ---

function apiUrl(repo: string, path: string): string {
	return `https://api.github.com/repos/${repo}/contents/${path}`
}

function apiHeaders(pat: string): Record<string, string> {
	return {
		Authorization: `Bearer ${pat}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'Content-Type': 'application/json'
	}
}

interface FileMeta {
	sha: string
	content: string
}

async function getFileMeta(repo: string, pat: string, path: string): Promise<FileMeta | null> {
	const res = await fetch(apiUrl(repo, path), { headers: apiHeaders(pat) })
	if (res.status === 404) return null
	if (!res.ok) {
		const text = await res.text()
		throw new SyncError(`GitHub API error ${res.status}: ${text}`)
	}
	return res.json() as Promise<FileMeta>
}

async function putFile(
	repo: string,
	pat: string,
	path: string,
	content: string,
	sha: string | null,
	message: string
): Promise<void> {
	const body: Record<string, string> = { message, content }
	if (sha) body.sha = sha
	const res = await fetch(apiUrl(repo, path), {
		method: 'PUT',
		headers: apiHeaders(pat),
		body: JSON.stringify(body)
	})
	if (!res.ok) {
		const text = await res.text()
		throw new SyncError(`GitHub API error ${res.status}: ${text}`)
	}
}

// --- Public API ---

export async function push(settings: SyncSettings): Promise<void> {
	const cellar = await loadCellar()

	for (const wine of cellar.wines) {
		if (!wine.photoRef) continue
		const buffer = await loadPhotoBuffer(wine.id)
		if (!buffer) continue
		const path = `data/photos/${wine.id}.avif`
		const meta = await getFileMeta(settings.repo, settings.pat, path)
		await putFile(
			settings.repo,
			settings.pat,
			path,
			encodeBuffer(buffer),
			meta?.sha ?? null,
			'sync: update photo'
		)
	}

	const json = JSON.stringify(cellar, null, 2)
	const meta = await getFileMeta(settings.repo, settings.pat, 'data/cellar.json')
	await putFile(
		settings.repo,
		settings.pat,
		'data/cellar.json',
		encodeText(json),
		meta?.sha ?? null,
		'sync: update cellar.json'
	)

	await markSynced()
}

async function _pull(settings: SyncSettings): Promise<void> {
	const localCellar = await loadCellar()

	const meta = await getFileMeta(settings.repo, settings.pat, 'data/cellar.json')
	if (!meta) throw new SyncError('No data on GitHub — push first or check repository path')

	const bytes = decodeBase64ToBytes(meta.content)
	const json = new TextDecoder().decode(bytes)

	let parsed: unknown
	try {
		parsed = JSON.parse(json)
	} catch {
		throw new SyncError('Invalid JSON in remote cellar.json')
	}

	const result = validate(parsed as Cellar)
	if (!result.valid) throw new SyncError(`Invalid remote cellar: ${result.errors}`)
	const cellar = parsed as Cellar

	for (const wine of cellar.wines) {
		if (!wine.photoRef) continue
		const photoMeta = await getFileMeta(settings.repo, settings.pat, `data/photos/${wine.id}.avif`)
		if (!photoMeta) continue
		const photoBytes = decodeBase64ToBytes(photoMeta.content)
		await savePhotoBuffer(wine.id, photoBytes.buffer as ArrayBuffer)
	}

	const remotePhotoIds = new Set(cellar.wines.filter((w) => w.photoRef).map((w) => w.id))
	for (const wine of localCellar.wines) {
		if (wine.photoRef && !remotePhotoIds.has(wine.id)) {
			await deletePhoto(wine.id)
		}
	}

	await saveCellar(cellar)
	await reloadStore()
	await markSynced()
}

export async function pull(settings: SyncSettings): Promise<void> {
	if (storeGet(unsyncedStore)) throw new SyncError('unsynced')
	await _pull(settings)
}

export async function forcePull(settings: SyncSettings): Promise<void> {
	await _pull(settings)
}
