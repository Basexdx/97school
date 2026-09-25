'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getGrade8Lesson } from './grade8-lessons'

const TABS = [
  ['theory', '▤', 'Теория'],
  ['definitions', '▣', 'Определения'],
  ['formulas', '∑', 'Формулы'],
  ['examples', '◉', 'Примеры'],
  ['interactive', '▷', 'Интерактив'],
]

function lessonChapter(lesson) {
  return lesson.chapter === 'electric' ? 'Глава 2. Электрические явления' : 'Глава 1. Тепловые явления'
}

function lessonGlyph(type = '') {
  if (/brownian|diffusion|particle|gas|liquid|solid|crystal/.test(type)) return '●'
  if (/heat|temperature|fuel|phase|boil|vapor|evap|energy|engine|turbine/.test(type)) return '♨'
  if (/electric|charge|coulomb|field|current|circuit|ohm|voltage|resistance|electron|atom/.test(type)) return 'ϟ'
  return '◆'
}

function HeroScience({ paragraph }) {
  const electric = paragraph >= 27
  return (
    <div className={`cosmic-hero-science ${electric ? 'electric' : 'thermal'}`} aria-hidden="true">
      <i className="cosmic-orbit cosmic-orbit-a" />
      <i className="cosmic-orbit cosmic-orbit-b" />
      <i className="cosmic-orbit cosmic-orbit-c" />
      <b className="cosmic-nucleus" />
      <span className="cosmic-electron e1" />
      <span className="cosmic-electron e2" />
      <span className="cosmic-electron e3" />
      <em>{electric ? 'ϟ' : 'Q'}</em>
    </div>
  )
}

function ParticleInteractive() {
  const [speed, setSpeed] = useState(52)
  return (
    <div className="cosmic-interactive-stage">
      <div className="cosmic-particle-box" style={{ '--motion': `${Math.max(1.1, 4.2 - speed / 28)}s` }}>
        {Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ '--i': index }} />)}
      </div>
      <label className="cosmic-control-row">
        <span>Интенсивность движения</span>
        <input type="range" min="10" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        <b>{speed}%</b>
      </label>
      <p>Изменяй параметр и наблюдай, как меняется движение частиц в модели.</p>
    </div>
  )
}

function HeatInteractive() {
  const [mass, setMass] = useState(2)
  const [delta, setDelta] = useState(30)
  const value = Math.round(mass * delta)
  return (
    <div className="cosmic-interactive-stage cosmic-heat-stage">
      <div className="cosmic-heat-visual">
        <div className="cosmic-beaker"><i style={{ height: `${28 + mass * 11}%` }} /></div>
        <div className="cosmic-heat-rays">⌁⌁⌁</div>
        <div className="cosmic-heat-readout"><span>Относительная энергия</span><b>{value}</b><small>условных единиц</small></div>
      </div>
      <label className="cosmic-control-row"><span>Масса</span><input type="range" min="1" max="5" step="0.5" value={mass} onChange={(event) => setMass(Number(event.target.value))} /><b>{mass.toFixed(1)} кг</b></label>
      <label className="cosmic-control-row"><span>Изменение температуры</span><input type="range" min="5" max="80" step="5" value={delta} onChange={(event) => setDelta(Number(event.target.value))} /><b>{delta} °C</b></label>
    </div>
  )
}

function EnergyInteractive({ paragraph }) {
  const phase = paragraph <= 22
  const labels = phase ? ['Жидкость', 'Переход', 'Пар'] : ['Источник энергии', 'Рабочее тело', 'Работа']
  return (
    <div className="cosmic-interactive-stage">
      <div className="cosmic-energy-flow">
        {labels.map((label, index) => <div className="cosmic-flow-fragment" key={label}><b>{label}</b>{index < labels.length - 1 && <span>→</span>}</div>)}
      </div>
      <p>Проследи цепочку превращений энергии и свяжи её с объяснением из урока.</p>
    </div>
  )
}

function ChargeInteractive({ paragraph }) {
  if (paragraph >= 37) return <OhmInteractive />
  if (paragraph >= 32) {
    return (
      <div className="cosmic-interactive-stage">
        <div className="cosmic-circuit-model">
          <span className="cosmic-battery">+ | | −</span><i className="wire w1" /><b className="cosmic-lamp">✦</b><i className="wire w2" /><span className="cosmic-switch">/</span>
        </div>
        <p>Замкни мысленно цепь: источник создаёт условия для направленного движения зарядов по проводнику.</p>
      </div>
    )
  }
  return (
    <div className="cosmic-interactive-stage">
      <div className="cosmic-charge-model"><b>+</b><span>← →</span><b className="negative">−</b></div>
      <div className="cosmic-charge-model"><b>+</b><span>→ ←</span><b>+</b></div>
      <p>Сравни два случая взаимодействия электрических зарядов.</p>
    </div>
  )
}

