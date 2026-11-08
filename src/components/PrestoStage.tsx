import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  FlipHorizontal,
  Footprints,
  Grid,
  ImagePlus,
  Layers,
  Loader2,
  Pause,
  Pipette,
  Play,
  RefreshCw,
  RotateCcw,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { MOTION_PRESETS } from '../data/presets'
import {
  encodeTransparentGif,
  getPlaybackSequence,
} from '../lib/spriteProcessor'
import { fileToDataUrl } from '../lib/storage'
import type {
  AlignMode,
  CatCharacter,
  PlaybackMode,
  ProcessedFrame,
  SpriteTrial,
} from '../types/studio'

type StageTab = 'presto' | 'frames' | 'chroma'
type StageBgMode = 'checker' | 'light' | 'dark' | 'room'

interface PrestoStageProps {
  cat: CatCharacter | null
  trial: SpriteTrial | null
  trials: SpriteTrial[]
  frames: ProcessedFrame[]
  detectedBgHex: string
  isProcessing: boolean
  rerollingFrameIndex: number | null
  onSelectTrial: (trialId: string) => void
  onDeleteTrial: (trialId: string) => Promise<void>
  onUpdateTrial: (patch: Partial<SpriteTrial>) => void
  onUploadRoomBg: (dataUrl: string) => Promise<void>
  onRerollFrame: (frameOrderIndex: number) => Promise<void>
  onReplaceFrameImage: (frameOrderIndex: number, dataUrl: string) => void
  onLoadSample: () => Promise<void>
}

