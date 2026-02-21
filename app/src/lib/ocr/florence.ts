import {
	Florence2ForConditionalGeneration,
	AutoProcessor,
	AutoTokenizer,
	RawImage,
	Tensor
} from '@huggingface/transformers'
import type { OcrResult } from './tesseract'

const MODEL_ID = 'onnx-community/Florence-2-base-ft'
const TASK = '<OCR>'

// Florence2Processor has methods beyond the base Processor type (construct_prompts,
// post_process_generation). Cast via unknown to avoid type errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Florence2Processor = any

type Pipeline = {
	model: Awaited<ReturnType<typeof Florence2ForConditionalGeneration.from_pretrained>>
	processor: Florence2Processor
	tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
}

let pipelinePromise: Promise<Pipeline> | null = null

function getPipeline(): Promise<Pipeline> {
	if (!pipelinePromise) {
		pipelinePromise = Promise.all([
			Florence2ForConditionalGeneration.from_pretrained(MODEL_ID, {
				dtype: 'q4',
				device: 'auto'
			}),
			AutoProcessor.from_pretrained(MODEL_ID) as Promise<Florence2Processor>,
			AutoTokenizer.from_pretrained(MODEL_ID)
		]).then(([model, processor, tokenizer]) => ({ model, processor, tokenizer }))
	}
	return pipelinePromise
}

export async function runOcr(blob: Blob): Promise<OcrResult> {
	const { model, processor, tokenizer } = await getPipeline()

	const url = URL.createObjectURL(blob)
	let image: RawImage
	try {
		image = await RawImage.fromURL(url)
	} finally {
		URL.revokeObjectURL(url)
	}

	const prompts = processor.construct_prompts(TASK)
	const textInputs = tokenizer(prompts)
	const imageInputs = await processor(image)

	// GenerationFunctionParameters types don't cover Florence-2's full signature
	const generatedIds = (await model.generate({
		input_ids: textInputs.input_ids,
		pixel_values: imageInputs.pixel_values,
		max_new_tokens: 256,
		num_beams: 1
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any)) as Tensor

	const generatedText = tokenizer.batch_decode(generatedIds, { skip_special_tokens: false })[0]
	const result = processor.post_process_generation(generatedText, TASK, image.size)

	return { text: (result[TASK] as string) ?? '', words: [] }
}
