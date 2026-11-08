import type {
  AspectPresetId,
  FacingDirection,
  ModelCatalogItem,
  MotionPresetId,
  StylePresetId,
} from '../types/studio'

export interface MotionPreset {
  id: MotionPresetId
  labelJa: string
  shortJa: string
  descriptionJa: string
  recommendedFps: number
  recommendedAspect: AspectPresetId
  playbackMode: 'loop' | 'ping-pong' | 'once'
  cycleDescriptionEn: string
  frameProgressionHints: string[]
}

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: 'walk',
    labelJa: '歩き（パトロール）',
    shortJa: '歩き',
    descriptionJa: '部屋の中をトコトコ歩く自然なサイクル',
    recommendedFps: 9,
    recommendedAspect: '4:3',
    playbackMode: 'loop',
    cycleDescriptionEn: 'smooth seamless walking cycle',
    frameProgressionHints: [
      'left front paw stepping forward, tail raised gently',
      'contact pose, weight shifting onto front paw',
      'passing stride, rear leg swinging forward',
      'mid-stride push-off, body slightly lifted',
      'right front paw extending forward',
      'front paw landing, soft bounce in ears and collar',
      'opposite rear leg pushing off smoothly',
      'return transition back toward first stride pose',
    ],
  },
  {
    id: 'run',
    labelJa: '走り（ダッシュ・逃走）',
    shortJa: '走り',
    descriptionJa: '見つかりそうになって勢いよく駆け抜ける動き',
    recommendedFps: 13,
    recommendedAspect: '4:3',
    playbackMode: 'loop',
    cycleDescriptionEn: 'energetic fast galloping run cycle',
    frameProgressionHints: [
      'leaping forward with front legs stretched out',
      'airborne full extension, tail streaming behind',
      'front paws touching down, spine curving',
      'coiled gathered crouch with all four paws tucked under body',
      'explosive rear leg push-off launching forward',
      'mid-air stretch with ears slightly swept back',
      'landing absorption pose, dynamic motion blur-free crisp lines',
      'recoiling spring pose ready to loop',
    ],
  },
  {
    id: 'idle',
    labelJa: '待機（しっぽ揺れ・まばたき）',
    shortJa: '待機',
    descriptionJa: '発見待ちや会話画面で可愛く揺れる基本モーション',
    recommendedFps: 6,
    recommendedAspect: '1:1',
    playbackMode: 'ping-pong',
    cycleDescriptionEn: 'gentle cute idle breathing and tail-swaying animation',
    frameProgressionHints: [
      'calm relaxed stance, tail curled slightly to one side',
      'soft chest breathing inhale, ears twitching slightly',
      'eyes half-blinking happily, tail swaying to center',
      'eyes closed in cute blink, head tilting 5 degrees',
      'eyes opening brightly, tail swinging to opposite side',
      'subtle playful head bob and whisker bounce',
      'tail curving gracefully back, ear perked',
      'settling smoothly back to relaxed starting stance',
    ],
  },
  {
    id: 'angry',
    labelJa: '怒り（威嚇・シャーッ）',
    shortJa: '怒り',
    descriptionJa: '背中を丸めて毛を逆立てるイベント演出向けアクション',
    recommendedFps: 10,
    recommendedAspect: '1:1',
    playbackMode: 'ping-pong',
    cycleDescriptionEn: 'feisty angry cat hissing with arched back and puffed fur',
    frameProgressionHints: [
      'annoyed narrowed eyes, ears flattening backward',
      'back arching upward, fur beginning to puff',
      'full arched back, bottle-brush puffed tail, mouth open hissing',
      'swiping one front paw forward with angry expression',
      'leaning back fiercely, tiny comic anger mark near forehead',
      'fierce hiss peak with whiskers bristled',
      'lowering slightly in tense defensive crouch',
      'growling glare returning toward initial angry stance',
    ],
  },
  {
    id: 'happy',
    labelJa: '喜び（発見・ごきげん）',
    shortJa: '喜び',
    descriptionJa: '猫を見つけた瞬間やアイテム獲得時の嬉しいリアクション',
    recommendedFps: 10,
    recommendedAspect: '1:1',
    playbackMode: 'loop',
    cycleDescriptionEn: 'joyful celebratory bounce with happy sparkles and tail wiggle',
    frameProgressionHints: [
      'perky upright stance with bright sparkling eyes',
      'crouching slightly before a happy hop',
      'cheerful upward hop with paws lifted and happy smile',
      'peak of joyful bounce with floating cute sparkle/heart accent',
      'landing softly with tail wagging in excitement',
      'playful chest puff and happy winking expression',
      'tilting head sweetly with paws kneading happily',
      'returning cleanly to cheerful starting pose',
    ],
  },
  {
    id: 'surprised',
    labelJa: '驚き（びっくりジャンプ）',
    shortJa: '驚き',
    descriptionJa: '物陰から見つかった時のビクッとするリアクション',
    recommendedFps: 12,
    recommendedAspect: '3:4',
    playbackMode: 'once',
    cycleDescriptionEn: 'comical startled cat jump reaction from crouch to mid-air gasp',
    frameProgressionHints: [
      'calm curious glance before noticing player',
      'wide startled eyes, ears shooting straight up',
      'quick compression squash into floor',
      'high vertical startled leap, paws splayed, fur bristled',
      'peak hang-time in mid-air with wide comical expression',
      'descending with tail fluffed straight',
      'soft landing with legs braced',
      'catching breath with big wide-eyed look',
    ],
  },
  {
    id: 'sit',
    labelJa: 'お座り（毛づくろい・首かしげ）',
    shortJa: 'お座り',
    descriptionJa: '家具の上や畳でちょこんと座って可愛く動く様子',
    recommendedFps: 7,
    recommendedAspect: '3:4',
    playbackMode: 'ping-pong',
    cycleDescriptionEn: 'cute sitting cat grooming paw and tilting head',
    frameProgressionHints: [
      'neat upright sitting pose with tail wrapped around paws',
      'lifting one front paw toward cheek',
      'licking/grooming front paw gently with closed eyes',
      'rubbing ear softly with lifted paw',
      'lowering paw back down gracefully',
      'tilting head curiously to the side',
      'flicking tail tip gently behind',
      'returning to neat calm sitting posture',
    ],
  },
  {
    id: 'sleep',
    labelJa: '睡眠（まるまり・すやすや）',
    shortJa: '寝る',
    descriptionJa: 'クッションやこたつで丸くなって寝息を立てる表現',
    recommendedFps: 5,
    recommendedAspect: '4:3',
    playbackMode: 'ping-pong',
    cycleDescriptionEn: 'cozy sleeping cat curled in a ball with gentle breathing motion',
    frameProgressionHints: [
      'curled comfortably in a cozy loaf/ball, eyes peacefully shut',
      'slow gentle ribcage inhale expansion',
      'deep peaceful breath, tiny ear twitch',
      'soft exhale settle, tail tip curling slightly',
      'cozy snuggle shift into warmer curl',
      'subtle dreamy whisker twitch',
      'slow deep sleeping breath rise',
      'resting calmly back at initial curled pose',
    ],
  },
  {
    id: 'peek',
    labelJa: 'チラ見（物陰からひょっこり）',
    shortJa: 'チラ見',
    descriptionJa: '脱出ゲームの棚やカーテンの隙間から様子を伺う仕草',
    recommendedFps: 8,
    recommendedAspect: '1:1',
    playbackMode: 'ping-pong',
    cycleDescriptionEn: 'curious cat peeking out sideways and ducking back cautiously',
    frameProgressionHints: [
      'tucked low in cautious crouching hide pose',
      'ears and eyes peeking up slowly',
      'leaning head sideways cautiously to peek',
      'full curious peek forward with wide watchful eyes',
      'tilting head while scanning left and right',
      'ear twitching at a sound',
      'pulling head slightly back into cover',
      'returning into low sneaky crouch',
    ],
  },
  {
    id: 'custom',
    labelJa: 'カスタム演出（プロンプト自由入力）',
    shortJa: '自由演出',
    descriptionJa: '下のプロンプト窓に書いた動き・演出のみで生成',
    recommendedFps: 10,
    recommendedAspect: '1:1',
    playbackMode: 'loop',
    cycleDescriptionEn: 'expressive custom animated action sequence',
    frameProgressionHints: [],
  },
]

