import { Cat, KeyRound, Sparkles, Users } from 'lucide-react'
import { MODEL_CATALOG } from '../data/presets'
import type { ApiSettings, CatCharacter } from '../types/studio'

interface TopBarProps {
  activeCat: CatCharacter | null
  catCount: number
  apiSettings: ApiSettings
  envKeys: { openrouter: boolean; gemini: boolean; fal: boolean }
  onOpenRoster: () => void
  onOpenSettings: () => void
  onLoadSample: () => void
  isLoadingSample: boolean
}

export function TopBar({
  activeCat,
  catCount,
  apiSettings,
  envKeys,
  onOpenRoster,
  onOpenSettings,
  onLoadSample,
  isLoadingSample,
}: TopBarProps) {
  const hasActiveKey =
    (apiSettings.provider === 'openrouter' && (Boolean(apiSettings.openrouterKey) || envKeys.openrouter)) ||
    (apiSettings.provider === 'gemini' && (Boolean(apiSettings.geminiKey) || envKeys.gemini)) ||
    (apiSettings.provider === 'fal' && (Boolean(apiSettings.falKey) || envKeys.fal))

  const activeModelInfo = MODEL_CATALOG.find(
    (m) => m.provider === apiSettings.provider && m.id === apiSettings.model
  )

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-mark" aria-hidden="true">
          <Cat size={22} strokeWidth={2.1} />
        </div>
        <div>
          <h1 className="brand-title">Nyanko Sprite Studio</h1>
          <p className="brand-sub">
            3面図Masterからキャラ固定スプライトシート＆透過GIF生成 · Antigravity連携対応
          </p>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          id="btn-load-sample"
          type="button"
          className="btn btn-subtle"
          onClick={onLoadSample}
          disabled={isLoadingSample}
          title="サンプル三毛猫の3面図・歩きシート・和室背景を読み込みます"
        >
          <Sparkles size={16} />
          <span>{isLoadingSample ? '読込中...' : 'サンプル猫で試す'}</span>
        </button>

        <button
          id="btn-open-roster"
          type="button"
          className="btn btn-outline"
          onClick={onOpenRoster}
        >
          <Users size={16} />
          <span>
            {activeCat ? activeCat.name : '猫を選択'}
          </span>
          <span className="count-tag">{catCount}/15匹</span>
        </button>

        <button
          id="btn-open-settings"
          type="button"
          className={`btn ${hasActiveKey ? 'btn-outline' : 'btn-accent-soft'}`}
          onClick={onOpenSettings}
        >
          <KeyRound size={16} />
          <span>
            {hasActiveKey
              ? activeModelInfo
                ? `${activeModelInfo.approxCostJa}`
                : `${apiSettings.provider} 設定済`
              : 'API設定（0円手動も可）'}
          </span>
        </button>
      </div>
    </header>
  )
}
