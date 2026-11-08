import type { ApiSettings, CatCharacter, SpriteTrial } from '../types/studio'

const DB_NAME = 'nyanko-sprite-studio-db'
const DB_VERSION = 1
const STORE_CATS = 'cats'
const STORE_TRIALS = 'trials'
const API_SETTINGS_KEY = 'nyanko-studio-api-settings-v1'

export const DEFAULT_API_SETTINGS: ApiSettings = {
  provider: 'openrouter',
  model: 'black-forest-labs/flux-3-image-klein',
  resolution: '1K',
  openrouterKey: '',
  geminiKey: '',
  falKey: '',
}

export function loadApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(API_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_API_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<ApiSettings>
    return { ...DEFAULT_API_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_API_SETTINGS }
  }
}

export function saveApiSettings(settings: ApiSettings): void {
  localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(settings))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_CATS)) {
        db.createObjectStore(STORE_CATS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_TRIALS)) {
        const trialStore = db.createObjectStore(STORE_TRIALS, { keyPath: 'id' })
        trialStore.createIndex('byCatId', 'catId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllCats(): Promise<CatCharacter[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATS, 'readonly')
    const store = tx.objectStore(STORE_CATS)
    const req = store.getAll()
    req.onsuccess = () => {
      const items = (req.result as CatCharacter[]).sort((a, b) => a.createdAt - b.createdAt)
      resolve(items)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function putCat(cat: CatCharacter): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CATS, 'readwrite')
    tx.objectStore(STORE_CATS).put(cat)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteCatAndTrials(catId: string): Promise<void> {
  const db = await openDb()
  const trials = await getTrialsByCat(catId)
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CATS, STORE_TRIALS], 'readwrite')
    tx.objectStore(STORE_CATS).delete(catId)
    const trialStore = tx.objectStore(STORE_TRIALS)
    for (const t of trials) {
      trialStore.delete(t.id)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getTrialsByCat(catId: string): Promise<SpriteTrial[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRIALS, 'readonly')
    const idx = tx.objectStore(STORE_TRIALS).index('byCatId')
    const req = idx.getAll(catId)
    req.onsuccess = () => {
      const items = (req.result as SpriteTrial[]).sort((a, b) => b.createdAt - a.createdAt)
      resolve(items)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function putTrial(trial: SpriteTrial): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRIALS, 'readwrite')
    tx.objectStore(STORE_TRIALS).put(trial)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteTrial(trialId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRIALS, 'readwrite')
    tx.objectStore(STORE_TRIALS).delete(trialId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function urlToDataUrl(url: string): Promise<string> {
  const resp = await fetch(url)
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function createSampleCatAndTrial(): Promise<{
  cat: CatCharacter
  trial: SpriteTrial
}> {
  const [masterUrl, sheetUrl, roomUrl] = await Promise.all([
    urlToDataUrl('/samples/sample_cat_3view.jpg'),
    urlToDataUrl('/samples/sample_cat_walk_sheet.jpg'),
    urlToDataUrl('/samples/sample_room_bg.jpg'),
  ])

  const now = Date.now()
  const catId = `cat_sample_${now}`
  const cat: CatCharacter = {
    id: catId,
    slug: 'cat_01_mike',
    name: 'ミケ（サンプル三毛猫）',
    traits:
      'fluffy white calico cat with warm orange and charcoal black patches, amber eyes, red collar with golden bell, clean dark-brown cel-shaded outlines',
    masterImageDataUrl: masterUrl,
    roomBgDataUrl: roomUrl,
    createdAt: now,
    updatedAt: now,
  }

  const trial: SpriteTrial = {
    id: `trial_sample_${now}`,
    catId,
    label: 'サンプル歩き 8コマ',
    sourceType: 'sample',
    rawSheetDataUrl: sheetUrl,
    motionId: 'walk',
    styleId: 'original',
    facing: 'right',
    frameCount: 8,
    cols: 4,
    rows: 2,
    frameWidth: 256,
    frameHeight: 192,
    aspectPreset: '4:3',
    promptJa: '部屋の中をトコトコ歩く（サンプル）',
    promptEn:
      '2D game sprite sheet 4x2 grid of calico cat walking right smoothly, solid white background',
    fps: 9,
    playbackMode: 'loop',
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
    pixelArtCrisp: false,
    flipPreviewX: false,
    framesConfig: Array.from({ length: 8 }, (_, idx) => ({
      id: `f_${idx}`,
      sourceIndex: idx,
      enabled: true,
      offsetX: 0,
      offsetY: 0,
    })),
    createdAt: now,
  }

  await putCat(cat)
  await putTrial(trial)
  return { cat, trial }
}

let seedPromise: Promise<CatCharacter[]> | null = null

export async function loadOrSeedCats(): Promise<{
  cats: CatCharacter[]
  seededTrial?: SpriteTrial
}> {
  const existing = await getAllCats()
  if (existing.length > 0) {
    return { cats: existing }
  }
  if (!seedPromise) {
    seedPromise = (async () => {
      const { cat } = await createSampleCatAndTrial()
      return [cat]
    })().finally(() => {
      seedPromise = null
    })
  }
  const cats = await seedPromise
  const trials = cats[0] ? await getTrialsByCat(cats[0].id) : []
  return { cats, seededTrial: trials[0] }
}