export interface StylePreset {
  id: StylePresetId
  labelJa: string
  shortJa: string
  promptEn: string
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'original',
    labelJa: '元の画風を厳密維持',
    shortJa: '元画風',
    promptEn:
      'strictly preserve the exact illustration style, line weight, color palette, cel shading, and proportions of the reference character',
  },
  {
    id: 'pixel16',
    labelJa: 'ドット絵風（16-bit）',
    shortJa: 'ドット絵',
    promptEn:
      'crisp 16-bit retro pixel art sprite style, clean pixel clusters, limited vibrant palette, distinct dark pixel outline, no anti-aliasing blur, keeping the exact character design and markings',
  },
  {
    id: 'anime2d',
    labelJa: '2Dアニメ・くっきり主線',
    shortJa: '2Dアニメ',
    promptEn:
      'clean crisp 2D Japanese anime game art style, bold smooth lineart, vibrant flat cel shading, keeping exact character colors and markings',
  },
  {
    id: 'chibi',
    labelJa: 'ちび・デフォルメ風',
    shortJa: 'ちびキャラ',
    promptEn:
      'super-deformed cute chibi 2-head-tall game mascot proportions, extra expressive round face and tiny paws, keeping the exact fur pattern, eyes, and collar from reference',
  },
  {
    id: 'watercolor',
    labelJa: '水彩・絵本風',
    shortJa: '絵本・水彩',
    promptEn:
      'warm soft storybook watercolor illustration style with gentle hand-drawn ink outlines and cozy pastel shading, keeping the exact character features',
  },
]

