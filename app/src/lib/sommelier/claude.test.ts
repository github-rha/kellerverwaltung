import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runSommelierQuery } from './claude'
import type { WineEntry } from '$lib/data/types'

function makeWine(overrides: Partial<WineEntry> = {}): WineEntry {
	return {
		id: crypto.randomUUID(),
		type: 'red',
		producer: 'Weingut Keller',
		producerKey: 'weingut-keller',
		name: 'Riesling',
		vintage: 2021,
		bottles: 6,
		notes: '',
		country: 'Germany',
		photoRef: '',
		addedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	}
}

const mockResponse = {
	recommendations: [
		{
			producer: 'Weingut Keller',
			name: 'Riesling',
			vintage: '2021',
			reason: 'Crisp acidity cuts through rich flavors',
			querschlaeger: false,
			drinkNow: true
		},
		{
			producer: 'Domaine Leroy',
			name: 'Bourgogne Rouge',
			vintage: '2019',
			reason: 'Light body complements the dish',
			querschlaeger: false,
			drinkNow: false
		},
		{
			producer: 'Caves de Ribeauvillé',
			name: 'Gewürztraminer',
			vintage: '2020',
			reason: 'Unexpected aromatic match',
			querschlaeger: true,
			drinkNow: true
		}
	]
}

beforeEach(() => {
	vi.restoreAllMocks()
})

function toolUseResponse(input: unknown) {
	return new Response(
		JSON.stringify({
			content: [{ type: 'tool_use', name: 'provide_recommendations', input }]
		})
	)
}

describe('runSommelierQuery', () => {
	it('sends only in-stock wines to the API', async () => {
		const wines = [
			makeWine({ bottles: 3, name: 'In Stock' }),
			makeWine({ bottles: 0, name: 'Empty' }),
			makeWine({ bottles: 1, name: 'Last One' })
		]

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(toolUseResponse(mockResponse))

		await runSommelierQuery('pasta', wines, 'test-key')

		const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)
		const userMessage = body.messages[0].content
		expect(userMessage).toContain('In Stock')
		expect(userMessage).toContain('Last One')
		expect(userMessage).not.toContain('Empty')
	})

	it('parses a tool_use sommelier response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(toolUseResponse(mockResponse))

		const result = await runSommelierQuery('steak', [makeWine()], 'test-key')
		expect(result.recommendations).toHaveLength(3)
		expect(result.recommendations[0].producer).toBe('Weingut Keller')
		expect(result.recommendations[0].drinkNow).toBe(true)
		expect(result.recommendations[2].querschlaeger).toBe(true)
	})

	it('parses tool_use input with apostrophes in names', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			toolUseResponse({
				recommendations: [
					{
						producer: "Domaine d'Auvenay",
						name: "L'Étoile",
						vintage: '2018',
						reason: "Crisp, focused — perfect for the dish's richness",
						querschlaeger: false,
						drinkNow: true
					}
				]
			})
		)

		const result = await runSommelierQuery('coq au vin', [makeWine()], 'test-key')
		expect(result.recommendations[0].producer).toBe("Domaine d'Auvenay")
		expect(result.recommendations[0].name).toBe("L'Étoile")
	})

	it('throws on API error', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Unauthorized', { status: 401 }))

		await expect(runSommelierQuery('fish', [makeWine()], 'bad-key')).rejects.toThrow(
			'Claude API error 401'
		)
	})

	it('throws when response has no tool_use block', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					content: [{ type: 'text', text: 'I cannot help with that' }]
				})
			)
		)

		await expect(runSommelierQuery('pizza', [makeWine()], 'test-key')).rejects.toThrow(
			'Could not parse sommelier response'
		)
	})

	it('sends request with correct headers, model, and forced tool choice', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(toolUseResponse(mockResponse))

		await runSommelierQuery('salad', [makeWine()], 'my-api-key')

		const [url, opts] = fetchSpy.mock.calls[0]
		expect(url).toBe('https://api.anthropic.com/v1/messages')
		const headers = opts!.headers as Record<string, string>
		expect(headers['x-api-key']).toBe('my-api-key')
		const body = JSON.parse(opts!.body as string)
		expect(body.model).toBe('claude-opus-4-8')
		expect(body.tool_choice).toEqual({ type: 'tool', name: 'provide_recommendations' })
		expect(body.tools[0].name).toBe('provide_recommendations')
	})
})
