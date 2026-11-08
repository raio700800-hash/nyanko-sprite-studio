import { GIFEncoder, nearestColorIndex, quantize } from 'gifenc'
import type {
  ChromaSettings,
  ExportLayout,
  PlaybackMode,
  ProcessedFrame,
  SpriteTrial,
} from '../types/studio'

export function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = src
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return [255, 255, 255]
  const n = parseInt(clean, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function detectCornerBackgroundColor(
  data: Uint8ClampedArray,
  w: number,
  h: number
): [number, number, number] {
  const coords: [number, number][] = [
    [1, 1],
    [Math.max(0, w - 2), 1],
    [1, Math.max(0, h - 2)],
    [Math.max(0, w - 2), Math.max(0, h - 2)],
  ]
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  for (const [x, y] of coords) {
    const idx = (y * w + x) * 4
    if (data[idx + 3] > 200) {
      rSum += data[idx]
      gSum += data[idx + 1]
      bSum += data[idx + 2]
      count++
    }
  }
  if (count === 0) return [255, 255, 255]
  return [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)]
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function applyChromaKey(
  canvas: HTMLCanvasElement,
  chroma: ChromaSettings
): { detectedHex: string } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { detectedHex: '#ffffff' }

  const w = canvas.width
  const h = canvas.height
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  const keyRgb: [number, number, number] =
    chroma.keyColor === 'auto'
      ? detectCornerBackgroundColor(data, w, h)
      : hexToRgb(chroma.keyColor)

  const detectedHex =
    '#' +
    keyRgb
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')

  if (!chroma.enabled) {
    return { detectedHex }
  }

  const [kr, kg, kb] = keyRgb
  const tol = Math.max(0, chroma.tolerance)
  const feather = Math.max(1, chroma.feather)
  const maxDist = tol + feather

  if (chroma.mode === 'global') {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a === 0) continue
      const d = colorDistance(data[i], data[i + 1], data[i + 2], kr, kg, kb)
      if (d <= tol) {
        data[i + 3] = 0
      } else if (d < maxDist) {
        const ratio = (d - tol) / feather
        data[i + 3] = Math.round(a * ratio)
        if (chroma.despill) {
          // Gently push edge pixel color away from key color to avoid light fringe
          const inv = 1 - ratio
          data[i] = Math.max(0, Math.min(255, Math.round((data[i] - kr * inv) / Math.max(0.25, ratio))))
          data[i + 1] = Math.max(
            0,
            Math.min(255, Math.round((data[i + 1] - kg * inv) / Math.max(0.25, ratio)))
          )
          data[i + 2] = Math.max(
            0,
            Math.min(255, Math.round((data[i + 2] - kb * inv) / Math.max(0.25, ratio)))
          )
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)
    return { detectedHex }
  }

  // BFS Flood-Fill from outer perimeter so white fur/eyes inside outlines remain untouched
  const total = w * h
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  const tryPush = (px: number, py: number) => {
    const pIdx = py * w + px
    if (visited[pIdx]) return
    const off = pIdx * 4
    const a = data[off + 3]
    if (a === 0) {
      visited[pIdx] = 1
      queue[tail++] = pIdx
      return
    }
    const d = colorDistance(data[off], data[off + 1], data[off + 2], kr, kg, kb)
    if (d <= maxDist) {
      visited[pIdx] = 1
      queue[tail++] = pIdx
    }
  }

  for (let x = 0; x < w; x++) {
    tryPush(x, 0)
    tryPush(x, h - 1)
  }
  for (let y = 1; y < h - 1; y++) {
    tryPush(0, y)
    tryPush(w - 1, y)
  }

  while (head < tail) {
    const cur = queue[head++]
    const cx = cur % w
    const cy = (cur - cx) / w

    const off = cur * 4
    const a = data[off + 3]
    if (a > 0) {
      const d = colorDistance(data[off], data[off + 1], data[off + 2], kr, kg, kb)
      if (d <= tol) {
        data[off + 3] = 0
      } else {
        const ratio = (d - tol) / feather
        data[off + 3] = Math.round(a * ratio)
        if (chroma.despill) {
          const inv = 1 - ratio
          data[off] = Math.max(
            0,
            Math.min(255, Math.round((data[off] - kr * inv) / Math.max(0.25, ratio)))
          )
          data[off + 1] = Math.max(
            0,
            Math.min(255, Math.round((data[off + 1] - kg * inv) / Math.max(0.25, ratio)))
          )
          data[off + 2] = Math.max(
            0,
            Math.min(255, Math.round((data[off + 2] - kb * inv) / Math.max(0.25, ratio)))
          )
        }
      }
      // Continue flood propagation only through clear/near-clear background pixels
      if (d > tol + feather * 0.45) {
        continue
      }
    }

    if (cx > 0) tryPush(cx - 1, cy)
    if (cx + 1 < w) tryPush(cx + 1, cy)
    if (cy > 0) tryPush(cx, cy - 1)
    if (cy + 1 < h) tryPush(cx, cy + 1)
  }

  // Optional soft outer alpha fringe cleanup on 1px neighbor of cleared background
  ctx.putImageData(imgData, 0, 0)
  return { detectedHex }
}