export const FACING_OPTIONS: { id: FacingDirection; labelJa: string; promptEn: string }[] = [
  { id: 'right', labelJa: '右向き（横）', promptEn: 'facing right in side profile view' },
  { id: 'left', labelJa: '左向き（横）', promptEn: 'facing left in side profile view' },
  { id: 'front', labelJa: '正面（3/4・前）', promptEn: 'facing front toward the camera' },
  { id: 'back', labelJa: '背面（後ろ姿）', promptEn: 'seen from back / three-quarter rear view' },
]

export const ASPECT_PRESETS: { id: AspectPresetId; labelJa: string; ratio: number }[] = [
  { id: '1:1', labelJa: '1:1（正方形）', ratio: 1 },
  { id: '4:3', labelJa: '4:3（横長・四足歩行向け）', ratio: 4 / 3 },
  { id: '3:4', labelJa: '3:4（縦長・お座り/立ち向け）', ratio: 3 / 4 },
  { id: '16:9', labelJa: '16:9（ワイド演出）', ratio: 16 / 9 },
  { id: '9:16', labelJa: '9:16（縦長演出）', ratio: 9 / 16 },
  { id: 'custom', labelJa: 'カスタム比率', ratio: 1 },
]

export const FRAME_SIZE_PRESETS = [64, 128, 256, 384, 512] as const

