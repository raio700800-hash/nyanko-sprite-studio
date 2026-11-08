import {
  Check,
  ClipboardPaste,
  Copy,
  ImagePlus,
  Languages,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react'
import { useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react'
import {
  ASPECT_PRESETS,
  FACING_OPTIONS,
  FRAME_SIZE_PRESETS,
  MODEL_CATALOG,
  MOTION_PRESETS,
  STYLE_PRESETS,
} from '../data/presets'
import { fileToDataUrl } from '../lib/storage'
import type {
  ApiSettings,
  AspectPresetId,
  CatCharacter,
  FacingDirection,
  MotionPresetId,
  StylePresetId,
} from '../types/studio'

export interface ComposerState {
  motionId: MotionPresetId
  styleId: StylePresetId
  facing: FacingDirection
  frameCount: number
  aspectPreset: AspectPresetId
  frameBaseSize: number
  customW: number
  customH: number
  promptJa: string
  promptEnOverride: string
  usePromptOverride: boolean
}

interface ComposerPanelProps {
  cat: CatCharacter | null
  composer: ComposerState
  computedGrid: { cols: number; rows: number; aiAspectRatio: string }
  computedFrameSize: { width: number; height: number }
  builtPromptEn: string
  apiSettings: ApiSettings
  isGenerating: boolean
  isTranslating: boolean
  generateError: string
  onUpdateComposer: (patch: Partial<ComposerState>) => void
  onUploadMaster: (dataUrl: string, filename?: string) => Promise<void>
  onUpdateCatTraits: (traits: string) => void
  onTranslatePrompt: () => Promise<void>
  onGenerateViaApi: () => Promise<void>
  onImportManualSheet: (dataUrl: string) => Promise<void>
  onChangeModelShortcut: (modelId: string) => void
}

export function ComposerPanel({
  cat,
  composer,
  computedGrid,
  computedFrameSize,
  builtPromptEn,
  apiSettings,
  isGenerating,
  isTranslating,
  generateError,
  onUpdateComposer,
  onUploadMaster,
  onUpdateCatTraits,
  onTranslatePrompt,
  onGenerateViaApi,
  onImportManualSheet,
  onChangeModelShortcut,
}: ComposerPanelProps) {
  const [execTab, setExecTab] = useState<'api' | 'manual'>('api')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showFullPrompt, setShowFullPrompt] = useState(false)
  const [dragTarget, setDragTarget] = useState<'master' | 'manual' | null>(null)

  const providerModels = MODEL_CATALOG.filter((m) => m.provider === apiSettings.provider)
  const effectivePrompt = composer.usePromptOverride
    ? composer.promptEnOverride
    : builtPromptEn

  const handleMasterFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await onUploadMaster(dataUrl, file.name)
    e.target.value = ''
  }

  const handleManualFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await onImportManualSheet(dataUrl)
    e.target.value = ''
  }

  const handleDrop = async (target: 'master' | 'manual', e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragTarget(null)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await fileToDataUrl(file)
    if (target === 'master') {
      await onUploadMaster(dataUrl, file.name)
    } else {
      await onImportManualSheet(dataUrl)
    }
  }

  const handleManualPaste = async (e: ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imgItem = items.find((it) => it.type.startsWith('image/'))
    if (!imgItem) return
    const file = imgItem.getAsFile()
    if (!file) return
    e.preventDefault()
    const dataUrl = await fileToDataUrl(file)
    await onImportManualSheet(dataUrl)
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(effectivePrompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  return (
    <aside className="composer-panel">
      {/* STEP 1: Master 3-View */}
      <section className="panel-card">
        <div className="section-head">
          <span className="step-num">STEP 1</span>
          <h2>3面図 Master（キャラ固定基準）</h2>
        </div>

        <label
          className={`master-dropzone ${dragTarget === 'master' ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragTarget('master')
          }}
          onDragLeave={() => setDragTarget(null)}
          onDrop={(e) => void handleDrop('master', e)}
        >
          {cat?.masterImageDataUrl ? (
            <div className="master-preview-wrap">
              <img
                src={cat.masterImageDataUrl}
                alt="3面図Master"
                className="master-preview-img"
              />
              <div className="master-replace-pill">
                <Upload size={13} />
                <span>クリックまたはドロップで差替</span>
              </div>
            </div>
          ) : (
            <div className="drop-empty">
              <ImagePlus size={24} />
              <strong>完成済みの3面図画像をドロップ</strong>
              <span>別アプリで作成した正面・横・背面の3面図を選択</span>
            </div>
          )}
          <input type="file" accept="image/*" hidden onChange={(e) => void handleMasterFile(e)} />
        </label>

        {cat && (
          <div className="field-block">
            <label className="field-sublabel" htmlFor="cat-traits-input">
              キャラ特徴メモ（模様・首輪などの固定補助）
            </label>
            <input
              id="cat-traits-input"
              type="text"
              className="text-input"
              placeholder="例: 白地にオレンジと黒の三毛模様、赤い首輪と金の鈴"
              value={cat.traits}
              onChange={(e) => onUpdateCatTraits(e.target.value)}
            />
          </div>
        )}
      </section>

      {/* STEP 2: Motion + Style + Prompt */}
      <section className="panel-card">
        <div className="section-head">
          <span className="step-num">STEP 2</span>
          <h2>動き・画風・演出プロンプト</h2>
        </div>

        <label className="field-sublabel">モーションプリセット</label>
        <div className="chip-grid motion-grid">
          {MOTION_PRESETS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`choice-chip ${composer.motionId === m.id ? 'active' : ''}`}
              onClick={() =>
                onUpdateComposer({
                  motionId: m.id,
                  aspectPreset: m.recommendedAspect,
                })
              }
              title={m.descriptionJa}
            >
              {m.shortJa}
            </button>
          ))}
        </div>

        <div className="field-block">
          <label className="field-sublabel">キャラクターの向き</label>
          <div className="segmented-row compact">
            {FACING_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`seg-btn ${composer.facing === f.id ? 'active' : ''}`}
                onClick={() => onUpdateComposer({ facing: f.id })}
              >
                {f.labelJa}
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <label className="field-sublabel">画風変換プリセット</label>
          <div className="chip-grid style-grid">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`choice-chip ${composer.styleId === s.id ? 'active' : ''}`}
                onClick={() => onUpdateComposer({ styleId: s.id })}
              >
                {s.shortJa}
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <div className="label-row">
            <label className="field-sublabel" htmlFor="prompt-ja-input">
              凝った演出用プロンプト窓（日本語OK）
            </label>
            <button
              type="button"
              className="text-link-btn"
              onClick={() => void onTranslatePrompt()}
              disabled={isTranslating || !composer.promptJa.trim()}
            >
              <Languages size={13} />
              <span>{isTranslating ? '変換中...' : '英語に最適化'}</span>
            </button>
          </div>
          <textarea
            id="prompt-ja-input"
            className="text-area"
            rows={3}
            placeholder="例: 背中を丸めて毛を逆立て、赤い稲妻と怒りマークを出して威嚇する"
            value={composer.promptJa}
            onChange={(e) => onUpdateComposer({ promptJa: e.target.value })}
          />
          <div className="prompt-tools-row">
            <button
              type="button"
              className="text-link-btn"
              onClick={() => setShowFullPrompt((v) => !v)}
            >
              <span>{showFullPrompt ? 'AI送信プロンプトを隠す' : 'AI送信プロンプト(英語)を確認/編集'}</span>
            </button>
            {composer.usePromptOverride && (
              <button
                type="button"
                className="text-link-btn"
                onClick={() => onUpdateComposer({ usePromptOverride: false })}
              >
                <span>自動生成に戻す</span>
              </button>
            )}
          </div>

          {showFullPrompt && (
            <textarea
              id="prompt-en-override"
              className="text-area mono small-area"
              rows={6}
              value={effectivePrompt}
              onChange={(e) =>
                onUpdateComposer({
                  usePromptOverride: true,
                  promptEnOverride: e.target.value,
                })
              }
            />
          )}
        </div>
      </section>

      {/* STEP 3: Frame Count + Aspect + Size */}
      <section className="panel-card">
        <div className="section-head">
          <span className="step-num">STEP 3</span>
          <h2>コマ数（4〜16）・比率・サイズ</h2>
        </div>

        <div className="field-block">
          <div className="label-row">
            <label className="field-sublabel" htmlFor="frame-count-slider">
              スプライト枚数：<strong>{composer.frameCount} コマ</strong>
            </label>
            <span className="layout-pill mono">
              {computedGrid.cols}×{computedGrid.rows} (AI比 {computedGrid.aiAspectRatio})
            </span>
          </div>
          <input
            id="frame-count-slider"
            type="range"
            min={4}
            max={16}
            step={1}
            value={composer.frameCount}
            onChange={(e) => onUpdateComposer({ frameCount: Number(e.target.value) })}
          />
          <div className="quick-num-row">
            {[4, 6, 8, 9, 12, 16].map((n) => (
              <button
                key={n}
                type="button"
                className={`mini-pill ${composer.frameCount === n ? 'active' : ''}`}
                onClick={() => onUpdateComposer({ frameCount: n })}
              >
                {n}枚
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <label className="field-sublabel">1コマのアスペクト比プリセット</label>
          <div className="chip-grid aspect-grid">
            {ASPECT_PRESETS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`choice-chip ${composer.aspectPreset === a.id ? 'active' : ''}`}
                onClick={() => onUpdateComposer({ aspectPreset: a.id })}
              >
                {a.id === 'custom' ? '自由' : a.id}
              </button>
            ))}
          </div>
        </div>

        {composer.aspectPreset === 'custom' ? (
          <div className="inline-two-col">
            <div>
              <label className="field-sublabel">1コマ幅 (px)</label>
              <input
                type="number"
                min={32}
                max={1024}
                className="text-input mono"
                value={composer.customW}
                onChange={(e) => onUpdateComposer({ customW: Number(e.target.value) || 128 })}
              />
            </div>
            <div>
              <label className="field-sublabel">1コマ高さ (px)</label>
              <input
                type="number"
                min={32}
                max={1024}
                className="text-input mono"
                value={composer.customH}
                onChange={(e) => onUpdateComposer({ customH: Number(e.target.value) || 128 })}
              />
            </div>
          </div>
        ) : (
          <div className="field-block">
            <div className="label-row">
              <label className="field-sublabel">1コマの出力サイズ</label>
              <span className="mono size-readout">
                {computedFrameSize.width} × {computedFrameSize.height} px
              </span>
            </div>
            <div className="quick-num-row">
              {FRAME_SIZE_PRESETS.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`mini-pill ${composer.frameBaseSize === sz ? 'active' : ''}`}
                  onClick={() => onUpdateComposer({ frameBaseSize: sz })}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* STEP 4: Generate or 0-yen Manual */}
      <section className="panel-card exec-card">
        <div className="exec-tabs">
          <button
            id="tab-exec-api"
            type="button"
            className={`exec-tab ${execTab === 'api' ? 'active' : ''}`}
            onClick={() => setExecTab('api')}
          >
            <Wand2 size={15} />
            <span>格安API生成</span>
          </button>
          <button
            id="tab-exec-manual"
            type="button"
            className={`exec-tab ${execTab === 'manual' ? 'active' : ''}`}
            onClick={() => setExecTab('manual')}
          >
            <ClipboardPaste size={15} />
            <span>0円手動連携</span>
          </button>
        </div>

        {execTab === 'api' ? (
          <div className="exec-body">
            <div>
              <label className="field-sublabel" htmlFor="quick-model-select">
                使用モデル（{apiSettings.provider}）
              </label>
              <select
                id="quick-model-select"
                className="text-input"
                value={apiSettings.model}
                onChange={(e) => onChangeModelShortcut(e.target.value)}
              >
                {providerModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.approxCostJa}
                  </option>
                ))}
                {!providerModels.some((m) => m.id === apiSettings.model) && (
                  <option value={apiSettings.model}>{apiSettings.model}</option>
                )}
              </select>
            </div>

            {generateError && <p className="error-text">{generateError}</p>}

            <button
              id="btn-generate-sheet"
              type="button"
              className="btn btn-primary full-width generate-cta"
              onClick={() => void onGenerateViaApi()}
              disabled={isGenerating || !cat?.masterImageDataUrl}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={17} className="spin" />
                  <span>生成＆自動スライス中...</span>
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  <span>スプライトシートを生成する</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="exec-body" onPaste={(e) => void handleManualPaste(e)}>
            <p className="manual-guide">
              <strong>0円で試行錯誤する手順：</strong>
              下の「プロンプトをコピー」を押し、無料の Gemini Webアプリ等に
              <strong>3面図Master画像</strong>と一緒に貼り付けて生成した画像を下にドロップ（または Ctrl/Cmd+V で貼付）してください。
            </p>

            <button
              type="button"
              className="btn btn-outline full-width"
              onClick={() => void handleCopyPrompt()}
            >
              {copiedPrompt ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedPrompt ? 'プロンプトをコピーしました！' : '生成用プロンプトをコピー'}</span>
            </button>

            <label
              className={`manual-dropzone ${dragTarget === 'manual' ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragTarget('manual')
              }}
              onDragLeave={() => setDragTarget(null)}
              onDrop={(e) => void handleDrop('manual', e)}
            >
              <Upload size={20} />
              <strong>外部AIで作ったシート画像をドロップ / 選択</strong>
              <span>この枠内で Cmd+V / Ctrl+V 貼り付けもOK</span>
              <input type="file" accept="image/*" hidden onChange={(e) => void handleManualFile(e)} />
            </label>
          </div>
        )}
      </section>
    </aside>
  )
}