function OhmInteractive() {
  const [u, setU] = useState(6)
  const [r, setR] = useState(3)
  const current = (u / r).toFixed(1)
  return (
    <div className="cosmic-interactive-stage cosmic-ohm-stage">
      <div className="cosmic-ohm-result"><span>I = U / R</span><b>{current} А</b></div>
      <label className="cosmic-control-row"><span>Напряжение U</span><input type="range" min="1" max="12" value={u} onChange={(event) => setU(Number(event.target.value))} /><b>{u} В</b></label>
      <label className="cosmic-control-row"><span>Сопротивление R</span><input type="range" min="1" max="10" value={r} onChange={(event) => setR(Number(event.target.value))} /><b>{r} Ом</b></label>
    </div>
  )
}

function CosmicInteractive({ lesson }) {
  if (lesson.paragraph <= 4) return <ParticleInteractive />
  if (lesson.paragraph <= 18) return <HeatInteractive />
  if (lesson.paragraph <= 26) return <EnergyInteractive paragraph={lesson.paragraph} />
  return <ChargeInteractive paragraph={lesson.paragraph} />
}

function TheoryTab({ lesson, steps }) {
  const summary = steps.find((item) => item.type === 'summary')?.text || lesson.keyPoints.at(-1) || lesson.teaser
  const cards = steps.filter((item) => item.type !== 'summary')
  return (
    <>
      <div className="cosmic-intro-grid">
        <article className="cosmic-panel cosmic-intro-card">
          <div className="cosmic-card-heading"><span>▤</span><h2>Введение</h2></div>
          <p>{lesson.teaser}</p>
        </article>
        <article className="cosmic-panel cosmic-definition-card">
          <div className="cosmic-card-heading"><span>✦</span><h2>Главная идея</h2></div>
          <p>{lesson.keyPoints[0] || lesson.teaser}</p>
        </article>
      </div>

      <section className="cosmic-content-section">
        <div className="cosmic-section-heading"><span>01</span><div><small>ТЕОРИЯ ПАРАГРАФА</small><h2>Разберём по шагам</h2></div></div>
        <div className="cosmic-theory-grid">
          {cards.map((item, index) => (
            <article className="cosmic-panel cosmic-theory-card" key={`${item.title}-${index}`}>
              <div className="cosmic-theory-number">{index + 1}</div>
              <div className="cosmic-mini-visual"><i>{lessonGlyph(item.type)}</i><span /><span /><span /></div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cosmic-interactive-preview cosmic-panel">
        <div><small>ИНТЕРАКТИВ</small><h2>Посмотри явление в модели</h2><p>Модель дополняет старый материал урока и помогает увидеть физический смысл.</p></div>
        <CosmicInteractive lesson={lesson} />
      </section>

      <div className="cosmic-conclusion"><span>✓</span><div><strong>Вывод</strong><p>{summary}</p></div></div>
    </>
  )
}

function DefinitionsTab({ lesson, steps }) {
  const items = steps.filter((item) => item.type !== 'summary').slice(0, 8)
  return (
    <section className="cosmic-tab-page">
      <div className="cosmic-section-heading"><span>02</span><div><small>ОПРЕДЕЛЕНИЯ</small><h2>Ключевые понятия §{lesson.paragraph}</h2></div></div>
      <div className="cosmic-definition-grid">
        {items.map((item, index) => <article className="cosmic-panel" key={`${item.title}-${index}`}><span className="cosmic-term-index">{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}
      </div>
    </section>
  )
}

function FormulasTab({ lesson }) {
  return (
    <section className="cosmic-tab-page">
      <div className="cosmic-section-heading"><span>03</span><div><small>ФОРМУЛЫ</small><h2>Формулы и обозначения</h2></div></div>
      {lesson.formula ? <div className="cosmic-formula-layout"><article className="cosmic-panel cosmic-formula-main"><small>ОСНОВНАЯ ФОРМУЛА</small><strong>{lesson.formula}</strong></article><article className="cosmic-panel"><h3>Как читать формулу</h3><p>Сопоставь обозначения с физическими величинами из текста урока и обращай внимание на единицы измерения.</p></article></div> : <article className="cosmic-panel cosmic-no-formula"><span>◆</span><div><h3>Отдельной расчётной формулы в этом параграфе нет</h3><p>Здесь главное — понять физическое явление, определения и связи между величинами. Все исходные идеи сохранены из старого урока.</p></div></article>}
      <div className="cosmic-keypoints">
        {lesson.keyPoints.map((point, index) => <article className="cosmic-panel" key={point}><b>{index + 1}</b><p>{point}</p></article>)}
      </div>
    </section>
  )
}

function ExamplesTab({ lesson, steps }) {
  const examples = steps.filter((item) => item.type !== 'summary').slice(-3)
  return (
    <section className="cosmic-tab-page">
      <div className="cosmic-section-heading"><span>04</span><div><small>ПРИМЕРЫ</small><h2>Свяжи идею с физическим смыслом</h2></div></div>
      <div className="cosmic-examples-grid">
        {examples.map((item, index) => <article className="cosmic-panel cosmic-example-card" key={`${item.title}-${index}`}><div className="cosmic-example-icon">{lessonGlyph(item.type)}</div><div><small>ПРИМЕР {index + 1}</small><h3>{item.title}</h3><p>{item.text}</p></div></article>)}
      </div>
      <div className="cosmic-conclusion compact"><span>✓</span><div><strong>Главное</strong><p>{lesson.keyPoints.at(-1) || lesson.teaser}</p></div></div>
    </section>
  )
}

function InteractiveTab({ lesson }) {
  return (
    <section className="cosmic-tab-page">
      <div className="cosmic-section-heading"><span>05</span><div><small>ИНТЕРАКТИВ</small><h2>Модель к §{lesson.paragraph}</h2></div></div>
      <article className="cosmic-panel cosmic-interactive-full"><div><h3>{lesson.shortTitle}</h3><p>{lesson.teaser}</p></div><CosmicInteractive lesson={lesson} /></article>
    </section>
  )
}

function CosmicLessonView({ lesson, host }) {
  const [tab, setTab] = useState('theory')
  const steps = useMemo(() => lesson.steps?.length ? lesson.steps : lesson.keyPoints.map((text, index) => ({ type: 'concept', title: `Ключевая мысль ${index + 1}`, text })), [lesson])

  useEffect(() => setTab('theory'), [lesson.id])

  function clickOriginal(selector) {
    const button = host.querySelector(selector)
    if (button) button.click()
  }

  return (
    <div className="cosmic-lesson-root">
      <div className="cosmic-lesson-space" aria-hidden="true"><i /><i /><i /></div>
      <div className="cosmic-lesson-toolbar">
        <button onClick={() => clickOriginal('.lesson-dark-topbar > button:first-child')}>← К урокам</button>
        <span>Физика 8 класс</span>
        <button onClick={() => clickOriginal('.lesson-dark-topbar > button:last-child')}>⇩ Скачать офлайн</button>
      </div>

      <header className="cosmic-lesson-hero">
        <div className="cosmic-breadcrumb">Физика 8 класс <b>›</b> {lessonChapter(lesson)} <b>›</b> §{lesson.paragraph}</div>
        <div className="cosmic-hero-grid">
          <div className="cosmic-paragraph-mark">§{lesson.paragraph}</div>
          <div className="cosmic-hero-copy"><h1>{lesson.title}</h1><p>{lesson.teaser}</p><div className="cosmic-meta"><span>◷ ~{lesson.duration} мин</span><span>▣ стр. {lesson.pages}</span><span>◆ {lesson.objectives.length} цели</span></div></div>
          <HeroScience paragraph={lesson.paragraph} />
        </div>
      </header>

      <nav className="cosmic-lesson-tabs" aria-label="Разделы урока">
        {TABS.map(([id, icon, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><span>{icon}</span>{label}</button>)}
      </nav>

      <main className="cosmic-lesson-content">
        {tab === 'theory' && <TheoryTab lesson={lesson} steps={steps} />}
        {tab === 'definitions' && <DefinitionsTab lesson={lesson} steps={steps} />}
        {tab === 'formulas' && <FormulasTab lesson={lesson} />}
        {tab === 'examples' && <ExamplesTab lesson={lesson} steps={steps} />}
        {tab === 'interactive' && <InteractiveTab lesson={lesson} />}
      </main>
    </div>
  )
}

export default function CosmicLessonMount() {
  const [mount, setMount] = useState(null)

  useEffect(() => {
    let lastNode = null
    let lastId = ''
    const sync = () => {
      const node = document.querySelector('.lesson-dark-shell')
      const paragraphText = node?.querySelector('.lesson-dark-topbar b')?.textContent || ''
      const paragraph = Number(paragraphText.replace(/\D/g, ''))
      const id = paragraph ? `8-${paragraph}` : ''
      if (node === lastNode && id === lastId) return
      lastNode = node
      lastId = id
      setMount(node && id ? { node, id } : null)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = mount?.node
    if (!node) return undefined
    node.classList.add('cosmic-enhanced')
    return () => node.classList.remove('cosmic-enhanced')
  }, [mount?.node, mount?.id])

  if (!mount) return null
  const lesson = getGrade8Lesson(mount.id)
  if (!lesson) return null
  return createPortal(<CosmicLessonView key={lesson.id} lesson={lesson} host={mount.node} />, mount.node)
}
