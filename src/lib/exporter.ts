import JSZip from 'jszip'
import { MOTION_PRESETS, STYLE_PRESETS } from '../data/presets'
import type {
  CatCharacter,
  ExportLayout,
  ProcessedFrame,
  SpriteTrial,
} from '../types/studio'
import {
  composeFinalSheet,
  encodeTransparentGif,
  type ComposedSheet,
} from './spriteProcessor'

export interface ExportMetaJson {
  schemaVersion: '1.0'
  generator: 'nyanko-sprite-studio'
  characterId: string
  characterName: string
  animationId: string
  animationLabel: string
  styleId: string
  facing: string
  layout: ExportLayout
  cols: number
  rows: number
  frameCount: number
  frameWidth: number
  frameHeight: number
  sheetWidth: number
  sheetHeight: number
  fps: number
  frameDurationMs: number
  playbackMode: string
  loop: boolean
  anchor: { x: number; y: number }
  files: {
    spriteSheet: string
    animatedGif: string
    individualFramesPrefix: string
  }
  frames: {
    index: number
    x: number
    y: number
    width: number
    height: number
    durationMs: number
  }[]
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

function sanitizeSlug(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'cat_01'
  )
}

export function buildMetaJson(params: {
  cat: CatCharacter
  trial: SpriteTrial
  composed: ComposedSheet
  layout: ExportLayout
  prefix: string
  facingLabel: string
}): ExportMetaJson {
  const { cat, trial, composed, layout, prefix, facingLabel } = params
  const motion = MOTION_PRESETS.find((m) => m.id === trial.motionId)
  const durationMs = Math.round(1000 / Math.max(1, trial.fps))

  return {
    schemaVersion: '1.0',
    generator: 'nyanko-sprite-studio',
    characterId: sanitizeSlug(cat.slug),
    characterName: cat.name,
    animationId: trial.motionId,
    animationLabel: motion?.labelJa || trial.motionId,
    styleId: trial.styleId,
    facing: facingLabel,
    layout,
    cols: composed.cols,
    rows: composed.rows,
    frameCount: composed.framesMeta.length,
    frameWidth: trial.frameWidth,
    frameHeight: trial.frameHeight,
    sheetWidth: composed.canvas.width,
    sheetHeight: composed.canvas.height,
    fps: trial.fps,
    frameDurationMs: durationMs,
    playbackMode: trial.playbackMode,
    loop: trial.playbackMode !== 'once',
    anchor:
      trial.alignMode === 'bottom-center'
        ? { x: 0.5, y: 1.0 }
        : { x: 0.5, y: 0.5 },
    files: {
      spriteSheet: `${prefix}.png`,
      animatedGif: `${prefix}.gif`,
      individualFramesPrefix: 'frames/frame_',
    },
    frames: composed.framesMeta.map((f) => ({
      index: f.index,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      durationMs,
    })),
  }
}

export function buildAntigravityPromptMarkdown(params: {
  cat: CatCharacter
  trial: SpriteTrial
  meta: ExportMetaJson
  includeFlipped: boolean
  flippedPrefix?: string
}): string {
  const { cat, trial, meta, includeFlipped, flippedPrefix } = params
  const catSlug = sanitizeSlug(cat.slug)
  const styleLabel = STYLE_PRESETS.find((s) => s.id === trial.styleId)?.labelJa || trial.styleId
  const assetFolder = `public/assets/cats/${catSlug}/${trial.motionId}/`

  return `# Antigravity 2.0 組み込み指示書（にゃんこ探しゲーム用）

このフォルダを「にゃんこ探しゲーム」プロジェクトの \`${assetFolder}\` に配置し、以下のプロンプトをそのまま Antigravity に貼り付けて指示してください。

---

## Antigravity 貼り付け用プロンプト

\`\`\`text
\`${assetFolder}\` に新しい猫アニメーション素材を追加しました。
キャラクター名: ${cat.name} (ID: ${catSlug})
アニメーション種別: ${meta.animationLabel} (${meta.animationId}) / 画風: ${styleLabel}

同梱ファイル:
- \`${meta.files.spriteSheet}\`: 透過PNGスプライトシート (${meta.sheetWidth}x${meta.sheetHeight}px, ${meta.cols}列×${meta.rows}行, 全${meta.frameCount}コマ, 1コマ ${meta.frameWidth}x${meta.frameHeight}px)
- \`${meta.files.animatedGif}\`: そのまま <img> で使える透過アニメーションGIF (${meta.fps} FPS / ${meta.playbackMode})
- \`${meta.files.spriteSheet.replace('.png', '.meta.json')}\`: フレーム座標・FPS・アンカー情報入りJSON${
    includeFlipped && flippedPrefix
      ? `\n- \`${flippedPrefix}.png\` / \`${flippedPrefix}.gif\`: 左右反転バージョン`
      : ''
  }