interface BBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

function getOpaqueBoundingBox(canvas: HTMLCanvasElement, alphaThreshold = 22): BBox | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const w = canvas.width
  const h = canvas.height
  const data = ctx.getImageData(0, 0, w, h).data

  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]
      if (a > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) return null
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

export interface ProcessSheetResult {
  frames: ProcessedFrame[]
  detectedBgHex: string
}

export async function sliceAndProcessSpriteSheet(
  trial: SpriteTrial
): Promise<ProcessSheetResult> {
  const sheetImg = await loadImageFromUrl(trial.rawSheetDataUrl)
  const cellW = sheetImg.naturalWidth / Math.max(1, trial.cols)
  const cellH = sheetImg.naturalHeight / Math.max(1, trial.rows)

  // Step 1: Extract each cell (or custom re-rolled frame) and apply background removal
  const extracted: {
    orderIndex: number
    cfgIndex: number
    sourceIndex: number
    enabled: boolean
    offsetX: number
    offsetY: number
    canvas: HTMLCanvasElement
    bbox: BBox | null
  }[] = []

  let detectedBgHex = '#ffffff'

  for (let i = 0; i < trial.framesConfig.length; i++) {
    const cfg = trial.framesConfig[i]
    const cellCanvas = document.createElement('canvas')

    if (cfg.customDataUrl) {
      const customImg = await loadImageFromUrl(cfg.customDataUrl)
      cellCanvas.width = customImg.naturalWidth
      cellCanvas.height = customImg.naturalHeight
      const cCtx = cellCanvas.getContext('2d')!
      cCtx.drawImage(customImg, 0, 0)
    } else {
      const srcCol = cfg.sourceIndex % Math.max(1, trial.cols)
      const srcRow = Math.floor(cfg.sourceIndex / Math.max(1, trial.cols))
      const sx = Math.round(srcCol * cellW)
      const sy = Math.round(srcRow * cellH)
      const sw = Math.max(1, Math.round(cellW))
      const sh = Math.max(1, Math.round(cellH))

      cellCanvas.width = sw
      cellCanvas.height = sh
      const cCtx = cellCanvas.getContext('2d')!
      cCtx.drawImage(sheetImg, sx, sy, sw, sh, 0, 0, sw, sh)
    }

    const { detectedHex } = applyChromaKey(cellCanvas, trial.chroma)
    if (i === 0) detectedBgHex = detectedHex

    const bbox = getOpaqueBoundingBox(cellCanvas)
    extracted.push({
      orderIndex: i,
      cfgIndex: i,
      sourceIndex: cfg.sourceIndex,
      enabled: cfg.enabled,
      offsetX: cfg.offsetX,
      offsetY: cfg.offsetY,
      canvas: cellCanvas,
      bbox,
    })
  }

  // Step 2: Compute shared scale across non-empty frames so character size stays consistent
  let maxBboxW = 0
  let maxBboxH = 0
  for (const item of extracted) {
    if (!item.bbox) continue
    if (item.bbox.width > maxBboxW) maxBboxW = item.bbox.width
    if (item.bbox.height > maxBboxH) maxBboxH = item.bbox.height
  }

  const padFraction = Math.max(0, Math.min(0.35, trial.paddingPct / 100))
  const padX = Math.round(trial.frameWidth * padFraction)
  const padY = Math.round(trial.frameHeight * padFraction)
  const availW = Math.max(8, trial.frameWidth - padX * 2)
  const availH = Math.max(8, trial.frameHeight - padY * 2)

  const sharedScale =
    maxBboxW > 0 && maxBboxH > 0
      ? Math.min(availW / maxBboxW, availH / maxBboxH)
      : 1

  // Step 3: Render normalized target frames
  const frames: ProcessedFrame[] = extracted.map((item) => {
    const out = document.createElement('canvas')
    out.width = trial.frameWidth
    out.height = trial.frameHeight
    const ctx = out.getContext('2d')!
    ctx.imageSmoothingEnabled = !trial.pixelArtCrisp
    ctx.imageSmoothingQuality = trial.pixelArtCrisp ? 'low' : 'high'

    if (trial.alignMode === 'none' || !item.bbox) {
      // Uniformly fit entire cell inside target frame
      const s = Math.min(
        trial.frameWidth / Math.max(1, item.canvas.width),
        trial.frameHeight / Math.max(1, item.canvas.height)
      )
      const dw = Math.round(item.canvas.width * s)
      const dh = Math.round(item.canvas.height * s)
      const dx = Math.round((trial.frameWidth - dw) / 2) + item.offsetX
      const dy = Math.round((trial.frameHeight - dh) / 2) + item.offsetY
      ctx.drawImage(item.canvas, 0, 0, item.canvas.width, item.canvas.height, dx, dy, dw, dh)
    } else {
      const b = item.bbox
      // Use shared scale (clamping only if an unusually wide/tall frame would clip)
      const frameScale = Math.min(sharedScale, availW / b.width, availH / b.height)
      const dw = Math.max(1, Math.round(b.width * frameScale))
      const dh = Math.max(1, Math.round(b.height * frameScale))

      const dx = Math.round((trial.frameWidth - dw) / 2) + item.offsetX
      const dy =
        trial.alignMode === 'bottom-center'
          ? Math.round(trial.frameHeight - padY - dh) + item.offsetY
          : Math.round((trial.frameHeight - dh) / 2) + item.offsetY

      ctx.drawImage(item.canvas, b.minX, b.minY, b.width, b.height, dx, dy, dw, dh)
    }

    return {
      orderIndex: item.orderIndex,
      sourceIndex: item.sourceIndex,
      enabled: item.enabled,
      canvas: out,
      dataUrl: out.toDataURL('image/png'),
    }
  })

  return { frames, detectedBgHex }
}

