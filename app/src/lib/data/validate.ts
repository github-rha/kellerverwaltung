import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import schema from '../../../../schema/cellar.schema.json'
import type { Cellar } from './types'

const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)

const validateSchema = ajv.compile(schema)

export function validate(cellar: Cellar): { valid: true } | { valid: false; errors: string } {
	const valid = validateSchema(cellar)
	if (valid) {
		return { valid: true }
	}
	const errors = validateSchema.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ')
	return { valid: false, errors: errors ?? 'Unknown validation error' }
}
