// OCR image preprocessing pipeline:
//   1. Grayscale conversion
//   2. Contrast stretch  (1st–99th percentile normalisation)
//   3. CLAHE             (contrast-limited adaptive histogram equalisation, 8×8 tiles)
//   4. Adaptive threshold (local mean − C binarisation)
//
// Steps 2 and 3 work on grey values so the adaptive threshold sees the best
// possible local contrast regardless of lighting conditions.

const MAX_PX = 1500 // resize before processing to keep memory manageable on mobile
const ADAPTIVE_C = 10 // bias: pixel must be this much darker than local mean to become black
const CLAHE_TILES = 8 // grid dimension (8×8 tiles)
const CLAHE_CLIP = 2.0 // clip limit multiplier for CLAHE histogram

// --- step 1: greyscale ---

function toGray(data: Uint8ClampedArray, n: number): Uint8Array {
	const gray = new Uint8Array(n)
	for (let i = 0; i < n; i++) {
		gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0
	}
	return gray
}

// --- step 2: contrast stretch ---

function contrastStretch(gray: Uint8Array): void {
	const hist = new Int32Array(256)
	for (let i = 0; i < gray.length; i++) hist[gray[i]]++

	const loTarget = gray.length * 0.01
	const hiTarget = gray.length * 0.99
	let lo = 0,
		hi = 255,
		count = 0
	for (let v = 0; v < 256; v++) {
		count += hist[v]
		if (count < loTarget) lo = v
		if (count < hiTarget) hi = v
	}

	if (hi <= lo) return
	const scale = 255 / (hi - lo)
	for (let i = 0; i < gray.length; i++) {
		gray[i] = Math.min(255, Math.max(0, ((gray[i] - lo) * scale) | 0))
	}
}

// --- step 3: CLAHE ---

function clahe(gray: Uint8Array, width: number, height: number): void {
	const T = CLAHE_TILES
	const tileW = Math.ceil(width / T)
	const tileH = Math.ceil(height / T)

	// Build per-tile equalisation LUTs
	const luts: Uint8Array[] = new Array(T * T)
	for (let ty = 0; ty < T; ty++) {
		for (let tx = 0; tx < T; tx++) {
			const x0 = tx * tileW,
				x1 = Math.min(x0 + tileW, width)
			const y0 = ty * tileH,
				y1 = Math.min(y0 + tileH, height)
			const area = (x1 - x0) * (y1 - y0)

			const hist = new Int32Array(256)
			for (let y = y0; y < y1; y++)
				for (let x = x0; x < x1; x++) hist[gray[y * width + x]]++

			// Clip and redistribute excess uniformly
			const limit = Math.max(1, ((CLAHE_CLIP * area) / 256) | 0)
			let excess = 0
			for (let v = 0; v < 256; v++) {
				if (hist[v] > limit) {
					excess += hist[v] - limit
					hist[v] = limit
				}
			}
			const add = (excess / 256) | 0
			for (let v = 0; v < 256; v++) hist[v] += add

			// CDF → LUT
			const lut = new Uint8Array(256)
			let cdf = 0
			for (let v = 0; v < 256; v++) {
				cdf += hist[v]
				lut[v] = Math.min(255, ((cdf * 255) / area) | 0)
			}
			luts[ty * T + tx] = lut
		}
	}

	// Apply LUTs with bilinear interpolation between tile centres
	const out = new Uint8Array(gray.length)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = gray[y * width + x]
			// Fractional tile-centre coordinate
			const fx = (x + 0.5) / tileW - 0.5
			const fy = (y + 0.5) / tileH - 0.5
			const tx0 = Math.max(0, Math.min(T - 1, Math.floor(fx)))
			const ty0 = Math.max(0, Math.min(T - 1, Math.floor(fy)))
			const tx1 = Math.min(T - 1, tx0 + 1)
			const ty1 = Math.min(T - 1, ty0 + 1)
			const wx = Math.max(0, Math.min(1, fx - tx0))
			const wy = Math.max(0, Math.min(1, fy - ty0))
			out[y * width + x] =
				(luts[ty0 * T + tx0][px] * (1 - wx) * (1 - wy) +
					luts[ty0 * T + tx1][px] * wx * (1 - wy) +
					luts[ty1 * T + tx0][px] * (1 - wx) * wy +
					luts[ty1 * T + tx1][px] * wx * wy) |
				0
		}
	}
	gray.set(out)
}

// --- step 4: adaptive threshold ---

function adaptiveThresholdInPlace(gray: Uint8Array, width: number, height: number): void {
	// Summed area table for O(1) neighbourhood mean queries.
	// Max value: 1500 * 1500 * 255 ≈ 573 M — fits in Int32.
	const integral = new Int32Array(width * height)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x
			integral[i] =
				gray[i] +
				(x > 0 ? integral[i - 1] : 0) +
				(y > 0 ? integral[i - width] : 0) -
				(x > 0 && y > 0 ? integral[i - width - 1] : 0)
		}
	}

	const radius = Math.max(5, Math.round(Math.min(width, height) * 0.02))
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const x0 = Math.max(0, x - radius),
				x1 = Math.min(width - 1, x + radius)
			const y0 = Math.max(0, y - radius),
				y1 = Math.min(height - 1, y + radius)
			const sum =
				integral[y1 * width + x1] -
				(x0 > 0 ? integral[y1 * width + (x0 - 1)] : 0) -
				(y0 > 0 ? integral[(y0 - 1) * width + x1] : 0) +
				(x0 > 0 && y0 > 0 ? integral[(y0 - 1) * width + (x0 - 1)] : 0)
			const count = (x1 - x0 + 1) * (y1 - y0 + 1)
			gray[y * width + x] = gray[y * width + x] > sum / count - ADAPTIVE_C ? 255 : 0
		}
	}
}

// --- public API ---

export async function preprocessForOcr(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file)
	const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height))
	const width = Math.round(bitmap.width * scale)
	const height = Math.round(bitmap.height * scale)

	const canvas = new OffscreenCanvas(width, height)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, width, height)
	bitmap.close()

	const { data } = ctx.getImageData(0, 0, width, height)
	const gray = toGray(data, width * height)

	contrastStretch(gray)
	clahe(gray, width, height)
	adaptiveThresholdInPlace(gray, width, height)

	const output = new Uint8ClampedArray(width * height * 4)
	for (let i = 0; i < width * height; i++) {
		output[i * 4] = output[i * 4 + 1] = output[i * 4 + 2] = gray[i]
		output[i * 4 + 3] = 255
	}
	ctx.putImageData(new ImageData(output, width, height), 0, 0)
	return canvas.convertToBlob({ type: 'image/png' })
}