export interface ComposedSheet {
  canvas: HTMLCanvasElement
  dataUrl: string
  cols: number
  rows: number
  framesMeta: {
    index: number
    sourceIndex: number
    x: number
    y: number
    width: number
    height: number
  }[]
}

export function composeFinalSheet(
  frames: ProcessedFrame[],
  frameWidth: number,
  frameHeight: number,
  layout: ExportLayout,
  preferredCols: number,
  flipX: boolean,
  crisp: boolean
): ComposedSheet {
  const active = frames.filter((f) => f.enabled)
  const list = active.length > 0 ? active : frames

  const cols =
    layout === 'strip'
      ? Math.max(1, list.length)
      : Math.max(1, Math.min(preferredCols, list.length))
  const rows = layout === 'strip' ? 1 : Math.max(1, Math.ceil(list.length / cols))

  const canvas = document.createElement('canvas')
  canvas.width = cols * frameWidth
  canvas.height = rows * frameHeight
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = !crisp

  const framesMeta: ComposedSheet['framesMeta'] = []

  list.forEach((frame, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = c * frameWidth
    const y = r * frameHeight

    ctx.save()
    if (flipX) {
      ctx.translate(x + frameWidth, y)
      ctx.scale(-1, 1)
      ctx.drawImage(frame.canvas, 0, 0)
    } else {
      ctx.drawImage(frame.canvas, x, y)
    }
    ctx.restore()

    framesMeta.push({
      index: i,
      sourceIndex: frame.sourceIndex,
      x,
      y,
      width: frameWidth,
      height: frameHeight,
    })
  })

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    cols,
    rows,
    framesMeta,
  }
}

