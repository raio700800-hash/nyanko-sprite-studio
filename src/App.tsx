import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { CatRosterDrawer } from './components/CatRosterDrawer'
import { ComposerPanel, type ComposerState } from './components/ComposerPanel'
import { ExportBar } from './components/ExportBar'
import { PrestoStage } from './components/PrestoStage'
import { SettingsModal } from './components/SettingsModal'
import { TopBar } from './components/TopBar'
import {
  buildSingleFrameRerollPrompt,
  buildSpritePrompt,
  computeFrameDimensions,
  computeGridLayout,
  fallbackTranslateJaToEn,
  MOTION_PRESETS,
} from './data/presets'
import {
  buildAntigravityPromptMarkdown,
  buildMetaJson,
  exportAntigravityZip,
  triggerDownload,
} from './lib/exporter'
import {
  composeFinalSheet,
  encodeTransparentGif,
  sliceAndProcessSpriteSheet,
} from './lib/spriteProcessor'
import {
  createSampleCatAndTrial,
  deleteCatAndTrials,
  deleteTrial,
  getTrialsByCat,
  loadApiSettings,
  loadOrSeedCats,
  putCat,
  putTrial,
  saveApiSettings,
} from './lib/storage'
import type {
  ApiSettings,
  CatCharacter,
  ExportLayout,
  ProcessedFrame,
  SpriteTrial,
} from './types/studio'

function createInitialComposer(): ComposerState {
  return {
    motionId: 'walk',
    styleId: 'original',
    facing: 'right',
    frameCount: 8,
    aspectPreset: '4:3',
    frameBaseSize: 256,
    customW: 256,
    customH: 192,
    promptJa: '',
    promptEnOverride: '',
    usePromptOverride: false,
  }
}

