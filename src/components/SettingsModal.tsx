import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { MODEL_CATALOG } from '../data/presets'
import type { ApiSettings, ProviderId } from '../types/studio'

interface SettingsModalProps {
  isOpen: boolean
  settings: ApiSettings
  envKeys: { openrouter: boolean; gemini: boolean; fal: boolean }
  onClose: () => void
  onSave: (next: ApiSettings) => void
}

export function SettingsModal({
  isOpen,
  settings,
  envKeys,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [draft, setDraft] = useState<ApiSettings>(settings)
  const [showKeys, setShowKeys] = useState(false)

  if (!isOpen) return null

  const providerModels = MODEL_CATALOG.filter((m) => m.provider === draft.provider)

  const handleProviderChange = (provider: ProviderId) => {
    const firstModel = MODEL_CATALOG.find((m) => m.provider === provider)
    setDraft((prev) => ({
      ...prev,
      provider,
      model: firstModel ? firstModel.id : prev.model,
    }))
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-card modal-wide">
        <div className="modal-header">
          <div className="modal-title-row">
            <KeyRound size={20} />
            <h2 id="settings-title">AI生成エンジン ＆ APIキー設定</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="info-banner">
            <strong>完全0円で試したい場合：</strong>
            APIキーを設定しなくても、左パネルの「0円手動連携」タブから最適プロンプトをコピーし、無料の Gemini Webアプリ等で生成した画像をドロップすれば全機能（自動切り出し・背景透過・位置揃え・プレスト再生・ZIP出力）を使えます。
          </div>

          <div className="form-section">
            <label className="field-label">1. プロバイダ選択</label>
            <div className="segmented-row">
              <button
                type="button"
                className={`seg-btn ${draft.provider === 'openrouter' ? 'active' : ''}`}
                onClick={() => handleProviderChange('openrouter')}
              >
                OpenRouter（推奨・1キーで全モデル）
              </button>
              <button
                type="button"
                className={`seg-btn ${draft.provider === 'gemini' ? 'active' : ''}`}
                onClick={() => handleProviderChange('gemini')}
              >
                Gemini API 直接
              </button>
              <button
                type="button"
                className={`seg-btn ${draft.provider === 'fal' ? 'active' : ''}`}
                onClick={() => handleProviderChange('fal')}
              >
                fal.ai 直接
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="field-label">2. 使用モデル（コストと精度の選択）</label>
            <div className="model-grid">
              {providerModels.map((item) => {
                const selected = draft.model === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`model-card ${selected ? 'selected' : ''}`}
                    onClick={() => setDraft((p) => ({ ...p, model: item.id }))}
                  >
                    <div className="model-card-top">
                      <span className="model-badge">{item.badge}</span>
                      <span className="model-cost">{item.approxCostJa}</span>
                    </div>
                    <div className="model-name">{item.label}</div>
                    <div className="model-note">{item.note}</div>
                  </button>
                )
              })}
            </div>

            <div className="inline-two-col" style={{ marginTop: 10 }}>
              <div>
                <label className="field-sublabel" htmlFor="custom-model-slug">
                  モデルID（直接指定も可）
                </label>
                <input
                  id="custom-model-slug"
                  type="text"
                  className="text-input mono"
                  value={draft.model}
                  onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-sublabel" htmlFor="gen-resolution">
                  AI生成時の基準解像度
                </label>
                <select
                  id="gen-resolution"
                  className="text-input"
                  value={draft.resolution}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      resolution: e.target.value as ApiSettings['resolution'],
                    }))
                  }
                >
                  <option value="1K">1K（標準・最安でトライ＆エラー向け）</option>
                  <option value="2K">2K（高精細・12〜16コマの本番生成向け）</option>
                  <option value="512">512（対応モデルのみの超軽量）</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="label-row">
              <label className="field-label">3. APIキー（ブラウザ内保存 / .env 併用可）</label>
              <button
                type="button"
                className="text-link-btn"
                onClick={() => setShowKeys((v) => !v)}
              >
                {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showKeys ? '隠す' : '表示'}</span>
              </button>
            </div>

            <div className="key-inputs">
              <div>
                <label className="field-sublabel" htmlFor="key-openrouter">
                  OpenRouter API Key {envKeys.openrouter ? '（.envで検出済み）' : ''}
                </label>
                <input
                  id="key-openrouter"
                  type={showKeys ? 'text' : 'password'}
                  className="text-input mono"
                  placeholder="sk-or-v1-..."
                  value={draft.openrouterKey}
                  onChange={(e) => setDraft((p) => ({ ...p, openrouterKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-sublabel" htmlFor="key-gemini">
                  Gemini API Key {envKeys.gemini ? '（.envで検出済み）' : ''}
                </label>
                <input
                  id="key-gemini"
                  type={showKeys ? 'text' : 'password'}
                  className="text-input mono"
                  placeholder="AIza..."
                  value={draft.geminiKey}
                  onChange={(e) => setDraft((p) => ({ ...p, geminiKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-sublabel" htmlFor="key-fal">
                  fal.ai API Key {envKeys.fal ? '（.envで検出済み）' : ''}
                </label>
                <input
                  id="key-fal"
                  type={showKeys ? 'text' : 'password'}
                  className="text-input mono"
                  placeholder="key_..."
                  value={draft.falKey}
                  onChange={(e) => setDraft((p) => ({ ...p, falKey: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            キャンセル
          </button>
          <button
            id="btn-save-settings"
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onSave(draft)
              onClose()
            }}
          >
            <Check size={16} />
            <span>設定を保存</span>
          </button>
        </div>
      </div>
    </div>
  )
}
