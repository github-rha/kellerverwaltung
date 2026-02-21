// OCR image preprocessing pipeline:
//   1. Grayscale
//   2. Cylindrical dewarp  (corrects horizontal compression at label edges)
//   3. Contrast stretch    (1st–99th percentile normalisation)
//   4. CLAHE               (contrast-limited adaptive histogram equalisation, 8×8 tiles)
//   5. Sauvola threshold   (local mean + std-dev binarisation — better than plain mean)

const MAX_PX = 1500
const CLAHE_TILES = 8
const CLAHE_CLIP = 2.0
const SAUVOLA_K = 0.3 // sensitivity — higher = more aggressive black
const SAUVOLA_R = 128 // normalisation constant for std dev (fixed at half of 255)
// Assumed half-angle of label arc as seen by camera.
// 45° is conservative; increase toward 60° for wide labels photographed close-up.
const DEWARP_THETA_MAX = Math.PI / 4

// --- step 1: greyscale ---

function toGray(data: Uint8ClampedArray, n: number): Uint8Array {
	const gray = new Uint8Array(n)
	for (let i = 0; i < n; i++) {
		gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0
	}
	return gray
}

// --- step 2: cylindrical dewarp ---
//
// Backward map: for each output pixel x_out, find the input pixel x_in.
// A point at arc angle θ from centre projects to x_in = cx + sin(θ)/sin(θmax) * hw.
// We invert that: given x_out (uniformly spaced in arc), compute θ = (x_out-cx)/hw * θmax,
// then x_in = cx + sin(θ)/sin(θmax) * hw.
// This stretches the edges (where cylindrical compression is greatest).

function dewarpCylinder(gray: Uint8Array, width: number, height: number): void {
	const cx = width / 2
	const hw = width / 2
	const sinMax = Math.sin(DEWARP_THETA_MAX)
	const out = new Uint8Array(gray.length)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const theta = ((x - cx) / hw) * DEWARP_THETA_MAX
			const xIn = cx + (Math.sin(theta) / sinMax) * hw
			const x0 = Math.max(0, Math.min(width - 2, Math.floor(xIn)))
			const t = xIn - x0
			out[y * width + x] =
				(gray[y * width + x0] * (1 - t) + gray[y * width + (x0 + 1)] * t) | 0
		}
	}
	gray.set(out)
}

// --- step 3: contrast stretch ---

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

// --- step 4: CLAHE ---

function clahe(gray: Uint8Array, width: number, height: number): void {
	const T = CLAHE_TILES
	const tileW = Math.ceil(width / T)
	const tileH = Math.ceil(height / T)

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

			const lut = new Uint8Array(256)
			let cdf = 0
			for (let v = 0; v < 256; v++) {
				cdf += hist[v]
				lut[v] = Math.min(255, ((cdf * 255) / area) | 0)
			}
			luts[ty * T + tx] = lut
		}
	}

	const out = new Uint8Array(gray.length)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const px = gray[y * width + x]
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

// --- step 5: Sauvola threshold ---
//
// T(x,y) = mean * (1 + k * (stddev / R − 1))
// Pixels ≥ T → white; pixels < T → black.
// Uses two integral images (sum and sum-of-squares) for O(1) per-pixel stats.
// Float64 for sum-of-squares to avoid overflow at 1500×1500 (max ~146 B > Int32 limit).

function sauvolaThreshold(gray: Uint8Array, width: number, height: number): void {
	const n = width * height
	const sumI = new Int32Array(n)
	const sumSq = new Float64Array(n)

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = y * width + x
			const v = gray[i]
			sumI[i] =
				v +
				(x > 0 ? sumI[i - 1] : 0) +
				(y > 0 ? sumI[i - width] : 0) -
				(x > 0 && y > 0 ? sumI[i - width - 1] : 0)
			sumSq[i] =
				v * v +
				(x > 0 ? sumSq[i - 1] : 0) +
				(y > 0 ? sumSq[i - width] : 0) -
				(x > 0 && y > 0 ? sumSq[i - width - 1] : 0)
		}
	}

	const radius = Math.max(5, Math.round(Math.min(width, height) * 0.02))

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const x0 = Math.max(0, x - radius),
				x1 = Math.min(width - 1, x + radius)
			const y0 = Math.max(0, y - radius),
				y1 = Math.min(height - 1, y + radius)
			const count = (x1 - x0 + 1) * (y1 - y0 + 1)

			const s =
				sumI[y1 * width + x1] -
				(x0 > 0 ? sumI[y1 * width + (x0 - 1)] : 0) -
				(y0 > 0 ? sumI[(y0 - 1) * width + x1] : 0) +
				(x0 > 0 && y0 > 0 ? sumI[(y0 - 1) * width + (x0 - 1)] : 0)

			const sq =
				sumSq[y1 * width + x1] -
				(x0 > 0 ? sumSq[y1 * width + (x0 - 1)] : 0) -
				(y0 > 0 ? sumSq[(y0 - 1) * width + x1] : 0) +
				(x0 > 0 && y0 > 0 ? sumSq[(y0 - 1) * width + (x0 - 1)] : 0)

			const mean = s / count
			const stdDev = Math.sqrt(Math.max(0, sq / count - mean * mean))
			const threshold = mean * (1 + SAUVOLA_K * (stdDev / SAUVOLA_R - 1))
			gray[y * width + x] = gray[y * width + x] >= threshold ? 255 : 0
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

	dewarpCylinder(gray, width, height)
	contrastStretch(gray)
	clahe(gray, width, height)
	sauvolaThreshold(gray, width, height)

	const output = new Uint8ClampedArray(width * height * 4)
	for (let i = 0; i < width * height; i++) {
		output[i * 4] = output[i * 4 + 1] = output[i * 4 + 2] = gray[i]
		output[i * 4 + 3] = 255
	}
	ctx.putImageData(new ImageData(output, width, height), 0, 0)
	return canvas.convertToBlob({ type: 'image/png' })
}