export function App() {
  const [cats, setCats] = useState<CatCharacter[]>([])
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [trials, setTrials] = useState<SpriteTrial[]>([])
  const [activeTrialId, setActiveTrialId] = useState<string | null>(null)
  const [trialCounts, setTrialCounts] = useState<Record<string, number>>({})

  const [composer, setComposer] = useState<ComposerState>(createInitialComposer)
  const [translatedEnSnippet, setTranslatedEnSnippet] = useState('')
  const [apiSettings, setApiSettings] = useState<ApiSettings>(loadApiSettings)
  const [envKeys, setEnvKeys] = useState({ openrouter: false, gemini: false, fal: false })

  const [processedFrames, setProcessedFrames] = useState<ProcessedFrame[]>([])
  const [detectedBgHex, setDetectedBgHex] = useState('#ffffff')
  const [isProcessing, setIsProcessing] = useState(false)

  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLoadingSample, setIsLoadingSample] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [rerollingFrameIdx, setRerollingFrameIdx] = useState<number | null>(null)
  const [generateError, setGenerateError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [exportLayout, setExportLayout] = useState<ExportLayout>('grid')
  const [includeFlipped, setIncludeFlipped] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const processSeqRef = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? '' : cur))
    }, 3200)
  }, [])

  const visibleTrials = useMemo(
    () => (activeCatId ? trials : []),
    [activeCatId, trials]
  )
  const activeCat = useMemo(
    () => cats.find((c) => c.id === activeCatId) || null,
    [cats, activeCatId]
  )
  const activeTrial = useMemo(
    () => visibleTrials.find((t) => t.id === activeTrialId) || null,
    [visibleTrials, activeTrialId]
  )
  const visibleFrames = useMemo(
    () => (activeTrial ? processedFrames : []),
    [activeTrial, processedFrames]
  )

  const computedFrameSize = useMemo(
    () =>
      computeFrameDimensions(
        composer.aspectPreset,
        composer.frameBaseSize,
        composer.customW,
        composer.customH
      ),
    [composer.aspectPreset, composer.frameBaseSize, composer.customW, composer.customH]
  )

  const computedGrid = useMemo(
    () => computeGridLayout(composer.frameCount, computedFrameSize.width, computedFrameSize.height),
    [composer.frameCount, computedFrameSize.width, computedFrameSize.height]
  )

  const effectiveExtraEn = useMemo(() => {
    if (translatedEnSnippet.trim()) return translatedEnSnippet
    return fallbackTranslateJaToEn(composer.promptJa)
  }, [translatedEnSnippet, composer.promptJa])

  const builtPromptEn = useMemo(
    () =>
      buildSpritePrompt({
        motionId: composer.motionId,
        styleId: composer.styleId,
        facing: composer.facing,
        frameCount: composer.frameCount,
        cols: computedGrid.cols,
        rows: computedGrid.rows,
        characterTraits: activeCat?.traits || '',
        customPromptEn: effectiveExtraEn,
      }),
    [
      composer.motionId,
      composer.styleId,
      composer.facing,
      composer.frameCount,
      computedGrid.cols,
      computedGrid.rows,
      activeCat?.traits,
      effectiveExtraEn,
    ]
  )

  const refreshTrialCounts = useCallback(async (catList: CatCharacter[]) => {
    const entries = await Promise.all(
      catList.map(async (c) => {
        const list = await getTrialsByCat(c.id)
        return [c.id, list.length] as const
      })
    )
    setTrialCounts(Object.fromEntries(entries))
  }, [])

  // Boot: check server health + load IndexedDB cats (seed sample on very first launch)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok && !cancelled) {
          const data = (await res.json()) as {
            envKeys?: { openrouter: boolean; gemini: boolean; fal: boolean }
          }
          if (data.envKeys) setEnvKeys(data.envKeys)
        }
      } catch {
        // Ignore if running web-only mode
      }

      const { cats: loadedCats, seededTrial } = await loadOrSeedCats()
      if (cancelled) return

      setCats(loadedCats)
      if (loadedCats[0]) {
        setActiveCatId(loadedCats[0].id)
      }
      if (seededTrial && loadedCats[0]) {
        setTrials([seededTrial])
        setActiveTrialId(seededTrial.id)
        setTrialCounts({ [loadedCats[0].id]: 1 })
        return
      }
      await refreshTrialCounts(loadedCats)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshTrialCounts])

  // Load trials when activeCatId changes
  useEffect(() => {
    if (!activeCatId) return
    let cancelled = false
    void (async () => {
      const catTrials = await getTrialsByCat(activeCatId)
      if (cancelled) return
      setTrials(catTrials)
      setActiveTrialId((prev) => {
        if (prev && catTrials.some((t) => t.id === prev)) return prev
        return catTrials[0]?.id || null
      })
    })()
    return () => {
      cancelled = true
    }
  }, [activeCatId])

  // Process raw sprite sheet into transparent, aligned frames whenever activeTrial changes
  useEffect(() => {
    if (!activeTrial) return
    const seqId = ++processSeqRef.current

    const timer = window.setTimeout(() => {
      setIsProcessing(true)
      void (async () => {
        try {
          const result = await sliceAndProcessSpriteSheet(activeTrial)
          if (processSeqRef.current !== seqId) return
          setProcessedFrames(result.frames)
          setDetectedBgHex(result.detectedBgHex)
        } catch (err) {
          if (processSeqRef.current !== seqId) return
          console.error(err)
          showToast('スプライトの切り出し処理に失敗しました')
        } finally {
          if (processSeqRef.current === seqId) {
            setIsProcessing(false)
          }
        }
      })()
    }, 35)

    return () => window.clearTimeout(timer)
  }, [activeTrial, showToast])

  const getKeyForProvider = (provider: ApiSettings['provider']) => {
    if (provider === 'openrouter') return apiSettings.openrouterKey
    if (provider === 'gemini') return apiSettings.geminiKey
    return apiSettings.falKey
  }

  const handleSaveApiSettings = (next: ApiSettings) => {
    setApiSettings(next)
    saveApiSettings(next)
    showToast('API設定を保存しました')
  }

  const handleLoadSample = async () => {
    setIsLoadingSample(true)
    try {
      const { cat, trial } = await createSampleCatAndTrial()
      const nextCats = [...cats, cat]
      setCats(nextCats)
      setActiveCatId(cat.id)
      setTrials([trial])
      setActiveTrialId(trial.id)
      await refreshTrialCounts(nextCats)
      showToast('サンプル三毛猫「ミケ」と歩行シートを読み込みました')
    } finally {
      setIsLoadingSample(false)
    }
  }

  const handleCreateCat = async (input: {
    name: string
    slug: string
    traits: string
    masterImageDataUrl: string
  }) => {
    const now = Date.now()
    const newCat: CatCharacter = {
      id: `cat_${now}`,
      name: input.name,
      slug: input.slug,
      traits: input.traits,
      masterImageDataUrl: input.masterImageDataUrl,
      createdAt: now,
      updatedAt: now,
    }
    await putCat(newCat)
    const nextCats = [...cats, newCat]
    setCats(nextCats)
    setActiveCatId(newCat.id)
    setTrials([])
    setActiveTrialId(null)
    await refreshTrialCounts(nextCats)
    showToast(`「${newCat.name}」を登録しました`)
  }

  const handleDeleteCat = async (catId: string) => {
    await deleteCatAndTrials(catId)
    const remaining = cats.filter((c) => c.id !== catId)
    setCats(remaining)
    if (activeCatId === catId) {
      setActiveCatId(remaining[0]?.id || null)
    }
    await refreshTrialCounts(remaining)
    showToast('キャラクターを削除しました')
  }

  const handleUploadMaster = async (dataUrl: string, filename?: string) => {
    if (!activeCat) {
      const stem = filename ? filename.replace(/\.[^.]+$/, '') : 'にゃんこ #01'
      await handleCreateCat({
        name: stem,
        slug: 'cat_01',
        traits: '',
        masterImageDataUrl: dataUrl,
      })
      return
    }
    const updated: CatCharacter = {
      ...activeCat,
      masterImageDataUrl: dataUrl,
      updatedAt: Date.now(),
    }
    await putCat(updated)
    setCats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    showToast('3面図Master画像を更新しました')
  }

  const handleUpdateCatTraits = (traits: string) => {
    if (!activeCat) return
    const updated: CatCharacter = { ...activeCat, traits, updatedAt: Date.now() }
    setCats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    void putCat(updated)
  }

  const handleUploadRoomBg = async (dataUrl: string) => {
    if (!activeCat) return
    const updated: CatCharacter = {
      ...activeCat,
      roomBgDataUrl: dataUrl,
      updatedAt: Date.now(),
    }
    await putCat(updated)
    setCats((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    showToast('テスト用の部屋背景画像を更新しました')
  }

  const handleTranslatePrompt = async () => {
    if (!composer.promptJa.trim()) return
    setIsTranslating(true)
    try {
      const resp = await fetch('/api/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': apiSettings.openrouterKey,
          'x-gemini-key': apiSettings.geminiKey,
        },
        body: JSON.stringify({
          japaneseText: composer.promptJa,
          provider: apiSettings.provider,
        }),
      })
      if (resp.ok) {
        const data = (await resp.json()) as { englishText?: string }
        if (data.englishText) {
          setTranslatedEnSnippet(data.englishText)
          if (composer.usePromptOverride) {
            setComposer((p) => ({ ...p, usePromptOverride: false }))
          }
          showToast('日本語の演出指示を英語AIプロンプトへ反映しました')
          return
        }
      }
      // Fallback heuristic translation
      const fallback = fallbackTranslateJaToEn(composer.promptJa)
      setTranslatedEnSnippet(fallback)
      showToast('簡易辞書で英語キーワードを補強しました')
    } catch {
      const fallback = fallbackTranslateJaToEn(composer.promptJa)
      setTranslatedEnSnippet(fallback)
      showToast('オフライン簡易変換を適用しました')
    } finally {
      setIsTranslating(false)
    }
  }

  const createTrialFromSheet = async (params: {
    rawSheetDataUrl: string
    sourceType: 'api' | 'manual'
    provider?: ApiSettings['provider']
    model?: string
    costUsd?: number | null
    promptEnUsed: string
  }) => {
    if (!activeCat) return
    const motion = MOTION_PRESETS.find((m) => m.id === composer.motionId) || MOTION_PRESETS[0]
    const now = Date.now()
    const newTrial: SpriteTrial = {
      id: `trial_${now}`,
      catId: activeCat.id,
      label: `${motion.shortJa} ${composer.frameCount}枚`,
      sourceType: params.sourceType,
      provider: params.provider,
      model: params.model,
      costUsd: params.costUsd ?? null,
      rawSheetDataUrl: params.rawSheetDataUrl,
      motionId: composer.motionId,
      styleId: composer.styleId,
      facing: composer.facing,
      frameCount: composer.frameCount,
      cols: computedGrid.cols,
      rows: computedGrid.rows,
      frameWidth: computedFrameSize.width,
      frameHeight: computedFrameSize.height,
      aspectPreset: composer.aspectPreset,
      promptJa: composer.promptJa,
      promptEn: params.promptEnUsed,
      fps: motion.recommendedFps,
      playbackMode: motion.playbackMode,
      chroma: {
        enabled: true,
        mode: 'flood-fill',
        keyColor: 'auto',
        tolerance: 36,
        feather: 14,
        despill: true,
      },
      alignMode: 'bottom-center',
      paddingPct: 8,
      pixelArtCrisp: composer.styleId === 'pixel16',
      flipPreviewX: false,
      framesConfig: Array.from({ length: composer.frameCount }, (_, i) => ({
        id: `f_${now}_${i}`,
        sourceIndex: i,
        enabled: true,
        offsetX: 0,
        offsetY: 0,
      })),
      createdAt: now,
    }

    await putTrial(newTrial)
    setTrials((prev) => [newTrial, ...prev])
    setActiveTrialId(newTrial.id)
    setTrialCounts((prev) => ({ ...prev, [activeCat.id]: (prev[activeCat.id] || 0) + 1 }))
  }

  const handleGenerateViaApi = async () => {
    if (!activeCat?.masterImageDataUrl) {
      setGenerateError('先に3面図Master画像をアップロードしてください。')
      return
    }
    setGenerateError('')
    setIsGenerating(true)

    const promptToSend = composer.usePromptOverride
      ? composer.promptEnOverride
      : builtPromptEn

    try {
      const resp = await fetch('/api/generate-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getKeyForProvider(apiSettings.provider),
        },
        body: JSON.stringify({
          provider: apiSettings.provider,
          model: apiSettings.model,
          prompt: promptToSend,
          masterImageDataUrl: activeCat.masterImageDataUrl,
          aspectRatio: computedGrid.aiAspectRatio,
          resolution: apiSettings.resolution,
        }),
      })

      const data = (await resp.json()) as {
        error?: string
        imageDataUrl?: string
        costUsd?: number | null
        model?: string
        provider?: ApiSettings['provider']
      }

      if (!resp.ok || !data.imageDataUrl) {
        const msg = data.error || '生成に失敗しました'
        setGenerateError(msg)
        if (resp.status === 401) {
          setIsSettingsOpen(true)
        }
        return
      }

      await createTrialFromSheet({
        rawSheetDataUrl: data.imageDataUrl,
        sourceType: 'api',
        provider: data.provider || apiSettings.provider,
        model: data.model || apiSettings.model,
        costUsd: data.costUsd ?? null,
        promptEnUsed: promptToSend,
      })

      showToast(
        data.costUsd != null
          ? `生成完了！（今回コスト: $${data.costUsd.toFixed(4)}）`
          : 'スプライトシートを生成し、自動切り出ししました！'
      )
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? err.message
          : 'ローカルAPIサーバーへ接続できません。npm run dev で起動しているか確認してください。'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImportManualSheet = async (dataUrl: string) => {
    if (!activeCat) {
      showToast('先に「サンプル猫」または「3面図Master」をセットしてください')
      return
    }
    const promptToSave = composer.usePromptOverride
      ? composer.promptEnOverride
      : builtPromptEn
    await createTrialFromSheet({
      rawSheetDataUrl: dataUrl,
      sourceType: 'manual',
      promptEnUsed: promptToSave,
    })
    showToast('外部生成シートを取り込み、自動透過・切り出ししました！')
  }

  const handleUpdateTrial = (patch: Partial<SpriteTrial>) => {
    if (!activeTrial) return
    const updated: SpriteTrial = { ...activeTrial, ...patch }
    setTrials((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    void putTrial(updated)
  }

  const handleDeleteTrial = async (trialId: string) => {
    await deleteTrial(trialId)
    const remaining = trials.filter((t) => t.id !== trialId)
    setTrials(remaining)
    if (activeTrialId === trialId) {
      setActiveTrialId(remaining[0]?.id || null)
    }
    if (activeCat) {
      setTrialCounts((prev) => ({ ...prev, [activeCat.id]: remaining.length }))
    }
  }

  const handleRerollFrame = async (frameOrderIndex: number) => {
    if (!activeCat || !activeTrial) return
    setRerollingFrameIdx(frameOrderIndex)
    try {
      const prompt = buildSingleFrameRerollPrompt({
        frameIndex: frameOrderIndex,
        totalFrames: activeTrial.framesConfig.length,
        motionId: activeTrial.motionId,
        styleId: activeTrial.styleId,
        facing: activeTrial.facing,
        characterTraits: activeCat.traits,
        customPromptEn: activeTrial.promptJa
          ? fallbackTranslateJaToEn(activeTrial.promptJa)
          : '',
      })

      const singleAspect =
        activeTrial.aspectPreset === 'custom' ? '1:1' : activeTrial.aspectPreset

      const resp = await fetch('/api/generate-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getKeyForProvider(apiSettings.provider),
        },
        body: JSON.stringify({
          provider: apiSettings.provider,
          model: apiSettings.model,
          prompt,
          masterImageDataUrl: activeCat.masterImageDataUrl,
          extraReferenceDataUrl: activeTrial.rawSheetDataUrl,
          aspectRatio: singleAspect,
          resolution: '1K',
        }),
      })
      const data = (await resp.json()) as { error?: string; imageDataUrl?: string }
      if (!resp.ok || !data.imageDataUrl) {
        showToast(data.error || 'コマ単体の再生成に失敗しました')
        if (resp.status === 401) setIsSettingsOpen(true)
        return
      }

      const nextFramesCfg = activeTrial.framesConfig.map((f, idx) =>
        idx === frameOrderIndex ? { ...f, customDataUrl: data.imageDataUrl } : f
      )
      handleUpdateTrial({ framesConfig: nextFramesCfg })
      showToast(`#${frameOrderIndex + 1} のコマを再生成して差し替えました`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '再生成に失敗しました')
    } finally {
      setRerollingFrameIdx(null)
    }
  }

  const handleReplaceFrameImage = (frameOrderIndex: number, dataUrl: string) => {
    if (!activeTrial) return
    const nextFramesCfg = activeTrial.framesConfig.map((f, idx) =>
      idx === frameOrderIndex ? { ...f, customDataUrl: dataUrl } : f
    )
    handleUpdateTrial({ framesConfig: nextFramesCfg })
    showToast(`#${frameOrderIndex + 1} のコマ画像を差し替えました`)
  }

  const handleExportZip = async () => {
    if (!activeCat || !activeTrial || processedFrames.length === 0) return
    setIsExporting(true)
    try {
      const { filename } = await exportAntigravityZip({
        cat: activeCat,
        trial: activeTrial,
        frames: processedFrames,
        layout: exportLayout,
        includeFlipped,
      })
      showToast(`${filename} を書き出しました！`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadGif = () => {
    if (!activeCat || !activeTrial || processedFrames.length === 0) return
    const { blob } = encodeTransparentGif(
      processedFrames,
      activeTrial.frameWidth,
      activeTrial.frameHeight,
      activeTrial.fps,
      activeTrial.playbackMode,
      activeTrial.flipPreviewX
    )
    triggerDownload(blob, `${activeCat.slug}_${activeTrial.motionId}.gif`)
    showToast('透過アニメーションGIFを保存しました')
  }

  const handleDownloadPng = () => {
    if (!activeCat || !activeTrial || processedFrames.length === 0) return
    const composed = composeFinalSheet(
      processedFrames,
      activeTrial.frameWidth,
      activeTrial.frameHeight,
      exportLayout,
      activeTrial.cols,
      activeTrial.flipPreviewX,
      activeTrial.pixelArtCrisp
    )
    composed.canvas.toBlob((blob) => {
      if (!blob) return
      triggerDownload(blob, `${activeCat.slug}_${activeTrial.motionId}.png`)
      showToast('透過PNGスプライトシートを保存しました')
    }, 'image/png')
  }

  const handleCopyAntigravityPrompt = async () => {
    if (!activeCat || !activeTrial || processedFrames.length === 0) return
    const basePrefix = `${activeCat.slug}_${activeTrial.motionId}`
    const composed = composeFinalSheet(
      processedFrames,
      activeTrial.frameWidth,
      activeTrial.frameHeight,
      exportLayout,
      activeTrial.cols,
      activeTrial.flipPreviewX,
      activeTrial.pixelArtCrisp
    )
    const meta = buildMetaJson({
      cat: activeCat,
      trial: activeTrial,
      composed,
      layout: exportLayout,
      prefix: basePrefix,
      facingLabel: activeTrial.flipPreviewX
        ? `${activeTrial.facing}_flipped`
        : activeTrial.facing,
    })
    const md = buildAntigravityPromptMarkdown({
      cat: activeCat,
      trial: activeTrial,
      meta,
      includeFlipped,
      flippedPrefix: includeFlipped ? `${basePrefix}_flipped` : undefined,
    })
    await navigator.clipboard.writeText(md)
    showToast('Antigravity2.0用 組み込み指示書をコピーしました')
  }

  return (
    <div className="studio-shell">
      <TopBar
        activeCat={activeCat}
        catCount={cats.length}
        apiSettings={apiSettings}
        envKeys={envKeys}
        onOpenRoster={() => setIsRosterOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLoadSample={() => void handleLoadSample()}
        isLoadingSample={isLoadingSample}
      />

      <div className="studio-workspace">
        <ComposerPanel
          cat={activeCat}
          composer={composer}
          computedGrid={computedGrid}
          computedFrameSize={computedFrameSize}
          builtPromptEn={builtPromptEn}
          apiSettings={apiSettings}
          isGenerating={isGenerating}
          isTranslating={isTranslating}
          generateError={generateError}
          onUpdateComposer={(patch) => setComposer((prev) => ({ ...prev, ...patch }))}
          onUploadMaster={handleUploadMaster}
          onUpdateCatTraits={handleUpdateCatTraits}
          onTranslatePrompt={handleTranslatePrompt}
          onGenerateViaApi={handleGenerateViaApi}
          onImportManualSheet={handleImportManualSheet}
          onChangeModelShortcut={(modelId) => {
            const next = { ...apiSettings, model: modelId }
            setApiSettings(next)
            saveApiSettings(next)
          }}
        />

        <PrestoStage
          cat={activeCat}
          trial={activeTrial}
          trials={visibleTrials}
          frames={visibleFrames}
          detectedBgHex={detectedBgHex}
          isProcessing={isProcessing}
          rerollingFrameIndex={rerollingFrameIdx}
          onSelectTrial={setActiveTrialId}
          onDeleteTrial={handleDeleteTrial}
          onUpdateTrial={handleUpdateTrial}
          onUploadRoomBg={handleUploadRoomBg}
          onRerollFrame={handleRerollFrame}
          onReplaceFrameImage={handleReplaceFrameImage}
          onLoadSample={handleLoadSample}
        />
      </div>

      <ExportBar
        trial={activeTrial}
        frames={visibleFrames}
        exportLayout={exportLayout}
        includeFlipped={includeFlipped}
        isExporting={isExporting}
        onChangeLayout={setExportLayout}
        onToggleIncludeFlipped={setIncludeFlipped}
        onExportZip={handleExportZip}
        onDownloadGif={handleDownloadGif}
        onDownloadPng={handleDownloadPng}
        onCopyAntigravityPrompt={handleCopyAntigravityPrompt}
      />

      {isRosterOpen && (
        <CatRosterDrawer
          isOpen={isRosterOpen}
          cats={cats}
          activeCatId={activeCatId}
          trialCounts={trialCounts}
          onClose={() => setIsRosterOpen(false)}
          onSelectCat={setActiveCatId}
          onCreateCat={handleCreateCat}
          onDeleteCat={handleDeleteCat}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          settings={apiSettings}
          envKeys={envKeys}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveApiSettings}
        />
      )}

      {toastMsg && (
        <div className="toast-banner" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

export default App
