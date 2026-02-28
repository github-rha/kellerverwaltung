export interface OcrResult {
	text: string
	words: never[]
	country?: string
}

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'
const SYSTEM = `You are a wine label reader. Extract:
- producer: winery or producer name
- name: wine name or cuvée
- vintage: 4-digit year, or empty string if not visible
- country: country of origin in English, or empty string if not visible
Reply with ONLY valid JSON: {"producer":"...","name":"...","vintage":"...","country":"..."}`

const MAX_DIMENSION = 1568

async function normaliseBlob(blob: Blob): Promise<{ data: string; mediaType: string }> {
	const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
	const bitmap = await createImageBitmap(blob)
	const { width, height } = bitmap
	const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
	const w = Math.round(width * scale)
	const h = Math.round(height * scale)
	const canvas = new OffscreenCanvas(w, h)
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
	bitmap.close()
	const mediaType = supported.includes(blob.type) ? blob.type : 'image/jpeg'
	const out = await canvas.convertToBlob({
		type: mediaType === 'image/gif' ? 'image/jpeg' : mediaType,
		quality: 0.85
	})
	const buf = await out.arrayBuffer()
	const bytes = new Uint8Array(buf)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
	return { data: btoa(binary), mediaType: out.type }
}

export async function runClaudeOcr(blob: Blob, apiKey: string): Promise<OcrResult> {
	const { data, mediaType } = await normaliseBlob(blob)
	const res = await fetch(API_URL, {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 256,
			system: SYSTEM,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'image', source: { type: 'base64', media_type: mediaType, data } },
						{ type: 'text', text: 'Extract the wine label fields.' }
					]
				}
			]
		})
	})
	if (!res.ok) {
		const body = await res.text().catch(() => '')
		throw new Error(`Claude API error ${res.status}: ${body}`)
	}
	const json = await res.json()
	const rawText: string = json.content?.[0]?.text ?? ''
	const match = rawText.match(/\{[\s\S]*\}/)
	const fields = match ? JSON.parse(match[0]) : {}
	// Format as newline-separated lines so extractPreFill in +page.svelte works unchanged
	const text = [fields.producer ?? '', fields.name ?? '', fields.vintage ?? '']
		.filter(Boolean)
		.join('\n')
	return { text, words: [], country: fields.country ?? '' }
}
