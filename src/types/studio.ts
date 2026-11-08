export type MotionPresetId =
  | 'walk'
  | 'run'
  | 'idle'
  | 'angry'
  | 'happy'
  | 'surprised'
  | 'sit'
  | 'sleep'
  | 'peek'
  | 'custom'

export type StylePresetId =
  | 'original'
  | 'pixel16'
  | 'anime2d'
  | 'chibi'
  | 'watercolor'

export type FacingDirection = 'right' | 'left' | 'front' | 'back'

export type AspectPresetId = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | 'custom'

export type AlignMode = 'bottom-center' | 'center' | 'none'

export type PlaybackMode = 'loop' | 'ping-pong' | 'once'

export type ExportLayout = 'grid' | 'strip'

export type ProviderId = 'openrouter' | 'gemini' | 'fal'

export interface ChromaSettings {
  enabled: boolean
  mode: 'flood-fill' | 'global'
  keyColor: string // hex e.g. '#ffffff' or 'auto'
  tolerance: number // 0..120
  feather: number // 0..30
  despill: boolean
}

export interface FrameOverride {
  id: string
  sourceIndex: number // original grid cell index 0..frameCount-1
  enabled: boolean
  offsetX: number // -40..40 px
  offsetY: number // -40..40 px
  customDataUrl?: string // optional single-frame re-roll or edited frame
}

export interface CatCharacter {
  id: string
  slug: string // e.g. cat_01_mike
  name: string // e.g. ミケ（茶トラ三毛）
  traits: string // optional visual notes to lock markings/collar
  masterImageDataUrl: string
  roomBgDataUrl?: string
  createdAt: number
  updatedAt: number
}

export interface SpriteTrial {
  id: string
  catId: string
  label: string
  sourceType: 'api' | 'manual' | 'sample'
  provider?: ProviderId
  model?: string
  costUsd?: number | null
  rawSheetDataUrl: string
  motionId: MotionPresetId
  styleId: StylePresetId
  facing: FacingDirection
  frameCount: number // 4..16
  cols: number
  rows: number
  frameWidth: number
  frameHeight: number
  aspectPreset: AspectPresetId
  promptJa: string
  promptEn: string
  fps: number
  playbackMode: PlaybackMode
  chroma: ChromaSettings
  alignMode: AlignMode
  paddingPct: number
  pixelArtCrisp: boolean
  flipPreviewX: boolean
  framesConfig: FrameOverride[]
  createdAt: number
}

export interface ProcessedFrame {
  orderIndex: number
  sourceIndex: number
  enabled: boolean
  canvas: HTMLCanvasElement
  dataUrl: string
}

export interface ApiSettings {
  provider: ProviderId
  model: string
  resolution: '512' | '1K' | '2K'
  openrouterKey: string
  geminiKey: string
  falKey: string
}

export interface ModelCatalogItem {
  provider: ProviderId
  id: string
  label: string
  approxCostJa: string
  badge: string
  note: string
}
