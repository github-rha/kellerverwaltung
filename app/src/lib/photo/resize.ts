const MAX_SIZE = 1200

export async function resizeImage(file: File): Promise<ImageData> {
	const bitmap = await createImageBitmap(file)
	const { width, height } = bitmap

	let targetWidth = width
	let targetHeight = height

	if (width > MAX_SIZE || height > MAX_SIZE) {
		const scale = MAX_SIZE / Math.max(width, height)
		targetWidth = Math.round(width * scale)
		targetHeight = Math.round(height * scale)
	}

	const canvas = new OffscreenCanvas(targetWidth, targetHeight)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
	bitmap.close()

	return ctx.getImageData(0, 0, targetWidth, targetHeight)
}
