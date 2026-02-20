import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	retries: process.env.CI ? 1 : 0,
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],
	webServer: {
		command: 'npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
})
