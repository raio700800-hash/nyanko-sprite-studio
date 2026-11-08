import { Check, Copy, Download, FileArchive, Film, Image } from 'lucide-react'
import { useState } from 'react'
import type { ExportLayout, ProcessedFrame, SpriteTrial } from '../types/studio'

interface ExportBarProps {
  trial: SpriteTrial | null
  frames: ProcessedFrame[]
  exportLayout: ExportLayout
  includeFlipped: boolean
  isExporting: boolean
  onChangeLayout: (layout: ExportLayout) => void
  onToggleIncludeFlipped: (val: boolean) => void
  onExportZip: () => Promise<void>
  onDownloadGif: () => void
  onDownloadPng: () => void
  onCopyAntigravityPrompt: () => Promise<void>
}

export function ExportBar({
  trial,
  frames,
  exportLayout,
  includeFlipped,
  isExporting,
  onChangeLayout,
  onToggleIncludeFlipped,
  onExportZip,
  onDownloadGif,
  onDownloadPng,
  onCopyAntigravityPrompt,
}: ExportBarProps) {
  const [copied, setCopied] = useState(false)

  if (!trial || frames.length === 0) {
    return null
  }

  const activeCount = frames.filter((f) => f.enabled).length || frames.length
  const outCols =
    exportLayout === 'strip'
      ? activeCount
      : Math.min(trial.cols, activeCount)
  const outRows =
    exportLayout === 'strip'
      ? 1
      : Math.max(1, Math.ceil(activeCount / outCols))
  const sheetW = outCols * trial.frameWidth
  const sheetH = outRows * trial.frameHeight

  const handleCopyPrompt = async () => {
    await onCopyAntigravityPrompt()
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <footer className="export-bar">
      <div className="export-options">
        <div className="export-spec">
          <strong>Antigravity 2.0 連携書き出し</strong>
          <span className="mono spec-detail">
            {activeCount}コマ · 1コマ {trial.frameWidth}×{trial.frameHeight}px ·
            シート {sheetW}×{sheetH}px ({outCols}×{outRows}) · {trial.fps} FPS
          </span>
        </div>

        <div className="export-toggles">
          <div className="segmented-row compact">
            <button
              type="button"
              className={`seg-btn ${exportLayout === 'grid' ? 'active' : ''}`}
              onClick={() => onChangeLayout('grid')}
            >
              グリッド配列
            </button>
            <button
              type="button"
              className={`seg-btn ${exportLayout === 'strip' ? 'active' : ''}`}
              onClick={() => onChangeLayout('strip')}
            >
              横1列ストリップ
            </button>
          </div>

          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={includeFlipped}
              onChange={(e) => onToggleIncludeFlipped(e.target.checked)}
            />
            <span>左右反転ペアも同梱</span>
          </label>
        </div>
      </div>

      <div className="export-buttons">
        <button
          id="btn-copy-antigravity"
          type="button"
          className="btn btn-outline"
          onClick={() => void handleCopyPrompt()}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          <span>{copied ? '指示プロンプトをコピー済' : 'Antigravity指示をコピー'}</span>
        </button>

        <button
          id="btn-download-png"
          type="button"
          className="btn btn-outline"
          onClick={onDownloadPng}
        >
          <Image size={15} />
          <span>透過PNGシート</span>
        </button>

        <button
          id="btn-download-gif"
          type="button"
          className="btn btn-secondary"
          onClick={onDownloadGif}
        >
          <Film size={15} />
          <span>透過GIF保存</span>
        </button>

        <button
          id="btn-export-zip"
          type="button"
          className="btn btn-primary"
          onClick={() => void onExportZip()}
          disabled={isExporting}
        >
          <FileArchive size={16} />
          <Download size={14} />
          <span>{isExporting ? 'ZIP作成中...' : '全部入りZIPを書き出し'}</span>
        </button>
      </div>
    </footer>
  )
}
