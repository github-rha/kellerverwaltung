import type { WineEntry } from '$lib/data/types'

export interface SommelierRecommendation {
	producer: string
	name: string
	vintage: string
	reason: string
	querschlaeger: boolean
	drinkNow: boolean
}

export interface SommelierResult {
	recommendations: SommelierRecommendation[]
}

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-6'

const SYSTEM = `You are an expert sommelier advising a wine enthusiast with a western/central European palate.

The user will describe a dish or food they want to pair with wine. You will also receive their full wine cellar inventory (only wines currently in stock).

Your task:
1. First, determine which wine type(s) classically pair with the described dish using traditional sommelier principles (e.g. white or rosé with poultry and fish, red with red meat and hearty stews, sparkling as a versatile aperitif pairing). Do not default to red — let the dish guide the type.
2. Recommend up to 10 wines from the provided cellar, ordered by how well they pair with the dish. Prioritize the classically matching type(s), but include at least 2 of each type available in the cellar (red, white, rosé, sparkling) to offer variety. Dessert wines may be included when they genuinely complement the dish.
3. Among wines that pair equally well, use the drinkability window as a tiebreaker: prefer wines at or near their ideal drinking window. Mark those with "drinkNow": true. But a perfect pairing that is slightly young still ranks above a mediocre pairing that is ready to drink.
4. Include exactly one "Querschläger" — an unconventional, unexpected choice that could work surprisingly well. Place it somewhere in the middle of the list (not position 1 or 2). Mark it with "querschlaeger": true.
5. For each recommendation, provide a concise one-line reason explaining why it pairs well.

Reply with ONLY valid JSON in this format:
{"recommendations":[{"producer":"...","name":"...","vintage":"...","reason":"...","querschlaeger":false,"drinkNow":false}]}`

function buildWineList(wines: WineEntry[]): string {
	return wines
		.map(
			(w) =>
				`- ${w.producer} "${w.name}" ${w.vintage}, ${w.type}, ${w.country || 'unknown origin'}, ${w.bottles} bottle(s)`
		)
		.join('\n')
}

export async function runSommelierQuery(
	prompt: string,
	wines: WineEntry[],
	apiKey: string
): Promise<SommelierResult> {
	const inStock = wines.filter((w) => w.bottles > 0)
	const wineList = buildWineList(inStock)

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
			max_tokens: 1024,
			system: SYSTEM,
			messages: [
				{
					role: 'user',
					content: `My cellar:\n${wineList}\n\nWhat should I drink with: ${prompt}`
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
	if (!match) {
		throw new Error('Could not parse sommelier response')
	}

	const parsed = JSON.parse(match[0])
	if (!Array.isArray(parsed.recommendations)) {
		throw new Error('Invalid sommelier response format')
	}

	return {
		recommendations: parsed.recommendations.map(
			(r: Record<string, unknown>): SommelierRecommendation => ({
				producer: String(r.producer ?? ''),
				name: String(r.name ?? ''),
				vintage: String(r.vintage ?? ''),
				reason: String(r.reason ?? ''),
				querschlaeger: Boolean(r.querschlaeger),
				drinkNow: Boolean(r.drinkNow)
			})
		)
	}
}
