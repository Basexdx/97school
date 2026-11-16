const BASE = '/lecture-libraries/'
const DATABASE = 'genius-lecture-libraries-v1'
const STORE = 'libraries'

const clean = (value, limit = 2000) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

export function validateLectureLibrary(input) {
  if (!input || input.schemaVersion !== 1 || ![7, 8, 9].includes(input.grade) || !Array.isArray(input.lessons) || input.lessons.length < 1 || input.lessons.length > 120) throw Error('Нужна библиотека лекций версии 1 для 7, 8 или 9 класса.')
  const id = clean(input.id, 80)
  if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(id)) throw Error('Неверный идентификатор библиотеки.')
  const seen = new Set()
  const lessons = input.lessons.map((lesson, index) => {
    const lessonId = clean(lesson?.id, 80)
    if (!/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(lessonId) || seen.has(lessonId) || !clean(lesson?.title) || !Array.isArray(lesson?.blocks) || !lesson.blocks.length || lesson.blocks.length > 12) throw Error(`Проверьте тему ${index + 1}: название, блоки и уникальный id обязательны.`)
    seen.add(lessonId)
    return {
      id: lessonId, title: clean(lesson.title, 160), section: clean(lesson.section, 100) || 'Другие темы',
      summary: clean(lesson.summary, 600), intro: clean(lesson.intro, 2500), takeaway: clean(lesson.takeaway, 2500),
      blocks: lesson.blocks.map(block => ({
        heading: clean(block.heading, 160), text: clean(block.text, 2500),
        equations: Array.isArray(block.equations) ? block.equations.slice(0, 8).map(x => clean(x, 300)).filter(Boolean) : [],
        symbols: clean(block.symbols, 2500), conditions: clean(block.conditions, 2500), source: clean(block.source, 100),
      })),
    }
  })
  return {schemaVersion: 1, id, grade: input.grade, title: clean(input.title, 160) || 'Библиотека лекций', description: clean(input.description, 500), source: clean(input.source, 500), lessons}
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {reject(Error('Локальное хранилище недоступно.'));return}
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, {keyPath: 'id'})
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storedLibraries() {
  const db = await openDatabase()
  try {return await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })} finally {db.close()}
}

export async function importLectureLibrary(file) {
  if (file.size > 2_000_000) throw Error('Размер библиотеки не должен превышать 2 МБ.')
  let parsed
  try {parsed = JSON.parse(await file.text())} catch {throw Error('Не удалось прочитать JSON-файл библиотеки.')}
  const library = validateLectureLibrary(parsed)
  if (/^genius-physics-[789]$/.test(library.id)) throw Error('Этот идентификатор занят встроенной библиотекой. Укажите свой id.')
  const db = await openDatabase()
  try {await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(library)
    request.onsuccess = resolve
    request.onerror = () => reject(request.error)
  })} finally {db.close()}
  return library
}

export async function loadLectureLibraries() {
  const response = await fetch(`${BASE}index.json`)
  if (!response.ok) throw Error('Каталог лекций недоступен.')
  const manifest = await response.json()
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.libraries)) throw Error('Неверный каталог лекций.')
  const bundled = await Promise.all(manifest.libraries.map(async item => {
    if (!/^grade-[789]\.json$/.test(item.file)) throw Error('Неверный путь библиотеки.')
    const result = await fetch(`${BASE}${item.file}`)
    if (!result.ok) throw Error(`Не удалось открыть ${item.file}.`)
    return validateLectureLibrary(await result.json())
  }))
  let imported = []
  try {imported = await storedLibraries()} catch { /* Built-in libraries still work when storage is blocked. */ }
  return [...bundled, ...imported.filter(library => !bundled.some(item => item.id === library.id))]
}