export const MODEL_CATALOG: ModelCatalogItem[] = [
  {
    provider: 'openrouter',
    id: 'black-forest-labs/flux-3-image-klein',
    label: 'FLUX 3 Image Klein（試行錯誤最安）',
    approxCostJa: '約1.4円 / 回 ($0.009)',
    badge: '最安・爆速',
    note: '4〜16コマの試行錯誤・大量テストに最適',
  },
  {
    provider: 'openrouter',
    id: 'openai/gpt-image-1-mini',
    label: 'GPT Image 1 Mini（軽量低価格）',
    approxCostJa: '約1.5〜2.5円 / 回',
    badge: 'コスパ',
    note: 'テキスト指示の理解が安定',
  },
  {
    provider: 'openrouter',
    id: 'google/gemini-3.1-flash-lite-image',
    label: 'Nano Banana 2 Lite（キャラ固定◎）',
    approxCostJa: '約5円 / 回 ($0.034)',
    badge: 'キャラ固定バランス',
    note: '3面図の模様・首輪などの忠実度が高い',
  },
  {
    provider: 'openrouter',
    id: 'bytedance-seed/seedream-4.5',
    label: 'Seedream 4.5（定額高品質）',
    approxCostJa: '約6円 / 回 ($0.04)',
    badge: '安定定額',
    note: 'キャラクター維持とクリーンな背景が得意',
  },
  {
    provider: 'openrouter',
    id: 'google/gemini-3.1-flash-image',
    label: 'Nano Banana 2（本番仕上げ向け）',
    approxCostJa: '約10円 / 回 ($0.067)',
    badge: '本番推奨',
    note: '複雑な動きや日本語ニュアンス反映に強い',
  },
  {
    provider: 'openrouter',
    id: 'black-forest-labs/flux-3-image',
    label: 'FLUX 3 Image（高精細本番）',
    approxCostJa: '約6〜10円 / 回',
    badge: '高精細',
    note: '細部まで破綻しにくいフラッグシップ',
  },
  {
    provider: 'gemini',
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini Direct: Nano Banana 2 Lite',
    approxCostJa: '約5円 / 回 ($0.034)',
    badge: 'Google直結',
    note: 'Google AI Studioキーで直接実行',
  },
  {
    provider: 'gemini',
    id: 'gemini-3.1-flash-image',
    label: 'Gemini Direct: Nano Banana 2',
    approxCostJa: '約10円 / 回 ($0.067)',
    badge: '高精度',
    note: '本番用の高品質キャラ固定シートに最適',
  },
  {
    provider: 'gemini',
    id: 'gemini-2.5-flash-image',
    label: 'Gemini Direct: Gemini 2.5 Flash Image',
    approxCostJa: '約6円 / 回 ($0.039)',
    badge: '定番',
    note: '参照画像の整合性が高い標準モデル',
  },
  {
    provider: 'fal',
    id: 'blackforestlabs/flux-3/edit-image',
    label: 'fal.ai: FLUX 3 Edit Image',
    approxCostJa: '約7円 / 回 ($0.048)',
    badge: '高速推論',
    note: 'fal.ai キーで利用',
  },
  {
    provider: 'fal',
    id: 'fal-ai/qwen-image-edit-2511',
    label: 'fal.ai: Qwen Image Edit 2511',
    approxCostJa: '約3〜5円 / 回',
    badge: 'ポーズ編集◎',
    note: 'ポーズや角度変更の指示に強い編集モデル',
  },
]

const AI_SUPPORTED_RATIOS: { label: string; value: number }[] = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
]

export interface GridPlan {
  cols: number
  rows: number
  aiAspectRatio: string
}

/**
 * Picks a grid (cols x rows) for 4..16 frames that stays well-proportioned
 * with the requested single-frame aspect ratio and matches an AI-supported sheet ratio.
 */
export function computeGridLayout(frameCount: number, frameW: number, frameH: number): GridPlan {
  const count = Math.max(4, Math.min(16, Math.round(frameCount)))
  const frameRatio = frameW / Math.max(1, frameH)

  let best: { cols: number; rows: number; score: number; aiAspectRatio: string } | null = null

  for (let cols = 2; cols <= Math.min(8, count); cols++) {
    const rows = Math.ceil(count / cols)
    const emptySlots = cols * rows - count
    if (emptySlots > cols - 1) continue

    const sheetRatio = (cols * frameRatio) / rows
    // Prefer compact grids and ratios close to a supported AI aspect ratio
    let nearest = AI_SUPPORTED_RATIOS[0]
    let minRatioDiff = Infinity
    for (const r of AI_SUPPORTED_RATIOS) {
      const diff = Math.abs(Math.log(sheetRatio / r.value))
      if (diff < minRatioDiff) {
        minRatioDiff = diff
        nearest = r
      }
    }

    const portraitPenalty =
      frameRatio >= 0.7 && cols < rows ? 0.95 : cols < rows ? 0.2 : 0
    const score = minRatioDiff * 1.1 + emptySlots * 0.65 + portraitPenalty + (cols >= 7 ? 0.45 : 0)
    if (!best || score < best.score) {
      best = { cols, rows, score, aiAspectRatio: nearest.label }
    }
  }

  return best
    ? { cols: best.cols, rows: best.rows, aiAspectRatio: best.aiAspectRatio }
    : { cols: 4, rows: Math.ceil(count / 4), aiAspectRatio: '16:9' }
}