【お願いしたい実装】
1. イベントポップアップや発見図鑑・ヒント表示などのUI箇所では、\`${meta.files.animatedGif}\` を \`<img>\` で手軽に表示して見た目をアップグレードしてください。
2. ゲーム画面内で移動・当たり判定・一時停止・速度同期が必要なキャラクター表示箇所では、\`${meta.files.spriteSheet}\` と \`.meta.json\` を読み込んで ${meta.fps} FPS (${meta.playbackMode}) で再生するスプライトアニメーションコンポーネントを組み込んでください。
3. 基準アンカーは \`anchor: { x: ${meta.anchor.x}, y: ${meta.anchor.y} }\`（${
    meta.anchor.y === 1 ? '足元中央揃え' : '重心中央揃え'
  }）です。
\`\`\`

---

## 参考スニペット（Canvas / React 実装例）

### 1. イベント・図鑑UIで手軽に透過GIFを使う場合
\`\`\`tsx
<img
  src="/assets/cats/${catSlug}/${trial.motionId}/${meta.files.animatedGif}"
  alt="${cat.name} (${meta.animationLabel})"
  width={${meta.frameWidth}}
  height={${meta.frameHeight}}
  style={{ imageRendering: '${trial.pixelArtCrisp ? 'pixelated' : 'auto'}' }}
/>
\`\`\`

### 2. スプライトシート + JSON で精密にアニメ制御する場合（Canvas / React）
\`\`\`tsx
import meta from './${meta.files.spriteSheet.replace('.png', '.meta.json')}';

// 現在のコマ idx (0 .. meta.frameCount - 1) から描画する例:
const frame = meta.frames[idx];
ctx.drawImage(
  spriteSheetImg,
  frame.x,
  frame.y,
  frame.width,
  frame.height,
  drawX - frame.width * meta.anchor.x,
  drawY - frame.height * meta.anchor.y,
  frame.width,
  frame.height
);
\`\`\`
`
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function exportAntigravityZip(params: {
  cat: CatCharacter
  trial: SpriteTrial
  frames: ProcessedFrame[]
  layout: ExportLayout
  includeFlipped: boolean
}): Promise<{ filename: string; promptMarkdown: string }> {
  const { cat, trial, frames, layout, includeFlipped } = params
  const catSlug = sanitizeSlug(cat.slug)
  const basePrefix = `${catSlug}_${trial.motionId}`

  const mainFlip = trial.flipPreviewX
  const composed = composeFinalSheet(
    frames,
    trial.frameWidth,
    trial.frameHeight,
    layout,
    trial.cols,
    mainFlip,
    trial.pixelArtCrisp
  )

  const gif = encodeTransparentGif(
    frames,
    trial.frameWidth,
    trial.frameHeight,
    trial.fps,
    trial.playbackMode,
    mainFlip
  )

  const meta = buildMetaJson({
    cat,
    trial,
    composed,
    layout,
    prefix: basePrefix,
    facingLabel: mainFlip ? `${trial.facing}_flipped` : trial.facing,
  })

  const zip = new JSZip()
  zip.file(`${basePrefix}.png`, dataUrlToBlob(composed.dataUrl))
  zip.file(`${basePrefix}.gif`, gif.blob)
  zip.file(`${basePrefix}.meta.json`, JSON.stringify(meta, null, 2))

  // Individual transparent frames
  const framesFolder = zip.folder('frames')
  const active = frames.filter((f) => f.enabled)
  const list = active.length > 0 ? active : frames
  list.forEach((f, i) => {
    const idxStr = String(i).padStart(2, '0')
    framesFolder?.file(`frame_${idxStr}.png`, dataUrlToBlob(f.dataUrl))
  })

  let flippedPrefix: string | undefined
  if (includeFlipped) {
    flippedPrefix = `${basePrefix}_flipped`
    const flippedComposed = composeFinalSheet(
      frames,
      trial.frameWidth,
      trial.frameHeight,
      layout,
      trial.cols,
      !mainFlip,
      trial.pixelArtCrisp
    )
    const flippedGif = encodeTransparentGif(
      frames,
      trial.frameWidth,
      trial.frameHeight,
      trial.fps,
      trial.playbackMode,
      !mainFlip
    )
    const flippedMeta = buildMetaJson({
      cat,
      trial,
      composed: flippedComposed,
      layout,
      prefix: flippedPrefix,
      facingLabel: !mainFlip ? `${trial.facing}_flipped` : trial.facing,
    })
    zip.file(`${flippedPrefix}.png`, dataUrlToBlob(flippedComposed.dataUrl))
    zip.file(`${flippedPrefix}.gif`, flippedGif.blob)
    zip.file(`${flippedPrefix}.meta.json`, JSON.stringify(flippedMeta, null, 2))
  }

  const promptMarkdown = buildAntigravityPromptMarkdown({
    cat,
    trial,
    meta,
    includeFlipped,
    flippedPrefix,
  })
  zip.file('ANTIGRAVITY_PROMPT.md', promptMarkdown)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const zipFilename = `${basePrefix}_antigravity_pack.zip`
  triggerDownload(zipBlob, zipFilename)

  return { filename: zipFilename, promptMarkdown }
}
