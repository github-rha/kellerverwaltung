import { test, expect } from '@playwright/test'

test('dashboard loads', async ({ page }) => {
	await page.goto('/')
	await expect(page.locator('h1')).toHaveText('Kellerverwaltung')
	await expect(page.getByText('0 bottles total')).toBeVisible()
})

test('add wine and see it on dashboard', async ({ page }) => {
	await page.goto('/')
	await page.click('[aria-label="Add wine"]')

	await page.selectOption('#wine-type', 'red')
	await page.fill('#wine-producer', 'Test Producer')
	await page.fill('#wine-name', 'Test Riesling')
	await page.fill('#wine-vintage', '2020')
	await page.fill('#wine-bottles', '3')
	await page.click('button[type="submit"]')

	await expect(page.getByText('Test Riesling')).toBeVisible()
	await expect(page.getByText('3 bottles total')).toBeVisible()
})

test('+1 on wine detail increments count', async ({ page }) => {
	await page.goto('/')
	await page.click('[aria-label="Add wine"]')
	await page.fill('#wine-producer', 'Test Producer')
	await page.fill('#wine-name', 'Count Wine')
	await page.fill('#wine-vintage', '2019')
	await page.fill('#wine-bottles', '2')
	await page.click('button[type="submit"]')

	await page.getByText('Count Wine').click()
	await page.click('button[aria-label="+1"], button:has-text("+")')

	await expect(page.getByText('3')).toBeVisible()
})

test('edit wine and see changes', async ({ page }) => {
	await page.goto('/')
	await page.click('[aria-label="Add wine"]')
	await page.fill('#wine-producer', 'Test Producer')
	await page.fill('#wine-name', 'Original Name')
	await page.fill('#wine-vintage', '2018')
	await page.fill('#wine-bottles', '1')
	await page.click('button[type="submit"]')

	await page.getByText('Original Name').click()
	await page.click('button:has-text("Edit")')
	await page.fill('#wine-name', 'Updated Name')
	await page.click('button[type="submit"]')

	await expect(page.getByText('Updated Name')).toBeVisible()
})