export function computeFrameDimensions(
  aspectPreset: AspectPresetId,
  baseSize: number,
  customW?: number,
  customH?: number
): { width: number; height: number } {
  const size = Math.max(32, Math.min(1024, Math.round(baseSize)))
  if (aspectPreset === 'custom' && customW && customH) {
    return {
      width: Math.max(32, Math.min(1024, Math.round(customW))),
      height: Math.max(32, Math.min(1024, Math.round(customH))),
    }
  }
  switch (aspectPreset) {
    case '4:3':
      return { width: size, height: Math.round((size * 3) / 4) }
    case '3:4':
      return { width: Math.round((size * 3) / 4), height: size }
    case '16:9':
      return { width: size, height: Math.round((size * 9) / 16) }
    case '9:16':
      return { width: Math.round((size * 9) / 16), height: size }
    case '1:1':
    default:
      return { width: size, height: size }
  }
}

const JA_TO_EN_HINTS: [RegExp, string][] = [
  [/しっぽ|尻尾/g, 'expressive tail'],
  [/逆立|毛羽立/g, 'puffed bristled fur'],
  [/稲妻|雷/g, 'comic red lightning bolt effect'],
  [/怒りマーク|ぷんすか|血管/g, 'comic anger vein symbol'],
  [/キラキラ|輝き|光/g, 'cute sparkling stars around character'],
  [/ハート/g, 'floating cute hearts'],
  [/汗|あせ|焦/g, 'comic sweat drop'],
  [/驚|びっくり|！/g, 'exclamation mark surprise accent'],
  [/ジャンプ|跳/g, 'dynamic mid-air jump'],
  [/こたつ|布団/g, 'cozy crouch'],
  [/回転|回/g, 'playful spin motion'],
  [/速|ダッシュ/g, 'fast energetic motion'],
  [/ゆっくり|のんびり/g, 'gentle relaxed tempo'],
  [/涙|泣/g, 'teardrop comic emotion'],
  [/舌|ぺろ/g, 'tiny cute pink tongue sticking out'],
  [/鈴/g, 'golden collar bell jingling'],
  [/後ずさり/g, 'stepping backward cautiously'],
  [/威嚇|シャー/g, 'hissing defensively with arched back'],
  [/まばたき|ウインク/g, 'cute blinking/winking eyes'],
]

export function fallbackTranslateJaToEn(jaText: string): string {
  if (!jaText.trim()) return ''
  const matched: string[] = []
  for (const [pattern, en] of JA_TO_EN_HINTS) {
    if (pattern.test(jaText)) matched.push(en)
  }
  // If user already typed mostly ASCII/English, keep it directly
  const asciiRatio = (jaText.match(/[\x20-\x7E]/g)?.length || 0) / Math.max(1, jaText.length)
  if (asciiRatio > 0.7) return jaText.trim()
  if (matched.length > 0) {
    return `${matched.join(', ')} (${jaText.trim()})`
  }
  return jaText.trim()
}

