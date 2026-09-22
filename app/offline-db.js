'use client'

const DB_NAME = 'genius-offline'
const DB_VERSION = 1
const STORE_PACKAGES = 'packages'
const STORE_CONTENT = 'content'
const STORE_SYNC = 'syncQueue'
const STORE_META = 'meta'

function browserReady() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б'
  const units = ['Б', 'КБ', 'МБ', 'ГБ']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit < 2 ? 0 : value < 10 ? 1 : 0
  return `${value.toFixed(digits)} ${units[unit]}`
}

export function openOfflineDb() {
  if (!browserReady()) return Promise.reject(new Error('IndexedDB недоступна'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_PACKAGES)) {
        const store = db.createObjectStore(STORE_PACKAGES, { keyPath: 'id' })
        store.createIndex('grade', 'grade', { unique: false })
        store.createIndex('kind', 'kind', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_CONTENT)) {
        const store = db.createObjectStore(STORE_CONTENT, { keyPath: 'id' })
        store.createIndex('packageId', 'packageId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_SYNC)) {
        const store = db.createObjectStore(STORE_SYNC, { keyPath: 'eventId' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Не удалось открыть IndexedDB'))
  })
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Ошибка IndexedDB'))
  })
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Ошибка транзакции IndexedDB'))
    tx.onabort = () => reject(tx.error || new Error('Транзакция IndexedDB отменена'))
  })
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export async function getOfflineState() {
  if (!browserReady()) return { supported: false, packages: [], pending: [], usedBytes: 0 }
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_SYNC], 'readonly')
  const [packages, queue] = await Promise.all([
    requestToPromise(tx.objectStore(STORE_PACKAGES).getAll()),
    requestToPromise(tx.objectStore(STORE_SYNC).getAll()),
  ])
  await transactionDone(tx)
  const pending = queue.filter(item => item.status !== 'SYNCED')
  const usedBytes = packages.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0)
  return { supported: true, packages, pending, usedBytes }
}

function makeTopicPayload({ id, grade, title, meta, contentVersion = 1 }) {
  return {
    id: `${id}:content`,
    packageId: id,
    contentVersion,
    grade,
    title,
    savedAt: new Date().toISOString(),
    theory: [
      `Офлайн-конспект темы «${title}».`,
      'Основные определения и формулы сохраняются на устройстве после загрузки пакета.',
      'Результаты офлайн-работы попадают в очередь синхронизации и подтверждаются сервером при появлении интернета.',
    ],
    examples: [
      { id: `${id}:example:1`, title: 'Разобранный пример', body: 'Демонстрационный пример для проверки offline-first механики.' },
    ],
    tasks: [
      { id: `${id}:task:1`, text: 'Демонстрационное задание доступно без сети после загрузки темы.', answerType: 'single_choice' },
    ],
    meta,
  }
}

export async function downloadTopicPackage({ grade, topic, topicIndex }) {
  const id = `grade-${grade}:topic-${topicIndex}`
  const payload = makeTopicPayload({ id, grade, title: topic.title, meta: topic.meta })
  const sizeBytes = new Blob([JSON.stringify(payload)]).size
  const record = {
    id,
    kind: 'TOPIC',
    grade,
    title: topic.title,
    subtitle: topic.meta,
    contentVersion: 1,
    status: 'READY',
    sizeBytes,
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).put(record)
  tx.objectStore(STORE_CONTENT).put(payload)
  await transactionDone(tx)
  return record
}


export async function downloadLessonPackage(lesson) {
  const id = `grade-8:lesson-${lesson.paragraph}`
  const payload = {
    id: `${id}:content`,
    packageId: id,
    contentVersion: 1,
    grade: 8,
    lessonId: lesson.id,
    paragraph: lesson.paragraph,
    title: lesson.title,
    pages: lesson.pages,
    objectives: lesson.objectives || [],
    keyPoints: lesson.keyPoints || [],
    steps: lesson.steps || [],
    quiz: lesson.quiz || [],
    formula: lesson.formula || null,
    savedAt: new Date().toISOString(),
  }
  const sizeBytes = new Blob([JSON.stringify(payload)]).size
  const record = {
    id,
    kind: 'LESSON',
    grade: 8,
    title: `§${lesson.paragraph}. ${lesson.shortTitle || lesson.title}`,
    subtitle: `8 класс · стр. ${lesson.pages}`,
    contentVersion: 1,
    status: 'READY',
    sizeBytes,
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).put(record)
  tx.objectStore(STORE_CONTENT).put(payload)
  await transactionDone(tx)
  return record
}

