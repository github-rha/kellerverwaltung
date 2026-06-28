import adapter from '@sveltejs/adapter-static'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html'
		}),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				// 'unsafe-eval' is required because Ajv compiles the JSON schema with
				// new Function() at runtime; connect-src below still blocks exfiltration
				'script-src': ['self', 'unsafe-eval'],
				'connect-src': ['self', 'https://api.github.com', 'https://api.anthropic.com'],
				'img-src': ['self', 'data:', 'blob:'],
				'style-src': ['self', 'unsafe-inline'],
				'object-src': ['none'],
				'base-uri': ['self']
			}
		}
	}
}

export default config