export function getPlaybackSequence(
  frames: ProcessedFrame[],
  mode: PlaybackMode
): ProcessedFrame[] {
  const active = frames.filter((f) => f.enabled)
  const list = active.length > 0 ? active : frames
  if (mode === 'ping-pong' && list.length > 2) {
    const rev = list.slice(1, -1).reverse()
    return [...list, ...rev]
  }
  return list
}

export function encodeTransparentGif(
  frames: ProcessedFrame[],
  frameWidth: number,
  frameHeight: number,
  fps: number,
  playbackMode: PlaybackMode,
  flipX: boolean
): { bytes: Uint8Array; blob: Blob } {
  const seq = getPlaybackSequence(frames, playbackMode)
  if (seq.length === 0) {
    throw new Error('GIF出力できるコマがありません')
  }

  // Extract RGBA buffers (optionally flipped horizontally)
  const scratch = document.createElement('canvas')
  scratch.width = frameWidth
  scratch.height = frameHeight
  const sCtx = scratch.getContext('2d', { willReadFrequently: true })!

  const frameRgbas: Uint8ClampedArray[] = seq.map((frame) => {
    sCtx.clearRect(0, 0, frameWidth, frameHeight)
    sCtx.save()
    if (flipX) {
      sCtx.translate(frameWidth, 0)
      sCtx.scale(-1, 1)
    }
    sCtx.drawImage(frame.canvas, 0, 0)
    sCtx.restore()
    return sCtx.getImageData(0, 0, frameWidth, frameHeight).data
  })

  // Sample opaque pixels across all frames to build a consistent 255-color RGB palette
  const opaqueSamples: number[] = []
  const maxSamplePixels = 45000
  const totalPixelsPerFrame = frameWidth * frameHeight
  const totalPixelsAll = totalPixelsPerFrame * frameRgbas.length
  const stride = Math.max(1, Math.floor(totalPixelsAll / maxSamplePixels))

  for (const rgba of frameRgbas) {
    for (let p = 0; p < totalPixelsPerFrame; p += stride) {
      const off = p * 4
      if (rgba[off + 3] >= 128) {
        opaqueSamples.push(rgba[off], rgba[off + 1], rgba[off + 2], 255)
      }
    }
  }

  const colorSource =
    opaqueSamples.length >= 4
      ? new Uint8Array(opaqueSamples)
      : new Uint8Array([32, 32, 32, 255, 255, 255, 255, 255])

  const quantized = quantize(colorSource, 255, { format: 'rgb565' })
  // Index 0 is reserved strictly for full transparency
  const palette: number[][] = [[0, 0, 0], ...quantized.slice(0, 255)]
  const colorPaletteOnly = palette.slice(1)

  // 16-bit RGB565 LUT cache for fast nearest-color mapping
  const lut = new Int16Array(65536)
  lut.fill(-1)

  const gif = GIFEncoder()
  const delayMs = Math.max(20, Math.round(1000 / Math.max(1, fps)))
  const repeat = playbackMode === 'once' ? -1 : 0

  frameRgbas.forEach((rgba, idx) => {
    const indexed = new Uint8Array(totalPixelsPerFrame)
    for (let p = 0; p < totalPixelsPerFrame; p++) {
      const off = p * 4
      const a = rgba[off + 3]
      if (a < 128) {
        indexed[p] = 0
        continue
      }
      const r = rgba[off]
      const g = rgba[off + 1]
      const b = rgba[off + 2]
      const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
      let mapped = lut[key]
      if (mapped === -1) {
        mapped = nearestColorIndex(colorPaletteOnly, [r, g, b]) + 1
        lut[key] = mapped
      }
      indexed[p] = mapped
    }

    gif.writeFrame(indexed, frameWidth, frameHeight, {
      palette: idx === 0 ? palette : undefined,
      delay: delayMs,
      repeat,
      transparent: true,
      transparentIndex: 0,
      dispose: 2,
    })
  })

  gif.finish()
  const bytes = gif.bytes()
  const arrayCopy = new Uint8Array(bytes.byteLength)
  arrayCopy.set(bytes)
  return {
    bytes: arrayCopy,
    blob: new Blob([arrayCopy], { type: 'image/gif' }),
  }
}