export function PrestoStage({
  cat,
  trial,
  trials,
  frames,
  detectedBgHex,
  isProcessing,
  rerollingFrameIndex,
  onSelectTrial,
  onDeleteTrial,
  onUpdateTrial,
  onUploadRoomBg,
  onRerollFrame,
  onReplaceFrameImage,
  onLoadSample,
}: PrestoStageProps) {
  const [stageTab, setStageTab] = useState<StageTab>('presto')
  const [bgMode, setBgMode] = useState<StageBgMode>('room')
  const [isPlaying, setIsPlaying] = useState(true)
  const [cursorState, setCursorState] = useState<{ trialId: string | null; value: number }>({
    trialId: null,
    value: 0,
  })
  const [onionSkin, setOnionSkin] = useState(false)
  const [zoom, setZoom] = useState(1.25)
  const [roomCatPos, setRoomCatPos] = useState({ xPct: 62, yPct: 77 })
  const [roomScale, setRoomScale] = useState(0.95)
  const [patrolMode, setPatrolMode] = useState(false)
  const [patrolDir, setPatrolDir] = useState<1 | -1>(1)
  const [eyedropperActive, setEyedropperActive] = useState(false)
  const [gifVerify, setGifVerify] = useState<{
    trialRef: SpriteTrial
    framesRef: ProcessedFrame[]
    url: string
  } | null>(null)

  const stageRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const rawCanvasImgRef = useRef<HTMLImageElement | null>(null)

  const sequence = useMemo(() => {
    if (!trial || frames.length === 0) return []
    return getPlaybackSequence(frames, trial.playbackMode)
  }, [frames, trial])

  const activeTrialId = trial?.id || null
  const rawCursor = cursorState.trialId === activeTrialId ? cursorState.value : 0
  const safeCursor = sequence.length > 0 ? rawCursor % sequence.length : 0
  const currentFrame = sequence[safeCursor] || null
  const prevFrame =
    sequence.length > 1
      ? sequence[(safeCursor - 1 + sequence.length) % sequence.length]
      : null

  const gifVerifyUrl =
    gifVerify && gifVerify.trialRef === trial && gifVerify.framesRef === frames
      ? gifVerify.url
      : null

  // Revoke generated GIF object URL when replaced or unmounted
  useEffect(() => {
    const url = gifVerify?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [gifVerify])

  // Playback timer
  useEffect(() => {
    if (!isPlaying || !trial || sequence.length <= 1) return
    const intervalMs = Math.max(30, Math.round(1000 / Math.max(1, trial.fps)))
    const timer = window.setInterval(() => {
      setCursorState((prev) => {
        const base = prev.trialId === activeTrialId ? prev.value : 0
        if (trial.playbackMode === 'once' && base >= sequence.length - 1) {
          setIsPlaying(false)
          return { trialId: activeTrialId, value: base }
        }
        return { trialId: activeTrialId, value: (base + 1) % sequence.length }
      })
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [isPlaying, activeTrialId, trial?.fps, trial?.playbackMode, sequence.length, trial])

  // Patrol walk animation loop in Room mode
  useEffect(() => {
    if (!patrolMode || bgMode !== 'room' || !isPlaying) return
    let rafId = 0
    let lastTs = performance.now()
    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000)
      lastTs = now
      setRoomCatPos((prev) => {
        let nextX = prev.xPct + patrolDir * 14 * dt
        if (nextX >= 86) {
          nextX = 86
          setPatrolDir(-1)
        } else if (nextX <= 16) {
          nextX = 16
          setPatrolDir(1)
        }
        return { ...prev, xPct: nextX }
      })
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [patrolMode, bgMode, isPlaying, patrolDir])

  // Spacebar shortcut for Play/Pause when not focused in inputs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      setIsPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleRoomBgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await onUploadRoomBg(dataUrl)
    setBgMode('room')
    e.target.value = ''
  }

  const handleStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (bgMode !== 'room' || !stageRef.current) return
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = stageRef.current.getBoundingClientRect()
    const xPct = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100))
    const yPct = Math.max(15, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100))
    setRoomCatPos({ xPct, yPct })
  }

  const handleStagePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || bgMode !== 'room' || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const xPct = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100))
    const yPct = Math.max(15, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100))
    setRoomCatPos({ xPct, yPct })
  }

  const handleStagePointerUp = () => {
    draggingRef.current = false
  }

  const handleEyedropRawClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!eyedropperActive || !trial || !rawCanvasImgRef.current) return
    const imgEl = rawCanvasImgRef.current
    const rect = imgEl.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / rect.width
    const ry = (e.clientY - rect.top) / rect.height
    const c = document.createElement('canvas')
    c.width = imgEl.naturalWidth
    c.height = imgEl.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(imgEl, 0, 0)
    const px = Math.max(0, Math.min(c.width - 1, Math.floor(rx * c.width)))
    const py = Math.max(0, Math.min(c.height - 1, Math.floor(ry * c.height)))
    const pixel = ctx.getImageData(px, py, 1, 1).data
    const hex =
      '#' +
      [pixel[0], pixel[1], pixel[2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
    onUpdateTrial({
      chroma: {
        ...trial.chroma,
        enabled: true,
        keyColor: hex,
      },
    })
    setEyedropperActive(false)
  }

  const handleTestGifPreview = () => {
    if (!trial || frames.length === 0) return
    if (gifVerifyUrl) {
      setGifVerify(null)
      return
    }
    const { blob } = encodeTransparentGif(
      frames,
      trial.frameWidth,
      trial.frameHeight,
      trial.fps,
      trial.playbackMode,
      trial.flipPreviewX
    )
    setGifVerify({
      trialRef: trial,
      framesRef: frames,
      url: URL.createObjectURL(blob),
    })
  }

  if (!trial) {
    return (
      <main className="stage-panel empty-stage">
        <div className="empty-state-card">
          <h2>プレスト（再生テスト）＆ 編集ステージ</h2>
          <p>
            左のパネルから「3面図Master」を登録してスプライトシートを生成（または0円手動連携でシート画像をドロップ）すると、ここに切り出し・背景透過・アニメーション再生テストが表示されます。
          </p>
          <button type="button" className="btn btn-primary" onClick={() => void onLoadSample()}>
            <Play size={16} />
            <span>まずはサンプル猫の歩行シートをロードして体験する</span>
          </button>
        </div>
      </main>
    )
  }

  const effectiveFlipX =
    bgMode === 'room' && patrolMode
      ? patrolDir === -1
        ? !trial.flipPreviewX
        : trial.flipPreviewX
      : trial.flipPreviewX

  const moveFrameOrder = (index: number, delta: -1 | 1) => {
    const nextIdx = index + delta
    if (nextIdx < 0 || nextIdx >= trial.framesConfig.length) return
    const copy = [...trial.framesConfig]
    const [item] = copy.splice(index, 1)
    copy.splice(nextIdx, 0, item)
    onUpdateTrial({ framesConfig: copy })
  }

  const updateFrameCfg = (
    index: number,
    patch: Partial<(typeof trial.framesConfig)[number]>
  ) => {
    const copy = trial.framesConfig.map((f, i) => (i === index ? { ...f, ...patch } : f))
    onUpdateTrial({ framesConfig: copy })
  }

  return (
    <main className="stage-panel">
      {/* Stage Top Tabs */}
      <div className="stage-header">
        <div className="stage-tabs">
          <button
            id="stage-tab-presto"
            type="button"
            className={`stage-tab ${stageTab === 'presto' ? 'active' : ''}`}
            onClick={() => setStageTab('presto')}
          >
            <Play size={15} />
            <span>プレスト再生（動き・背景テスト）</span>
          </button>
          <button
            id="stage-tab-frames"
            type="button"
            className={`stage-tab ${stageTab === 'frames' ? 'active' : ''}`}
            onClick={() => setStageTab('frames')}
          >
            <Grid size={15} />
            <span>コマ編集・個別再生成 ({frames.length})</span>
          </button>
          <button
            id="stage-tab-chroma"
            type="button"
            className={`stage-tab ${stageTab === 'chroma' ? 'active' : ''}`}
            onClick={() => setStageTab('chroma')}
          >
            <Sliders size={15} />
            <span>背景透過・位置揃え補正</span>
          </button>
        </div>

        <div className="stage-status-pills">
          {isProcessing && (
            <span className="status-pill busy">
              <Loader2 size={13} className="spin" />
              <span>透過・位置補正中...</span>
            </span>
          )}
          <span className="status-pill mono">
            {trial.frameWidth}×{trial.frameHeight}px · {trial.fps}fps
          </span>
        </div>
      </div>

      {/* TAB 1: PRESTO PLAYER */}
      {stageTab === 'presto' && (
        <div className="presto-body">
          <div className="presto-toolbar">
            <div className="bg-mode-group">
              <button
                type="button"
                className={`mini-pill ${bgMode === 'checker' ? 'active' : ''}`}
                onClick={() => setBgMode('checker')}
              >
                透過チェッカー
              </button>
              <button
                type="button"
                className={`mini-pill ${bgMode === 'light' ? 'active' : ''}`}
                onClick={() => setBgMode('light')}
              >
                白背景
              </button>
              <button
                type="button"
                className={`mini-pill ${bgMode === 'dark' ? 'active' : ''}`}
                onClick={() => setBgMode('dark')}
              >
                黒背景
              </button>
              <button
                type="button"
                className={`mini-pill ${bgMode === 'room' ? 'active' : ''}`}
                onClick={() => setBgMode('room')}
              >
                実ゲーム背景テスト
              </button>
            </div>

            <div className="presto-toggles">
              {bgMode === 'room' ? (
                <>
                  <button
                    type="button"
                    className={`mini-pill ${patrolMode ? 'active' : ''}`}
                    onClick={() => setPatrolMode((v) => !v)}
                    title="部屋の中を左右に歩かせてテストします"
                  >
                    <Footprints size={13} />
                    <span>パトロールテスト</span>
                  </button>
                  <label className="mini-pill file-pill" title="ゲーム画面のスクショを背景に設定">
                    <ImagePlus size={13} />
                    <span>部屋スクショ変更</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void handleRoomBgUpload(e)}
                    />
                  </label>
                </>
              ) : (
                <button
                  type="button"
                  className={`mini-pill ${onionSkin ? 'active' : ''}`}
                  onClick={() => setOnionSkin((v) => !v)}
                >
                  <Layers size={13} />
                  <span>オニオンスキン</span>
                </button>
              )}

              <button
                type="button"
                className={`mini-pill ${trial.flipPreviewX ? 'active' : ''}`}
                onClick={() => onUpdateTrial({ flipPreviewX: !trial.flipPreviewX })}
                title="出力時もこの向きで反転できます"
              >
                <FlipHorizontal size={13} />
                <span>左右反転</span>
              </button>

              <button
                type="button"
                className={`mini-pill ${gifVerifyUrl ? 'active' : ''}`}
                onClick={handleTestGifPreview}
                title="実際に書き出される透過GIFファイルそのものを再生確認します"
              >
                <Film size={13} />
                <span>{gifVerifyUrl ? 'コマ再生へ戻る' : '実GIF確認'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Stage Viewport */}
          <div
            ref={stageRef}
            className={`stage-viewport bg-${bgMode}`}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
          >
            {bgMode === 'room' && (
              <>
                <img
                  src={cat?.roomBgDataUrl || '/samples/sample_room_bg.jpg'}
                  alt="ゲーム背景テスト"
                  className="room-bg-img"
                  draggable={false}
                />
                <div className="room-overlay-hint">
                  ドラッグして猫の配置やサイズ感をテストできます
                </div>
              </>
            )}

            {gifVerifyUrl ? (
              <div
                className={`sprite-actor ${bgMode === 'room' ? 'room-actor' : ''}`}
                style={
                  bgMode === 'room'
                    ? {
                        left: `${roomCatPos.xPct}%`,
                        top: `${roomCatPos.yPct}%`,
                        transform: `translate(-50%, -88%) scale(${roomScale})`,
                      }
                    : { transform: `scale(${zoom})` }
                }
              >
                <img
                  src={gifVerifyUrl}
                  alt="実出力GIF確認"
                  className={trial.pixelArtCrisp ? 'pixelated' : ''}
                  draggable={false}
                />
                <span className="gif-verify-badge">実GIF再生中</span>
              </div>
            ) : currentFrame ? (
              <div
                className={`sprite-actor ${bgMode === 'room' ? 'room-actor' : ''}`}
                style={
                  bgMode === 'room'
                    ? {
                        left: `${roomCatPos.xPct}%`,
                        top: `${roomCatPos.yPct}%`,
                        transform: `translate(-50%, -88%) scale(${roomScale})`,
                      }
                    : { transform: `scale(${zoom})` }
                }
              >
                {onionSkin && prevFrame && bgMode !== 'room' && (
                  <img
                    src={prevFrame.dataUrl}
                    alt=""
                    aria-hidden="true"
                    className={`onion-layer ${trial.pixelArtCrisp ? 'pixelated' : ''}`}
                    style={{
                      transform: effectiveFlipX ? 'scaleX(-1)' : undefined,
                    }}
                    draggable={false}
                  />
                )}
                <img
                  src={currentFrame.dataUrl}
                  alt={`フレーム ${safeCursor + 1}`}
                  className={`actor-img ${trial.pixelArtCrisp ? 'pixelated' : ''}`}
                  style={{
                    transform: effectiveFlipX ? 'scaleX(-1)' : undefined,
                  }}
                  draggable={false}
                />
              </div>
            ) : null}
          </div>

          {/* Transport Controls */}
          <div className="transport-bar">
            <div className="transport-buttons">
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setCursorState((prev) => {
                    const base = prev.trialId === activeTrialId ? prev.value : 0
                    return {
                      trialId: activeTrialId,
                      value: (base - 1 + sequence.length) % Math.max(1, sequence.length),
                    }
                  })
                }}
                title="前のコマ"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                id="btn-play-pause"
                type="button"
                className="btn btn-primary play-btn"
                onClick={() => {
                  if (trial.playbackMode === 'once' && safeCursor >= sequence.length - 1) {
                    setCursorState({ trialId: activeTrialId, value: 0 })
                  }
                  setIsPlaying((p) => !p)
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? '停止' : '再生'}</span>
              </button>

              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setIsPlaying(false)
                  setCursorState((prev) => {
                    const base = prev.trialId === activeTrialId ? prev.value : 0
                    return {
                      trialId: activeTrialId,
                      value: (base + 1) % Math.max(1, sequence.length),
                    }
                  })
                }}
                title="次のコマ"
              >
                <ChevronRight size={18} />
              </button>

              <span className="mono frame-counter">
                {safeCursor + 1} / {Math.max(1, sequence.length)}
              </span>
            </div>

            <div className="transport-sliders">
              <label className="inline-slider">
                <span>FPS: <strong className="mono">{trial.fps}</strong></span>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={trial.fps}
                  onChange={(e) => onUpdateTrial({ fps: Number(e.target.value) })}
                />
              </label>

              {bgMode === 'room' ? (
                <label className="inline-slider">
                  <span>サイズ: <strong className="mono">{roomScale.toFixed(2)}x</strong></span>
                  <input
                    type="range"
                    min={0.25}
                    max={3.5}
                    step={0.05}
                    value={roomScale}
                    onChange={(e) => setRoomScale(Number(e.target.value))}
                  />
                </label>
              ) : (
                <label className="inline-slider">
                  <span>拡大: <strong className="mono">{zoom.toFixed(2)}x</strong></span>
                  <input
                    type="range"
                    min={0.5}
                    max={4}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                  />
                </label>
              )}

              <select
                className="text-input compact-select"
                value={trial.playbackMode}
                onChange={(e) =>
                  onUpdateTrial({ playbackMode: e.target.value as PlaybackMode })
                }
                aria-label="再生モード"
              >
                <option value="loop">ループ (Loop)</option>
                <option value="ping-pong">往復 (Ping-Pong)</option>
                <option value="once">1回再生 (Once)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FRAMES EDITOR & SINGLE FRAME RE-ROLL */}
      {stageTab === 'frames' && (
        <div className="frames-body">
          <div className="frames-help">
            各コマの並び替え・ON/OFF・微調整ができます。一部のコマだけポーズや模様が崩れた場合は「このコマだけ再生成」で修復できます。
          </div>

          <div className="frames-grid">
            {frames.map((frame, i) => {
              const cfg = trial.framesConfig[i]
              const isRerolling = rerollingFrameIndex === i
              return (
                <div
                  key={cfg?.id || i}
                  className={`frame-card ${!frame.enabled ? 'disabled' : ''}`}
                >
                  <div className="frame-card-top">
                    <label className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={frame.enabled}
                        onChange={(e) => updateFrameCfg(i, { enabled: e.target.checked })}
                      />
                      <span className="mono">#{i + 1}</span>
                    </label>
                    <div className="frame-order-btns">
                      <button
                        type="button"
                        className="icon-btn tiny"
                        disabled={i === 0}
                        onClick={() => moveFrameOrder(i, -1)}
                        title="前へ移動"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn tiny"
                        disabled={i === frames.length - 1}
                        onClick={() => moveFrameOrder(i, 1)}
                        title="後ろへ移動"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="frame-thumb-box bg-checker">
                    <img
                      src={frame.dataUrl}
                      alt={`コマ ${i + 1}`}
                      className={trial.pixelArtCrisp ? 'pixelated' : ''}
                    />
                  </div>

                  <div className="nudge-row">
                    <span className="mono nudge-label">
                      位置({cfg?.offsetX || 0},{cfg?.offsetY || 0})
                    </span>
                    <div className="nudge-btns">
                      <button
                        type="button"
                        className="icon-btn tiny"
                        onClick={() => updateFrameCfg(i, { offsetX: (cfg?.offsetX || 0) - 2 })}
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn tiny"
                        onClick={() => updateFrameCfg(i, { offsetY: (cfg?.offsetY || 0) - 2 })}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn tiny"
                        onClick={() => updateFrameCfg(i, { offsetY: (cfg?.offsetY || 0) + 2 })}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn tiny"
                        onClick={() => updateFrameCfg(i, { offsetX: (cfg?.offsetX || 0) + 2 })}
                      >
                        <ArrowRight size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn tiny"
                        onClick={() => updateFrameCfg(i, { offsetX: 0, offsetY: 0 })}
                        title="位置リセット"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="frame-actions-row">
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => void onRerollFrame(i)}
                      disabled={rerollingFrameIndex !== null}
                    >
                      {isRerolling ? (
                        <Loader2 size={12} className="spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      <span>{isRerolling ? '再生成中' : 'このコマ再生成'}</span>
                    </button>

                    <label className="btn btn-subtle btn-xs">
                      <Upload size={12} />
                      <span>差替</span>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const url = await fileToDataUrl(file)
                          onReplaceFrameImage(i, url)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CHROMA KEY, ALIGNMENT & GRID OVERLAY */}
      {stageTab === 'chroma' && (
        <div className="chroma-body">
          <div className="chroma-controls">
            <div className="control-group">
              <div className="label-row">
                <h3>背景透過（クロマキー）</h3>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={trial.chroma.enabled}
                    onChange={(e) =>
                      onUpdateTrial({
                        chroma: { ...trial.chroma, enabled: e.target.checked },
                      })
                    }
                  />
                  <span>透過を有効化</span>
                </label>
              </div>

              <div className="segmented-row compact">
                <button
                  type="button"
                  className={`seg-btn ${trial.chroma.mode === 'flood-fill' ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, mode: 'flood-fill' },
                    })
                  }
                  title="外側から透明化し、輪郭線内の白い毛や目を保護します"
                >
                  外周フラッド（毛保護）
                </button>
                <button
                  type="button"
                  className={`seg-btn ${trial.chroma.mode === 'global' ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, mode: 'global' },
                    })
                  }
                  title="画像全体の背景色を一括除去します"
                >
                  全体キー（穴も抜く）
                </button>
              </div>

              <div className="color-pick-row">
                <span className="field-sublabel">抜く背景色：</span>
                <button
                  type="button"
                  className={`mini-pill ${trial.chroma.keyColor === 'auto' ? 'active' : ''}`}
                  onClick={() =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, keyColor: 'auto' },
                    })
                  }
                >
                  自動検出 ({detectedBgHex})
                </button>
                <input
                  type="color"
                  value={
                    trial.chroma.keyColor === 'auto'
                      ? detectedBgHex
                      : trial.chroma.keyColor
                  }
                  onChange={(e) =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, keyColor: e.target.value },
                    })
                  }
                  aria-label="背景色指定"
                />
                <button
                  type="button"
                  className={`mini-pill ${eyedropperActive ? 'active' : ''}`}
                  onClick={() => setEyedropperActive((v) => !v)}
                >
                  <Pipette size={13} />
                  <span>{eyedropperActive ? '右の画像をクリック' : 'スポイト'}</span>
                </button>
              </div>

              <label className="slider-field">
                <span>許容しきい値: <strong className="mono">{trial.chroma.tolerance}</strong></span>
                <input
                  type="range"
                  min={0}
                  max={110}
                  value={trial.chroma.tolerance}
                  onChange={(e) =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, tolerance: Number(e.target.value) },
                    })
                  }
                />
              </label>

              <label className="slider-field">
                <span>フチなめらか (Feather): <strong className="mono">{trial.chroma.feather}</strong></span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={trial.chroma.feather}
                  onChange={(e) =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, feather: Number(e.target.value) },
                    })
                  }
                />
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={trial.chroma.despill}
                  onChange={(e) =>
                    onUpdateTrial({
                      chroma: { ...trial.chroma, despill: e.target.checked },
                    })
                  }
                />
                <span>白フチ色かぶり除去（Despill）</span>
              </label>
            </div>

            <div className="control-group">
              <h3>位置揃え・切り出しグリッド補正</h3>
              <div className="segmented-row compact">
                {(
                  [
                    ['bottom-center', '足元中央'],
                    ['center', '重心中央'],
                    ['none', '均等切出のみ'],
                  ] as [AlignMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`seg-btn ${trial.alignMode === mode ? 'active' : ''}`}
                    onClick={() => onUpdateTrial({ alignMode: mode })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="slider-field">
                <span>余白パディング: <strong className="mono">{trial.paddingPct}%</strong></span>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={trial.paddingPct}
                  onChange={(e) => onUpdateTrial({ paddingPct: Number(e.target.value) })}
                />
              </label>

              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={trial.pixelArtCrisp}
                  onChange={(e) => onUpdateTrial({ pixelArtCrisp: e.target.checked })}
                />
                <span>ドット絵くっきり補間（Nearest-Neighbor）</span>
              </label>

              <div className="inline-two-col">
                <div>
                  <label className="field-sublabel">元シート列数 (cols)</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    className="text-input mono"
                    value={trial.cols}
                    onChange={(e) =>
                      onUpdateTrial({ cols: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <div>
                  <label className="field-sublabel">元シート行数 (rows)</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    className="text-input mono"
                    value={trial.rows}
                    onChange={(e) =>
                      onUpdateTrial({ rows: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="raw-overlay-panel">
            <div className="label-row">
              <span className="field-sublabel">
                元シート＆切り出しグリッド ({trial.cols}×{trial.rows})
                {eyedropperActive && ' — 抜きたい背景色をクリックしてください'}
              </span>
              <span className="mono size-readout">
                <Eye size={13} /> 確認中
              </span>
            </div>
            <div className={`raw-overlay-wrap ${eyedropperActive ? 'eyedropper' : ''}`}>
              <img
                ref={rawCanvasImgRef}
                src={trial.rawSheetDataUrl}
                alt="元スプライトシート"
                className="raw-sheet-img"
                onClick={handleEyedropRawClick}
              />
              <div
                className="slice-grid-overlay"
                style={{
                  gridTemplateColumns: `repeat(${trial.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${trial.rows}, 1fr)`,
                }}
              >
                {Array.from({ length: trial.cols * trial.rows }, (_, idx) => (
                  <div key={idx} className="slice-cell-guide">
                    <span>{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial History Strip */}
      <div className="history-strip">
        <div className="history-label">
          <span>試行履歴 ({trials.length})</span>
        </div>
        <div className="history-items">
          {trials.map((t) => {
            const active = t.id === trial.id
            const motionShort =
              MOTION_PRESETS.find((m) => m.id === t.motionId)?.shortJa || t.motionId
            return (
              <div
                key={t.id}
                className={`history-chip ${active ? 'active' : ''}`}
                onClick={() => onSelectTrial(t.id)}
              >
                <img src={t.rawSheetDataUrl} alt={t.label} className="history-thumb" />
                <div className="history-meta">
                  <span className="history-title">
                    {motionShort} · {t.frameCount}枚
                  </span>
                  <span className="history-sub mono">
                    {t.sourceType === 'sample'
                      ? 'サンプル'
                      : t.sourceType === 'manual'
                        ? '0円手動'
                        : t.costUsd != null
                          ? `$${t.costUsd.toFixed(4)}`
                          : t.model?.split('/').pop()?.slice(0, 14) || 'API'}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn tiny danger"
                  title="この履歴を削除"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDeleteTrial(t.id)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
