import { Cat, Plus, Trash2, Upload, X } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { fileToDataUrl } from '../lib/storage'
import type { CatCharacter } from '../types/studio'

interface CatRosterDrawerProps {
  isOpen: boolean
  cats: CatCharacter[]
  activeCatId: string | null
  trialCounts: Record<string, number>
  onClose: () => void
  onSelectCat: (catId: string) => void
  onCreateCat: (cat: {
    name: string
    slug: string
    traits: string
    masterImageDataUrl: string
  }) => Promise<void>
  onDeleteCat: (catId: string) => Promise<void>
}

export function CatRosterDrawer({
  isOpen,
  cats,
  activeCatId,
  trialCounts,
  onClose,
  onSelectCat,
  onCreateCat,
  onDeleteCat,
}: CatRosterDrawerProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [traits, setTraits] = useState('')
  const [masterPreview, setMasterPreview] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const nextIndex = String(cats.length + 1).padStart(2, '0')

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setMasterPreview(dataUrl)
    if (!name) {
      const stem = file.name.replace(/\.[^.]+$/, '')
      setName(stem)
    }
    if (!slug) {
      setSlug(`cat_${nextIndex}`)
    }
  }

  const handleAdd = async () => {
    if (!masterPreview) {
      setError('新しい猫の「3面図Master画像」をアップロードしてください。')
      return
    }
    setError('')
    setIsAdding(true)
    try {
      await onCreateCat({
        name: name.trim() || `にゃんこ #${nextIndex}`,
        slug: slug.trim() || `cat_${nextIndex}`,
        traits: traits.trim(),
        masterImageDataUrl: masterPreview,
      })
      setName('')
      setSlug('')
      setTraits('')
      setMasterPreview('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-labelledby="roster-title">
      <div className="drawer-panel">
        <div className="modal-header">
          <div className="modal-title-row">
            <Cat size={20} />
            <h2 id="roster-title">15匹のにゃんこ管理ロスター（{cats.length}/15）</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="roster-list">
            {cats.map((c, idx) => {
              const active = c.id === activeCatId
              const count = trialCounts[c.id] || 0
              return (
                <div
                  key={c.id}
                  className={`roster-item ${active ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCat(c.id)
                    onClose()
                  }}
                >
                  <img
                    src={c.masterImageDataUrl}
                    alt={c.name}
                    className="roster-thumb"
                  />
                  <div className="roster-meta">
                    <div className="roster-name-row">
                      <span className="roster-num">#{String(idx + 1).padStart(2, '0')}</span>
                      <strong>{c.name}</strong>
                    </div>
                    <div className="roster-sub mono">
                      {c.slug} · 生成履歴 {count}件
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="この猫を削除"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`「${c.name}」とこの猫の生成履歴を削除しますか？`)) {
                        void onDeleteCat(c.id)
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
            {cats.length === 0 && (
              <p className="empty-hint">まだ猫が登録されていません。下から追加してください。</p>
            )}
          </div>

          <div className="roster-add-box">
            <h3>新しいにゃんこを追加</h3>
            <label className="upload-mini-box">
              {masterPreview ? (
                <img src={masterPreview} alt="新しい3面図プレビュー" className="mini-master-img" />
              ) : (
                <div className="upload-mini-placeholder">
                  <Upload size={18} />
                  <span>完成済みの3面図画像をアップロード</span>
                </div>
              )}
              <input type="file" accept="image/*" hidden onChange={handleFileChange} />
            </label>

            <div className="inline-two-col">
              <div>
                <label className="field-sublabel">表示名</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder={`例: クロ（黒猫）`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="field-sublabel">ゲーム用ID（ファイル名）</label>
                <input
                  type="text"
                  className="text-input mono"
                  placeholder={`cat_${nextIndex}_kuro`}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-sublabel">キャラ固定メモ（模様・首輪・特徴など英語/日本語可）</label>
              <input
                type="text"
                className="text-input"
                placeholder="例: 黒猫、黄色い目、青いリボン"
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button
              type="button"
              className="btn btn-primary full-width"
              onClick={handleAdd}
              disabled={isAdding}
            >
              <Plus size={16} />
              <span>{isAdding ? '追加中...' : 'この猫を登録して編集する'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
