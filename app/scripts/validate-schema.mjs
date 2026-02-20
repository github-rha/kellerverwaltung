import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemaPath = join(__dirname, '../../schema/cellar.schema.json')
const examplesDir = join(__dirname, '../../schema/examples')

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)
const validate = ajv.compile(schema)

const examples = readdirSync(examplesDir).filter((f) => f.endsWith('.json'))
let failed = false

for (const file of examples) {
	const data = JSON.parse(readFileSync(join(examplesDir, file), 'utf8'))
	if (!validate(data)) {
		const errors = validate.errors.map((e) => `  ${e.instancePath} ${e.message}`).join('\n')
		console.error(`FAIL ${file}:\n${errors}`)
		failed = true
	} else {
		console.log(`OK   ${file}`)
	}
}

if (failed) process.exit(1)
