import { beforeEach, describe, expect, it } from 'vitest'
import { clear } from 'idb-keyval'
import { isConfigured, loadSettings, saveSettings } from './settings'

beforeEach(async () => {
	await clear()
})

describe('settings', () => {
	it('returns empty strings when nothing stored', async () => {
		const settings = await loadSettings()
		expect(settings).toEqual({ repo: '', pat: '' })
	})

	it('roundtrips repo and PAT', async () => {
		await saveSettings({ repo: 'user/cellar', pat: 'github_pat_abc123' })
		const settings = await loadSettings()
		expect(settings).toEqual({ repo: 'user/cellar', pat: 'github_pat_abc123' })
	})

	it('isConfigured returns false when repo is empty', () => {
		expect(isConfigured({ repo: '', pat: 'abc' })).toBe(false)
	})

	it('isConfigured returns false when PAT is empty', () => {
		expect(isConfigured({ repo: 'user/repo', pat: '' })).toBe(false)
	})

	it('isConfigured returns true when both are set', () => {
		expect(isConfigured({ repo: 'user/repo', pat: 'abc' })).toBe(true)
	})
})
