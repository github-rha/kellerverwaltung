import { get, set } from 'idb-keyval'

export interface SyncSettings {
	repo: string // "owner/repo"
	pat: string
}

const REPO_KEY = 'kellerverwaltung-settings-repo'
const PAT_KEY = 'kellerverwaltung-settings-pat'

export function isConfigured(settings: SyncSettings): boolean {
	return settings.repo.trim().length > 0 && settings.pat.trim().length > 0
}

export async function loadSettings(): Promise<SyncSettings> {
	const [repo, pat] = await Promise.all([get<string>(REPO_KEY), get<string>(PAT_KEY)])
	return { repo: repo ?? '', pat: pat ?? '' }
}

export async function saveSettings(settings: SyncSettings): Promise<void> {
	await Promise.all([set(REPO_KEY, settings.repo), set(PAT_KEY, settings.pat)])
}