export async function downloadGradePackage(grade, topics = []) {
  const id = `grade-${grade}:full-course`
  const content = topics.map((topic, topicIndex) => makeTopicPayload({
    id: `grade-${grade}:topic-${topicIndex}`,
    grade,
    title: topic.title,
    meta: topic.meta,
  }))
  const sizeBytes = new Blob([JSON.stringify(content)]).size
  const record = {
    id,
    kind: 'GRADE',
    grade,
    title: `${grade} класс — весь курс`,
    subtitle: `${topics.length} разделов`,
    contentVersion: 1,
    status: 'READY',
    sizeBytes,
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).put(record)
  tx.objectStore(STORE_CONTENT).put({ id: `${id}:content`, packageId: id, contentVersion: 1, grade, topics: content })
  await transactionDone(tx)
  return record
}


export async function downloadGradeLessonsPackage(grade, lessons = []) {
  const id = `grade-${grade}:lesson-course`
  const content = lessons.map((lesson) => ({
    lessonId: lesson.id,
    paragraph: lesson.paragraph,
    title: lesson.title,
    shortTitle: lesson.shortTitle,
    pages: lesson.pages,
    duration: lesson.duration,
    teaser: lesson.teaser,
    objectives: lesson.objectives || [],
    keyPoints: lesson.keyPoints || [],
    steps: lesson.steps || [],
    quiz: lesson.quiz || [],
    formula: lesson.formula || null,
  }))
  const sizeBytes = new Blob([JSON.stringify(content)]).size
  const record = {
    id,
    kind: 'GRADE',
    grade,
    title: `${grade} класс — уроки по учебнику`,
    subtitle: `${lessons.length} уроков`,
    contentVersion: 1,
    status: 'READY',
    sizeBytes,
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).put(record)
  tx.objectStore(STORE_CONTENT).put({ id: `${id}:content`, packageId: id, contentVersion: 1, grade, lessons: content })
  await transactionDone(tx)
  return record
}

export async function removeOfflinePackage(packageId) {
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).delete(packageId)
  const index = tx.objectStore(STORE_CONTENT).index('packageId')
  const keys = await requestToPromise(index.getAllKeys(IDBKeyRange.only(packageId)))
  for (const key of keys) tx.objectStore(STORE_CONTENT).delete(key)
  await transactionDone(tx)
}

export async function clearOfflinePackages() {
  const db = await openOfflineDb()
  const tx = db.transaction([STORE_PACKAGES, STORE_CONTENT], 'readwrite')
  tx.objectStore(STORE_PACKAGES).clear()
  tx.objectStore(STORE_CONTENT).clear()
  await transactionDone(tx)
}

export async function queueSyncEvent(type, payload = {}) {
  const db = await openOfflineDb()
  const event = {
    eventId: uuid(),
    type,
    payload,
    status: 'PENDING',
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  }
  const tx = db.transaction(STORE_SYNC, 'readwrite')
  tx.objectStore(STORE_SYNC).put(event)
  await transactionDone(tx)
  return event
}

export async function syncPendingEvents() {
  if (!browserReady() || !navigator.onLine) return { ok: false, offline: true, synced: 0 }
  const db = await openOfflineDb()
  const readTx = db.transaction(STORE_SYNC, 'readonly')
  const all = await requestToPromise(readTx.objectStore(STORE_SYNC).getAll())
  await transactionDone(readTx)
  const pending = all.filter(item => item.status !== 'SYNCED').slice(0, 100)
  if (!pending.length) return { ok: true, synced: 0, results: [] }

  let response
  try {
    response = await fetch('/api/student/sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: pending.map(({ eventId, type, payload, createdAt }) => ({ eventId, type, payload, createdAt })) }),
    })
  } catch (error) {
    return { ok: false, networkError: true, synced: 0, error: String(error) }
  }

  if (!response.ok) {
    return { ok: false, synced: 0, status: response.status, error: `HTTP ${response.status}` }
  }

  const data = await response.json()
  const resultMap = new Map((data.results || []).map(item => [item.eventId, item]))
  const writeTx = db.transaction(STORE_SYNC, 'readwrite')
  const store = writeTx.objectStore(STORE_SYNC)
  for (const item of pending) {
    const result = resultMap.get(item.eventId)
    if (!result) continue
    if (result.status === 'ACCEPTED' || result.status === 'DUPLICATE') {
      store.delete(item.eventId)
    } else {
      store.put({ ...item, attempts: Number(item.attempts || 0) + 1, lastError: result.error || 'rejected' })
    }
  }
  await transactionDone(writeTx)
  return { ok: true, synced: (data.results || []).filter(r => r.status === 'ACCEPTED' || r.status === 'DUPLICATE').length, results: data.results || [] }
}