export function buildSpritePrompt(params: {
  motionId: MotionPresetId
  styleId: StylePresetId
  facing: FacingDirection
  frameCount: number
  cols: number
  rows: number
  characterTraits: string
  customPromptEn: string
}): string {
  const motion = MOTION_PRESETS.find((m) => m.id === params.motionId) || MOTION_PRESETS[0]
  const style = STYLE_PRESETS.find((s) => s.id === params.styleId) || STYLE_PRESETS[0]
  const facing = FACING_OPTIONS.find((f) => f.id === params.facing) || FACING_OPTIONS[0]

  const poseList: string[] = []
  if (motion.frameProgressionHints.length > 0) {
    for (let i = 0; i < params.frameCount; i++) {
      const hintIdx = Math.floor((i * motion.frameProgressionHints.length) / params.frameCount)
      poseList.push(`Frame ${i + 1}: ${motion.frameProgressionHints[hintIdx]}`)
    }
  }

  const traitsClause = params.characterTraits.trim()
    ? `Important character details to keep 100% consistent in every frame: ${params.characterTraits.trim()}.`
    : 'Keep every fur pattern, ear marking, eye color, collar, and body proportion 100% identical to the three-view reference sheet.'

  const extraAction = params.customPromptEn.trim()
    ? `Additional action & visual effects: ${params.customPromptEn.trim()}.`
    : ''

  const emptyCells = params.cols * params.rows - params.frameCount
  const emptyClause =
    emptyCells > 0
      ? `Fill the first ${params.frameCount} cells (left-to-right, top-to-bottom) and leave the remaining ${emptyCells} trailing cell(s) completely blank solid white.`
      : ''

  return [
    `Create a clean 2D game animation sprite sheet using the attached three-view character turnaround image as the strict character reference.`,
    `Layout: an exact evenly spaced ${params.cols} columns by ${params.rows} rows grid (${params.frameCount} sequential animation frames total, ordered left-to-right, top-to-bottom). ${emptyClause}`,
    `Action: ${motion.cycleDescriptionEn}, ${facing.promptEn}. ${extraAction}`,
    poseList.length > 0 ? `Pose progression across frames -> ${poseList.join('; ')}.` : '',
    `Style: ${style.promptEn}.`,
    traitsClause,
    `Strict formatting rules: Each frame must show the complete full-body character centered inside its invisible cell with generous white padding so frames never touch or overlap. Maintain uniform character scale and consistent ground baseline across all frames. Pure solid flat white #FFFFFF background, NO grid lines, NO borders, NO panel boxes, NO numbers, NO text labels, NO cast floor shadows.`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildSingleFrameRerollPrompt(params: {
  frameIndex: number
  totalFrames: number
  motionId: MotionPresetId
  styleId: StylePresetId
  facing: FacingDirection
  characterTraits: string
  customPromptEn: string
}): string {
  const motion = MOTION_PRESETS.find((m) => m.id === params.motionId) || MOTION_PRESETS[0]
  const style = STYLE_PRESETS.find((s) => s.id === params.styleId) || STYLE_PRESETS[0]
  const facing = FACING_OPTIONS.find((f) => f.id === params.facing) || FACING_OPTIONS[0]

  const hintIdx =
    motion.frameProgressionHints.length > 0
      ? Math.floor((params.frameIndex * motion.frameProgressionHints.length) / params.totalFrames)
      : 0
  const specificPose =
    motion.frameProgressionHints[hintIdx] || `frame ${params.frameIndex + 1} of ${params.totalFrames} of ${motion.cycleDescriptionEn}`

  return [
    `Generate ONE SINGLE animation frame (not a grid) of the exact character shown in the reference three-view sheet.`,
    `This single frame represents pose ${params.frameIndex + 1} of ${params.totalFrames} in a ${motion.cycleDescriptionEn}, ${facing.promptEn}: ${specificPose}.`,
    params.customPromptEn.trim() ? `Visual effects / extra direction: ${params.customPromptEn.trim()}.` : '',
    `Style: ${style.promptEn}.`,
    params.characterTraits.trim() ? `Character features: ${params.characterTraits.trim()}.` : '',
    `Centered full-body character with generous white margin, pure solid flat white #FFFFFF background, NO text, NO borders, NO shadows.`,
  ]
    .filter(Boolean)
    .join(' ')
}
