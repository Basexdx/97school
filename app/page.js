'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import UnifiedTaskBank from './unified-task-bank'
import {bankPendingLocal,syncBankAttempts} from './task-store'
import {TASK_BANK_VERSION} from '../shared/task-bank-meta.mjs'
import { clearOfflinePackages, downloadGradeLessonsPackage, downloadGradePackage, downloadLessonPackage, downloadTopicPackage, formatBytes, getOfflineState, queueSyncEvent, removeOfflinePackage, syncPendingEvents } from './offline-db'
import { grade8Chapters, grade8Lessons, getGrade8Lesson, getGrade8ChapterLessons } from './grade8-lessons'
import {LabsPlaceholder,StudentPerformance,TeacherAcademic} from './performance-v2'

const topicsByGrade = {
  7: [
    { title: 'Механическое движение', meta: '9 тем · 176 задач', progress: 72, tone: 'green', icon: '↗' },
    { title: 'Плотность вещества', meta: '6 тем · 104 задачи', progress: 45, tone: 'violet', icon: '◆' },
    { title: 'Сила и давление', meta: '8 тем · 151 задача', progress: 18, tone: 'orange', icon: '⬡' },
    { title: 'Работа и мощность', meta: '5 тем · 92 задачи', progress: 0, tone: 'slate', icon: '⚙' },
  ],
  8: [
    { title: 'Тепловые явления', meta: '§1–§26 · интерактивные уроки', progress: 0, tone: 'green', icon: '♨' },
    { title: 'Электрические явления', meta: '§27–§40 · интерактивные уроки', progress: 0, tone: 'violet', icon: 'ϟ' },
  ],
  9: [
    { title: 'Механика', meta: '12 тем · 248 задач', progress: 60, tone: 'green', icon: '1' },
    { title: 'Тепловые явления', meta: '8 тем · 193 задачи', progress: 20, tone: 'violet', icon: '2' },
    { title: 'Электрические явления', meta: '10 тем · 221 задача', progress: 0, tone: 'orange', icon: '3' },
    { title: 'Электромагнитные явления', meta: '6 тем · 140 задач', progress: 0, tone: 'slate', icon: '4' },
    { title: 'Оптические явления', meta: '5 тем · 98 задач', progress: 0, tone: 'slate', icon: '5' },
    { title: 'Строение атома и атомного ядра', meta: '4 темы · 73 задачи', progress: 0, tone: 'slate', icon: '6' },
  ],
}

const leaderboard = [
  ['PhysMaster', 2840, '👩🏻'],
  ['Катя', 2610, '👧🏻'],
  ['Newton_77', 2480, '👦🏻'],
  ['MaxVolt', 2350, '🧑🏻'],
  ['Лиза_Ф', 2120, '👩🏼'],
]

const quiz = [
  {
    q: 'Автомобиль движется со скоростью 72 км/ч. Какой путь он пройдёт за 25 с?',
    options: ['360 м', '500 м', '720 м', '1800 м'],
    correct: 1,
  },
  {
    q: 'Как называется движение, при котором скорость тела за равные промежутки времени изменяется одинаково?',
    options: ['Равномерное', 'Равноускоренное', 'Колебательное', 'Вращательное'],
    correct: 1,
  },
  {
    q: 'За что в Genius начисляется основной XP по теме?',
    options: ['За открытие темы', 'За просмотр теории', 'За успешное тестирование', 'За вход в профиль'],
    correct: 2,
  },
]

const navItems = [
  ['home', '⌂', 'Главная'],
  ['practice', '◇', 'Задачник'],
  ['topics', '▦', 'Учебник'],
  ['oge', '◈', 'Подготовка к ОГЭ'],
  ['labs', '⚗', 'Лабораторные работы'],
  ['performance', '⌁', 'Успеваемость'],
  ['offline', '⇩', 'Офлайн-материалы'],
  ['profile', '○', 'Профиль'],
]

const DEMO_CODE = 'GNS-8K4P-X7M2'

function AtomMark() {
  return <span className="atom-mark" aria-hidden="true"><i className="atom-nucleus"/><i className="atom-orbit atom-o1"/><i className="atom-orbit atom-o2"/><i className="atom-orbit atom-o3"/></span>
}

function Brand({ dark = false, onClick }) {
  return (
    <button className={`brand-lockup ${dark ? 'brand-lockup-dark' : ''}`} onClick={onClick}>
      <AtomMark/><span>Genius</span>
    </button>
  )
}

function Landing({ onStudentAccess, onTeacherLogin }) {
  return (
    <main className="landing-page landing-v15-page">
      <section className="landing-card landing-v15-card">
        <nav className="landing-nav landing-v15-nav" aria-label="Главная навигация">
          <Brand dark onClick={() => {}} />
          <div className="landing-v15-menu">
            <a href="#features">Возможности</a>
            <a href="#program">Программа</a>
            <a href="#oge">ОГЭ</a>
            <button onClick={onTeacherLogin}>Для учителей</button>
            <a href="#features">Тарифы</a>
            <a href="#about">О нас</a>
          </div>
          <div className="landing-v15-nav-actions">
            <button className="landing-v15-nav-student" onClick={onStudentAccess}>Войти как ученик</button>
            <button className="landing-v15-nav-teacher" onClick={onTeacherLogin}>Войти как учитель</button>
          </div>
        </nav>
        <div className="landing-grid landing-v15-grid">
          <div className="landing-copy landing-v15-copy">
            <span className="landing-eyebrow">ФИЗИКА · 7–9 КЛАСС</span>
            <h1>Понимай<br/>физику. <span>Решай</span><br/><span>уверенно.</span></h1>
            <p>Учебник, задачи, лабораторные работы и подготовка к ОГЭ — в одной системе.</p>
            <div className="landing-v15-cta">
              <button className="blue-btn" onClick={onStudentAccess}>Войти как ученик <span aria-hidden="true">→</span></button>
              <button className="ghost-dark" onClick={onTeacherLogin}>Войти как учитель <span aria-hidden="true">→</span></button>
            </div>
            <div className="landing-v15-assurance" id="benefits">
              <span><i aria-hidden="true">✓</i> Работает на всех устройствах</span>
              <span><i aria-hidden="true">✓</i> Прогресс сохраняется</span>
              <span><i aria-hidden="true">✓</i> Доступно офлайн</span>
            </div>
          </div>
          <div className="landing-v15-visual" aria-hidden="true">
            <div className="landing-v15-horizon" />
            <div className="landing-v15-planet landing-v15-planet-left" />
            <div className="landing-v15-planet landing-v15-planet-right" />
            <span className="landing-v15-formula landing-v15-formula-one">E = mc²</span>
            <span className="landing-v15-formula landing-v15-formula-two">F = ma</span>
            <span className="landing-v15-formula landing-v15-formula-three">v = s/t</span>
            <div className="landing-v15-atom">
              <div className="landing-v15-nucleus" />
              <div className="landing-v15-orbit landing-v15-orbit-one"><i /></div>
              <div className="landing-v15-orbit landing-v15-orbit-two"><i /></div>
              <div className="landing-v15-orbit landing-v15-orbit-three"><i /></div>
            </div>
          </div>
        </div>
        <section className="landing-v15-features" id="features" aria-label="Разделы Genius">
          <article className="landing-v15-feature" id="program">
            <span className="landing-v15-feature-icon" aria-hidden="true">▤</span>
            <div><strong>Учебник</strong><span>Понятная теория с примерами и схемами.</span></div>
            <span className="landing-v15-feature-arrow" aria-hidden="true">→</span>
          </article>
          <article className="landing-v15-feature">
            <span className="landing-v15-feature-icon" aria-hidden="true">☷</span>
            <div><strong>Задачи</strong><span>Практика по темам с решениями и подсказками.</span></div>
            <span className="landing-v15-feature-arrow" aria-hidden="true">→</span>
          </article>
          <article className="landing-v15-feature">
            <span className="landing-v15-feature-icon" aria-hidden="true">⚗</span>
            <div><strong>Лабораторные работы</strong><span>Интерактивные модели и практические опыты.</span></div>
            <span className="landing-v15-feature-arrow" aria-hidden="true">→</span>
          </article>
          <article className="landing-v15-feature" id="oge">
            <span className="landing-v15-feature-icon" aria-hidden="true">◎</span>
            <div><strong>Подготовка к ОГЭ</strong><span>Тренировка по темам и типам заданий.</span></div>
            <span className="landing-v15-feature-arrow" aria-hidden="true">→</span>
          </article>
        </section>
        <div className="landing-v15-about" id="about">Genius <span>·</span> физика для 7–9 классов</div>
      </section>
    </main>
  )
}

function StudentAccess({ setScreen, request, setRequest, setGrade }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function submitCode() {
    const normalized = code.trim().toUpperCase()
    if (normalized !== DEMO_CODE) {
      setError('Код не найден или уже недействителен.')
      return
    }
    setError('')
    setGrade(8)
    setRequest({
      id: 'REQ-482731',
      code: DEMO_CODE,
      codeLabel: 'ключ №17',
      grade: 8,
      className: '8Б',
      requestedAt: new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}),
      status: 'PENDING',
    })
    setScreen('pending')
  }

  return (
    <main className="access-page">
      <section className="access-hero">
        <Brand dark onClick={() => setScreen('landing')} />
        <div className="access-hero-copy">
          <span className="security-kicker">БЕЗОПАСНЫЙ ДОСТУП</span>
          <h1>Вход без почты,<br/>телефона и пароля</h1>
          <p>Персональный код выдаёт учитель. После ввода кода подключение должен подтвердить учитель.</p>
          <div className="security-points">
            <div><span>✓</span><p><strong>Минимум данных</strong><small>Мы не просим email, номер телефона или ФИО.</small></p></div>
            <div><span>✓</span><p><strong>Ручное подтверждение</strong><small>Один код сам по себе не даёт доступ к аккаунту.</small></p></div>
            <div><span>✓</span><p><strong>Один прогресс</strong><small>После подключения прогресс будет храниться на сервере Genius.</small></p></div>
          </div>
        </div>
      </section>
      <section className="access-form-wrap">
        <div className="access-form-card">
          <button className="back-link" onClick={() => setScreen('landing')}>← На главную</button>
          <div className="access-icon">⌁</div>
          <h2>Вход ученика</h2>
          <p className="subtle">Введи персональный код, который выдал учитель.</p>
          <label className="access-label">Код доступа</label>
          <input className="access-code-input" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCode()} placeholder="GNS-XXXX-XXXX" autoComplete="off" />
          {error && <div className="access-error">{error}</div>}
          <button className="blue-btn full" onClick={submitCode}>Отправить запрос учителю</button>
          <div className="demo-code-note"><strong>Для прототипа:</strong> {DEMO_CODE}</div>
          <div className="teacher-entry"><span>Ты учитель?</span><button onClick={() => setScreen('teacherLogin')}>Войти в кабинет →</button></div>
        </div>
      </section>
    </main>
  )
}

function PendingAccess({ setScreen, request }) {
  if (!request) return null
  const approved = request.status === 'APPROVED'
  const rejected = request.status === 'REJECTED'
  return (
    <main className="auth-page">
      <div className="auth-panel pending-panel">
        <Brand onClick={() => setScreen('landing')} />
        <div className={`pending-status-icon ${approved ? 'approved' : rejected ? 'rejected' : ''}`}>{approved ? '✓' : rejected ? '×' : '…'}</div>
        <h1>{approved ? 'Подключение подтверждено' : rejected ? 'Запрос отклонён' : 'Ждём подтверждения'}</h1>
        <p className="subtle">{approved ? 'Учитель подтвердил подключение. Можно входить в Genius.' : rejected ? 'Учитель не подтвердил этот запрос. Обратись к учителю за новым кодом.' : 'Код проверен. Запрос отправлен учителю и пока не даёт доступ к учебным данным.'}</p>
        <div className="request-summary"><span>{request.className}</span><strong>{request.codeLabel}</strong><small>Запрос: {request.requestedAt}</small></div>
        {approved && <button className="blue-btn full" onClick={() => setScreen('home')}>Открыть Genius</button>}
        {rejected && <button className="blue-btn full" onClick={() => setScreen('studentAccess')}>Ввести другой код</button>}
        {!approved && !rejected && <>
          <div className="pending-note">В рабочей версии этот экран будет автоматически проверять статус запроса.</div>
          <button className="soft-btn full-width-soft" onClick={() => setScreen('teacherLogin')}>Открыть кабинет учителя для демо</button>
        </>}
        <button className="text-link" onClick={() => setScreen('landing')}>Вернуться на главную</button>
      </div>
    </main>
  )
}

function TeacherLogin({ setScreen }) {
  return (
    <main className="auth-page">
      <div className="auth-panel compact-auth">
        <Brand onClick={() => setScreen('landing')} />
        <button className="back-link" onClick={() => setScreen('landing')}>← Назад</button>
        <h1>Вход для учителя</h1>
        <p className="subtle">В прототипе используется демонстрационный вход. В production здесь будет усиленная авторизация учителя.</p>
        <div className="input-stack"><input type="email" placeholder="Email учителя" defaultValue="teacher@example.com" /><input type="password" placeholder="Пароль" defaultValue="password123" /></div>
        <button className="blue-btn full" onClick={() => setScreen('teacher')}>Войти</button>
      </div>
    </main>
  )
}

function Sidebar({ screen, setScreen, grade, setGrade }) {
  return (
    <aside className="sidebar-light">
      <Brand dark onClick={() => setScreen('home')} />
      <nav>
        {navItems.map(([key, icon, label]) => (
          <button key={key} className={screen === key ? 'side-nav active' : 'side-nav'} onClick={() => {if(key==='oge'&&grade!==9)setGrade(9);setScreen(key)}}><span>{icon}</span>{label}</button>
        ))}
      </nav>
      <button className="logout" onClick={() => setScreen('landing')}>↪ Выход</button>
    </aside>
  )
}

function StudentShell({ screen, setScreen, grade, setGrade, xp, setXp }) {
  const [selectedTopic, setSelectedTopic] = useState(0)
  const [selectedLessonId, setSelectedLessonId] = useState('8-1')
  const [courseMode, setCourseMode] = useState('school')
  const [quizIndex, setQuizIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [offlineState, setOfflineState] = useState({ supported: true, packages: [], pending: [], usedBytes: 0 })
  const [isOnline, setIsOnline] = useState(true)
  const [syncMessage, setSyncMessage] = useState('')
  const currentTopics = useMemo(() => topicsByGrade[grade], [grade])

  const score = answers.reduce((acc, a, i) => acc + (a === quiz[i]?.correct ? 1 : 0), 0)
  const percent = Math.round((score / quiz.length) * 100)
  const earned = 0 // Legacy demo quiz is practice only.

  async function refreshOfflineState() {
    try { const state=await getOfflineState(); const bankPending=await bankPendingLocal(); setOfflineState({...state,pending:[...state.pending,...bankPending]}) } catch { setOfflineState({ supported: false, packages: [], pending: [], usedBytes: 0 }) }
  }

  async function trySync(showMessage = false) {
    if (!navigator.onLine) return
    const result = await syncPendingEvents()
    try { const bankResult=await syncBankAttempts(); if(Number.isFinite(bankResult.totalXp))setXp(bankResult.totalXp) } catch {}
    await refreshOfflineState()
    if (showMessage) {
      if (result.ok) setSyncMessage(result.synced ? `Синхронизировано: ${result.synced}` : 'Всё синхронизировано')
      else if (result.status === 401) setSyncMessage('Очередь готова. Нужна серверная сессия ученика.')
      else setSyncMessage('Не удалось синхронизировать. Данные сохранены локально.')
      setTimeout(() => setSyncMessage(''), 3500)
    }
  }

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refreshOfflineState()
    const online = () => { setIsOnline(true); trySync(false) }
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    if (navigator.onLine) trySync(false)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  function startQuiz() { setQuizIndex(0); setAnswers([]); setScreen('quiz') }
  function answer(i) { const next = [...answers, i]; setAnswers(next); if (quizIndex < quiz.length - 1) setQuizIndex(quizIndex + 1); else setScreen('result') }
  function openTopic(i) { setSelectedTopic(i); setScreen('topic') }
  function openLesson(id) { setSelectedLessonId(id); setScreen('lesson8') }

  async function downloadCurrentTopic() {
    await downloadTopicPackage({ grade, topic: currentTopics[selectedTopic], topicIndex: selectedTopic })
    await refreshOfflineState()
  }

  async function claimXp() {
    // XP is updated only from a server response.
    await queueSyncEvent('TEST_COMPLETED', {
      testId: `demo-grade-${grade}`,
      grade,
      scorePercent: percent,
      correctCount: score,
      questionCount: quiz.length,
    })
    await refreshOfflineState()
    if (navigator.onLine) await trySync(false)
    setScreen('performance')
  }

  return (
    <div className="student-app">
      <Sidebar screen={screen} setScreen={setScreen} grade={grade} setGrade={setGrade} />
      <main className="student-content">
        <div className={`connection-banner ${isOnline ? 'online' : 'offline'}`}>
          <span>{isOnline ? '● Онлайн' : '○ Офлайн'}</span>
          <small>{offlineState.pending.length ? `${offlineState.pending.length} действий ждут синхронизации` : 'Прогресс синхронизирован'}</small>
          {isOnline && offlineState.pending.length > 0 && <button onClick={() => trySync(true)}>Синхронизировать</button>}
        </div>
        {syncMessage && <div className="sync-toast">{syncMessage}</div>}
        {screen === 'home' && <HomeDashboard setScreen={setScreen} grade={grade} xp={xp} topics={currentTopics} openTopic={openTopic} />}
        {(screen === 'topics' || screen === 'tests' || screen === 'oge') && <CourseScreen grade={grade} setGrade={setGrade} mode={screen === 'oge' ? 'oge' : courseMode} setMode={setCourseMode} topics={currentTopics} openTopic={openTopic} openLesson={openLesson} />}
        {screen === 'practice' && <UnifiedTaskBank initialGrade={grade} onXp={setXp} refreshOffline={refreshOfflineState} setScreen={setScreen} />}
        {screen === 'lesson8' && <Grade8LessonScreen lessonId={selectedLessonId} setScreen={setScreen} offlineState={offlineState} refreshOfflineState={refreshOfflineState} />}
        {screen === 'topic' && <TopicScreen grade={grade} topic={currentTopics[selectedTopic]} topicIndex={selectedTopic} startQuiz={startQuiz} setScreen={setScreen} offlineState={offlineState} downloadCurrentTopic={downloadCurrentTopic} />}
        {screen === 'quiz' && <QuizScreen quizIndex={quizIndex} answer={answer} />}
        {screen === 'result' && <ResultScreen percent={percent} score={score} earned={earned} setScreen={setScreen} startQuiz={startQuiz} claim={claimXp} />}
        {(screen === 'performance' || screen === 'rating') && <StudentPerformance grade={grade} xp={xp} />}
        {screen === 'labs' && <LabsPlaceholder />}
        {screen === 'achievements' && <Achievements />}
        {screen === 'offline' && <OfflineMaterials grade={grade} topics={currentTopics} state={offlineState} refresh={refreshOfflineState} syncNow={() => trySync(true)} isOnline={isOnline} />}
        {screen === 'profile' && <Profile grade={grade} setGrade={setGrade} xp={xp} />}
      </main>
    </div>
  )
}

function HomeDashboard({ setScreen, grade, xp, topics, openTopic }) {
  return (
    <>
      <div className="page-heading-row"><div><h1>Привет, Алексей! <span>👋</span></h1><p>Продолжай двигаться к новым вершинам!</p></div><div className="streak-pill"><span>🔥</span><div><small>Серия · +5 XP сегодня</small><strong>7 дней</strong></div></div></div>
      <section className="level-card">
        <div className="level-top"><div><strong>Уровень 12</strong><span>320 / 600 XP</span></div><button className="tiny-link">Как получить XP?</button></div>
        <div className="level-progress"><i style={{width:'54%'}}/></div>
      </section>
      <section className="metric-grid">
        <div className="metric-card"><strong>34</strong><span>Решено задач</span></div>
        <div className="metric-card"><strong>92%</strong><span>Точность</span></div>
        <div className="metric-card"><strong className="gold">3</strong><span>Место в классе</span></div>
        <div className="metric-card"><strong>{xp}</strong><span>Всего XP</span></div>
      </section>
      <section className="dashboard-section"><h2>Продолжить обучение</h2><div className="continue-card"><div className="course-thumb">⚛</div><div className="continue-main"><strong>{topics[0].title}</strong><span>{grade} класс · школьный курс</span><div className="mini-progress"><i style={{width:`${topics[0].progress}%`}} /></div></div><span className="fraction">3/5</span><button className="blue-btn small" onClick={() => openTopic(0)}>Продолжить</button></div></section>
      <section className="dashboard-section"><h2>Рекомендуем тебе</h2><div className="recommend-grid"><button onClick={() => setScreen('practice')}><span>🍀</span><strong>Реши 5 задач</strong><small>Практика</small></button><button onClick={() => setScreen('tests')}><span>▣</span><strong>Пройди тест</strong><small>Самопроверка</small></button><button onClick={() => setScreen('topics')}><span>✦</span><strong>Изучи новую тему</strong><small>Интерактивный урок</small></button><button onClick={() => setScreen('offline')}><span>⇩</span><strong>Скачай материалы</strong><small>Учись без интернета</small></button></div></section>
    </>
  )
}

function CourseScreen({ grade, setGrade, mode, setMode, topics, openTopic, openLesson }) {
  return (
    <>
      <div className="course-top"><div className="grade-select"><strong>{grade} класс</strong><span>⌄</span></div></div>
      <div className="course-tabs"><button className={mode === 'school' ? 'active' : ''} onClick={() => setMode('school')}>Школьный курс</button>{grade === 9 && <button className={mode === 'oge' ? 'active' : ''} onClick={() => setMode('oge')}>Подготовка к ОГЭ</button>}</div>
      <div className="grade-mini-row">{[7,8,9].map(g => <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>{g}</button>)}</div>
      {grade === 8 && mode === 'school' ? <Grade8CourseMap openLesson={openLesson} /> : <div className="topic-list">
        {topics.map((t,i) => <button className="topic-list-row" key={t.title} onClick={() => openTopic(i)}><span className={`topic-number ${t.tone}`}>{t.icon}</span><div className="topic-copy"><strong>{mode === 'oge' ? `ОГЭ: ${t.title}` : t.title}</strong><small>{t.meta}</small></div><div className="topic-progress-wrap"><span>{t.progress}%</span><div><i className={t.tone} style={{width:`${t.progress}%`}} /></div></div>{t.progress === 0 && <span className="lock">⌑</span>}</button>)}
      </div>}
    </>
  )
}


function Grade8CourseMap({ openLesson }) {
  return <div className="g8-course">
    <div className="g8-course-hero">
      <div>
        <span className="g8-kicker">8 КЛАСС · БАЗОВЫЙ УРОВЕНЬ</span>
        <h1>Курс по учебнику</h1>
        <p>40 уроков по параграфам в едином стиле Genius. Тепловой блок постепенно превращается в полноценные интерактивные уроки с моделями, проверками и офлайн-доступом.</p>
      </div>
      <div className="g8-course-atom"><AtomMark/></div>
    </div>
    {grade8Chapters.map(chapter => {
      const lessons = getGrade8ChapterLessons(chapter.id)
      return <section className="g8-chapter" key={chapter.id}>
        <div className="g8-chapter-head">
          <div className={`g8-chapter-icon ${chapter.accent}`}>{chapter.icon}</div>
          <div><span>{chapter.paragraphRange}</span><h2>{chapter.title}</h2><p>{chapter.description}</p></div>
          <strong>{lessons.length} уроков</strong>
        </div>
        <div className="g8-lesson-list">
          {lessons.map(lesson => <button key={lesson.id} className="g8-lesson-row" onClick={() => openLesson(lesson.id)}>
            <span className="g8-paragraph">§{lesson.paragraph}</span>
            <div className="g8-lesson-name"><strong>{lesson.shortTitle}</strong><small>стр. {lesson.pages} · ~{lesson.duration} мин</small></div>
            <span className="g8-ready interactive">Интерактив</span>
            <span className="g8-arrow">→</span>
          </button>)}
        </div>
      </section>
    })}
  </div>
}

function ParticleLab({ mode = 'brownian' }) {
  const [temperature, setTemperature] = useState(45)
  const count = mode === 'diffusion' ? 30 : 24
  return <div className="particle-lab">
    <div className={`particle-box ${mode}`} style={{'--heat': temperature}}>
      {Array.from({length: count}).map((_, i) => <i key={i} className={`particle p-${i%12} ${mode === 'diffusion' && i >= count/2 ? 'warm' : ''}`} style={{animationDuration:`${Math.max(1.2, 5 - temperature/25 + (i%5)*.22)}s`}} />)}
      {mode === 'brownian' && <b className="brownian-dot">●</b>}
    </div>
    <div className="lab-controls"><span>Температура</span><input aria-label="Температура модели" type="range" min="0" max="100" value={temperature} onChange={e => setTemperature(Number(e.target.value))}/><strong>{temperature} °C</strong></div>
    <p>{mode === 'diffusion' ? 'Подвигай ползунок: при большей температуре частицы движутся интенсивнее, поэтому смешивание идёт быстрее.' : 'Центральная частица получает удары с разных сторон и хаотически меняет направление.'}</p>
  </div>
}

function StateCompare() {
  return <div className="state-compare">
    <article><strong>🧊 Твёрдое</strong><div className="matter solid">{Array.from({length:20}).map((_,i)=><i key={i}/>)}</div><p>Форма ✓ · Объём ✓</p></article>
    <article><strong>💧 Жидкость</strong><div className="matter liquid">{Array.from({length:20}).map((_,i)=><i key={i}/>)}</div><p>Форма ✗ · Объём ✓</p></article>
    <article><strong>☁️ Газ</strong><div className="matter gas">{Array.from({length:12}).map((_,i)=><i key={i}/>)}</div><p>Форма ✗ · Объём ✗</p></article>
  </div>
}

function WettingLab() {
  return <div className="science-visual"><div className="wetting-demo"><div><div className="wetting-cup"/><strong>Смачивание: мениск вогнутый</strong></div><div><div className="wetting-cup nonwet"/><strong>Несмачивание: мениск выпуклый</strong></div></div><p className="science-caption">Форма поверхности зависит от того, что сильнее: притяжение молекул жидкости друг к другу или к стенкам сосуда.</p></div>
}

function ThermometerLab() {
  const [t, setT] = useState(38)
  const h = Math.max(8, Math.min(92, (t + 20) / 1.4))
  return <div className="science-visual"><div className="thermo-demo"><div className="thermo-tube"><i className="thermo-mercury" style={{height:`${h}%`}}/></div><div><div className="thermo-scale">{[100,80,60,40,20,0,-20].map(v=><span key={v} data-t={`${v}°`}/>)}</div><div className="lab-controls"><span>Температура</span><input type="range" min="-20" max="120" value={t} onChange={e=>setT(Number(e.target.value))}/><strong>{t} °C</strong></div></div></div><p className="science-caption">Термометр показывает температуру после установления теплового равновесия с телом.</p></div>
}

function InternalEnergyVisual() {
  return <div className="science-visual"><div className="energy-balls">{Array.from({length:6}).map((_,i)=><i key={i}/>)}</div><p className="science-caption">Внутренняя энергия связана с движением частиц и их взаимодействием, а не с движением тела как целого.</p></div>
}

function EnergyMethodsVisual() {
  return <div className="science-visual"><div className="energy-methods"><article><b>⚒ Работа</b><span>Трение, удар, сжатие газа: механическая работа может изменить внутреннюю энергию.</span></article><article><b>♨ Теплопередача</b><span>Энергия передаётся от более горячего тела к более холодному при разности температур.</span></article></div></div>
}

function ConductionVisual() {
  return <div className="science-visual"><div className="conduction-bar">{Array.from({length:4}).map((_,i)=><i key={i}/>)}</div><p className="science-caption">При теплопроводности энергия идёт от горячей области к холодной без переноса вещества как целого.</p></div>
}

function ConvectionVisual() {
  return <div className="science-visual"><div className="convection-vessel"/><p className="science-caption">Нагретые слои жидкости или газа обычно становятся менее плотными и поднимаются, а более холодные опускаются.</p></div>
}

function RadiationVisual() {
  return <div className="science-visual"><div className="radiation-demo"><div className="radiation-sun"/><div className="radiation-waves">)))</div><div className="radiation-earth"/></div><p className="science-caption">Излучение переносит энергию даже через вакуум — поэтому энергия Солнца достигает Земли.</p></div>
}

function HeatQuantityLab() {
  const [mass, setMass] = useState(2)
  const [delta, setDelta] = useState(20)
  const relativeQ = mass * delta
  return <div className="science-visual"><div className="heat-lab-controls"><label>Масса: {mass.toFixed(1)} кг<input type="range" min="1" max="5" step="0.5" value={mass} onChange={e=>setMass(Number(e.target.value))}/></label><label>Изменение температуры: {delta} °C<input type="range" min="5" max="80" step="5" value={delta} onChange={e=>setDelta(Number(e.target.value))}/></label></div><div className="heat-result"><span>Относительное количество теплоты</span><b>{relativeQ.toFixed(0)} усл. ед.</b></div><p className="science-caption">При одном и том же веществе больше массы и большее изменение температуры требуют большего количества теплоты.</p></div>
}

function SpecificHeatVisual() {
  const items=[['Золото',130],['Железо',460],['Сталь',500],['Алюминий',920],['Вода',4200]]
  const max=Math.max(...items.map(x=>x[1]))
  return <div className="science-visual"><div className="heat-scale">{items.map(([name,value])=><div key={name} style={{height:`${18+value/max*115}px`}} title={`${name}: ${value}`}><span>{name}</span></div>)}</div><p className="science-caption">Чем больше удельная теплоёмкость, тем больше энергии требуется для одинакового нагревания одной и той же массы.</p></div>
}

function HeatBalanceVisual() {
  return <div className="science-visual"><div className="balance-demo"><div className="balance-cup balance-hot">горячее тело</div><div className="balance-arrow">→</div><div className="balance-cup balance-cold">холодное тело</div></div><div className="balance-eq">Q<sub>отд</sub> = Q<sub>пол</sub></div><p className="science-caption">В теплоизолированной системе энергия, отданная более горячими телами, равна энергии, полученной более холодными.</p></div>
}


function EnergyFlowVisual({ mode='energy' }) {
  const labels = mode === 'fuel' ? ['Топливо','Горение','Теплота'] : mode === 'turbine' ? ['Пар','Поток','Ротор'] : ['Энергия 1','Превращение','Энергия 2']
  return <div className="science-visual"><div className="flow-chain">{labels.map((label,i)=><Fragment key={label}><div className={`flow-node n${i}`}>{label}</div>{i<labels.length-1&&<span>→</span>}</Fragment>)}</div><p className="science-caption">Энергия не исчезает: она передаётся и превращается из одного вида в другой.</p></div>
}

function PhaseChangeVisual({ graph=false }) {
  if (graph) return <div className="science-visual"><div className="phase-graph"><div className="axis-y">t</div><div className="axis-x">τ</div><svg viewBox="0 0 320 170" role="img" aria-label="Схематический график плавления"><polyline points="18,145 105,78 210,78 300,28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><line x1="105" y1="78" x2="210" y2="78" stroke="currentColor" strokeWidth="9" opacity=".45"/></svg><b>нагрев → плавление → нагрев жидкости</b></div><p className="science-caption">Горизонтальный участок соответствует фазовому переходу кристаллического вещества при постоянной температуре.</p></div>
  return <div className="science-visual"><div className="phase-demo"><div className="phase-block solid-phase"><span>❄</span><b>твёрдое</b></div><div className="phase-arrows"><span>плавление →</span><span>← кристаллизация</span></div><div className="phase-block liquid-phase"><span>💧</span><b>жидкость</b></div></div><p className="science-caption">Плавление и кристаллизация — взаимно обратные переходы между твёрдым и жидким состояниями.</p></div>
}

function LatentHeatVisual({ vapor=false }) {
  return <div className="science-visual"><div className="latent-demo"><div className="latent-energy">+ Q</div><div className={`latent-matter ${vapor?'vapor':'melt'}`}><i/><i/><i/><i/><i/><i/></div><div className="latent-equation">{vapor ? 'Q = Lm' : 'Q = λm'}</div></div><p className="science-caption">Во время фазового перехода энергия меняет внутреннее состояние вещества, не повышая его температуру в идеализированной модели.</p></div>
}

function EvaporationVisual({ energy=false }) {
  return <div className="science-visual"><div className="evap-vessel"><div className="evap-water">{Array.from({length:16}).map((_,i)=><i key={i}/>)}</div>{Array.from({length:6}).map((_,i)=><b key={i} style={{left:`${12+i*14}%`,animationDelay:`-${i*.32}s`}}/> )}</div><div className="evap-labels"><span>жидкость</span><strong>{energy?'быстрые молекулы уносят энергию':'молекулы покидают поверхность'}</strong><span>пар</span></div></div>
}

function HumidityVisual() {
  const [phi,setPhi]=useState(55)
  return <div className="science-visual"><div className="humidity-card"><div className="humidity-ring" style={{'--p':`${phi*3.6}deg`}}><span>{phi}%</span></div><label>Относительная влажность<input type="range" min="10" max="100" value={phi} onChange={e=>setPhi(Number(e.target.value))}/></label></div><p className="science-caption">Относительная влажность показывает степень близости водяного пара к насыщению при данной температуре.</p></div>
}

function BoilingVisual({ pressure=false }) {
  const [level,setLevel]=useState(100)
  return <div className="science-visual"><div className="boil-scene"><div className="boil-flask">{Array.from({length:8}).map((_,i)=><i key={i} style={{left:`${18+(i*9)%65}%`,animationDelay:`-${i*.22}s`}}/> )}</div><div className="boil-readout"><b>{pressure?'Внешнее давление':'Температура'}</b><strong>{pressure?`${level} усл. ед.`:`100 °C`}</strong>{pressure&&<input type="range" min="60" max="140" value={level} onChange={e=>setLevel(Number(e.target.value))}/>}</div></div><p className="science-caption">При кипении парообразование идёт по всему объёму; температура кипения зависит от внешнего давления.</p></div>
}

function EngineVisual({ turbine=false, efficiency=false }) {
  if (efficiency) return <div className="science-visual"><div className="engine-eff"><div>Нагреватель<br/><b>Q₁</b></div><span>→</span><div className="engine-core">Рабочее тело<br/><b>A</b></div><span>→</span><div>Холодильник<br/><b>Q₂</b></div></div><div className="eff-meter"><i style={{width:'68%'}}/><span>η = A / Q₁ · 100%</span></div></div>
  if (turbine) return <div className="science-visual"><div className="turbine-demo"><div className="steam-jet">≈≈≈→</div><div className="turbine-wheel">✹</div><div className="shaft">────</div></div><p className="science-caption">Поток пара передаёт энергию лопаткам и раскручивает ротор.</p></div>
  return <div className="science-visual"><div className="engine-demo"><div className="cylinder"><div className="piston"/><div className="spark">✦</div></div><div className="engine-cycle-labels"><span>1 Впуск</span><span>2 Сжатие</span><span>3 Рабочий ход</span><span>4 Выпуск</span></div></div></div>
}

function ElectrostaticVisual({ field=false, atom=false, electroscope=false }) {
  if (atom) return <div className="science-visual"><div className="atom-demo-big"><div className="nucleus">+</div><i className="orbit o1"><b>−</b></i><i className="orbit o2"><b>−</b></i><i className="orbit o3"><b>−</b></i></div><p className="science-caption">В нейтральном атоме положительный заряд ядра компенсируется отрицательным зарядом электронов.</p></div>
  if (electroscope) return <div className="science-visual"><div className="electroscope-demo"><div className="scope-ball">+</div><div className="scope-rod"/><div className="scope-leaves"><i/><i/></div></div><p className="science-caption">Отклонение подвижных частей электроскопа показывает наличие заряда и качественно — его величину.</p></div>
  if (field) return <div className="science-visual"><div className="field-demo"><div className="field-charge plus">+</div>{Array.from({length:12}).map((_,i)=><i key={i} style={{transform:`rotate(${i*30}deg)`}}><b>→</b></i>)}</div><p className="science-caption">Направление поля положительного заряда показывают стрелками от заряда.</p></div>
  return <div className="science-visual"><div className="charge-demo"><div className="charge-ball plus">+</div><div className="force-arrows">←&nbsp;&nbsp;&nbsp;→</div><div className="charge-ball plus">+</div></div><div className="charge-demo"><div className="charge-ball plus">+</div><div className="force-arrows attract">→&nbsp;&nbsp;&nbsp;←</div><div className="charge-ball minus">−</div></div></div>
}

function CircuitVisual({ metal=false, effects=false }) {
  if (metal) return <div className="science-visual"><div className="metal-lattice">{Array.from({length:20}).map((_,i)=><i key={i}>+</i>)}{Array.from({length:9}).map((_,i)=><b key={i} style={{left:`${8+i*10}%`,top:`${20+(i%3)*28}%`}}>−</b>)}</div><p className="science-caption">В металле свободные электроны движутся хаотично, а электрическое поле добавляет направленную составляющую движения.</p></div>
  if (effects) return <div className="science-visual"><div className="effects-grid"><article><b>♨</b><span>тепловое</span></article><article><b>⚗</b><span>химическое</span></article><article><b>🧲</b><span>магнитное</span></article></div></div>
  return <div className="science-visual"><div className="circuit-demo"><div className="battery">+ | | −</div><div className="wire top"/><div className="lamp">💡</div><div className="wire bottom"/><div className="switch">/</div></div><p className="science-caption">Ток идёт только по замкнутому пути при наличии источника и свободных носителей заряда.</p></div>
}

function MeterVisual({ voltage=false, ohm=false }) {
  const [value,setValue]=useState(voltage?4.5:ohm?2:1.2)
  const max=voltage?12:ohm?5:3
  return <div className="science-visual"><div className="meter-demo"><div className="analog-meter"><div className="meter-needle" style={{transform:`rotate(${-60+(value/max)*120}deg)`}}/><b>{voltage?'V':ohm?'Ω':'A'}</b></div><label>{voltage?'Напряжение':ohm?'Сопротивление':'Сила тока'}<input type="range" min="0" max={max} step="0.1" value={value} onChange={e=>setValue(Number(e.target.value))}/><strong>{value.toFixed(1)} {voltage?'В':ohm?'Ом':'А'}</strong></label></div><p className="science-caption">{voltage?'Вольтметр подключают параллельно участку цепи.':ohm?'При постоянном напряжении большему сопротивлению соответствует меньшая сила тока.':'Амперметр включают последовательно с исследуемым участком.'}</p></div>
}

function OhmVisual() {
  const [u,setU]=useState(6), [r,setR]=useState(3)
  const i=(u/r).toFixed(1)
  return <div className="science-visual"><div className="ohm-lab"><label>U = {u} В<input type="range" min="1" max="12" value={u} onChange={e=>setU(Number(e.target.value))}/></label><label>R = {r} Ом<input type="range" min="1" max="10" value={r} onChange={e=>setR(Number(e.target.value))}/></label><div><span>I = U/R</span><b>{i} А</b></div></div><p className="science-caption">Изменяй напряжение и сопротивление и наблюдай, как по закону Ома меняется сила тока.</p></div>
}

function LessonVisual({ type }) {
  if (type === 'brownian') return <ParticleLab mode="brownian"/>
  if (type === 'diffusion') return <ParticleLab mode="diffusion"/>
  if (type === 'states') return <StateCompare/>
  if (type === 'solid' || type === 'liquid' || type === 'gas') return <StateCompare/>
  if (type === 'crystal') return <div className="crystal-compare"><div><strong>Кристалл</strong><div className="crystal-grid">{Array.from({length:20}).map((_,i)=><i key={i}/>)}</div></div><div><strong>Аморфное тело</strong><div className="amorph-grid">{Array.from({length:20}).map((_,i)=><i key={i}/>)}</div></div></div>
  if (type === 'interaction') return <div className="interaction-demo"><div><i/><i/><span>далеко: взаимодействие слабое</span></div><div><i/><i/><span>ближе: притяжение</span></div><div><i/><i/><span>очень близко: отталкивание</span></div></div>
  if (type === 'wetting') return <WettingLab/>
  if (type === 'temperature') return <ThermometerLab/>
  if (type === 'internal-energy') return <InternalEnergyVisual/>
  if (type === 'energy-change') return <EnergyMethodsVisual/>
  if (type === 'conduction') return <ConductionVisual/>
  if (type === 'convection') return <ConvectionVisual/>
  if (type === 'radiation') return <RadiationVisual/>
  if (type === 'heat-quantity') return <HeatQuantityLab/>
  if (type === 'specific-heat') return <SpecificHeatVisual/>
  if (type === 'heat-balance') return <HeatBalanceVisual/>
  if (['fuel','fuel-calc'].includes(type)) return <EnergyFlowVisual mode="fuel"/>
  if (['energy-conservation','energy-flow'].includes(type)) return <EnergyFlowVisual/>
  if (type === 'phase-change') return <PhaseChangeVisual/>
  if (type === 'phase-graph') return <PhaseChangeVisual graph/>
  if (['latent-heat','latent-heat-calc'].includes(type)) return <LatentHeatVisual/>
  if (['evaporation','evaporation-controls','condensation','vapor-equilibrium'].includes(type)) return <EvaporationVisual/>
  if (['evaporation-energy','condensation-energy'].includes(type)) return <EvaporationVisual energy/>
  if (['humidity','humidity-calc','dew-point','psychrometer'].includes(type)) return <HumidityVisual/>
  if (['boiling','boiling-graph'].includes(type)) return <BoilingVisual/>
  if (type === 'pressure-boiling') return <BoilingVisual pressure/>
  if (['vaporization-heat','vaporization-calc'].includes(type)) return <LatentHeatVisual vapor/>
  if (['gas-work','engine-cycle'].includes(type)) return <EngineVisual/>
  if (type === 'engine') return <EngineVisual/>
  if (type === 'turbine') return <EngineVisual turbine/>
  if (['efficiency','efficiency-calc'].includes(type)) return <EngineVisual efficiency/>
  if (['electrostatics','charge-interaction','elementary-charge','electron','charge-count','charge-transfer','charge-conservation','induction','static-use','grounding'].includes(type)) return <ElectrostaticVisual/>
  if (['coulomb','electric-field','field-lines','field-superposition'].includes(type)) return <ElectrostaticVisual field/>
  if (type === 'electroscope' || type === 'conductors') return <ElectrostaticVisual electroscope/>
  if (type === 'atom' || type === 'ions') return <ElectrostaticVisual atom/>
  if (['current-source','source','source-types','circuit','circuit-symbols'].includes(type)) return <CircuitVisual/>
  if (['metal-current','current-direction'].includes(type)) return <CircuitVisual metal/>
  if (['current-effects','electrolysis','magnetic-current'].includes(type)) return <CircuitVisual effects/>
  if (['current-meter','current-calc','ammeter'].includes(type)) return <MeterVisual/>
  if (['voltage','voltage-calc','voltmeter'].includes(type)) return <MeterVisual voltage/>
  if (type === 'resistance') return <MeterVisual ohm/>
  if (['ohm','ohm-lab'].includes(type)) return <OhmVisual/>
  return <div className="lesson-visual-default"><AtomMark/><span>Физика становится понятнее, когда видишь модель.</span></div>
}

function Grade8LessonScreen({ lessonId, setScreen, offlineState, refreshOfflineState }) {
  const lesson = getGrade8Lesson(lessonId) || grade8Lessons[0]
  const genericSteps = [
    { type:'concept', title:'Главная идея', text:lesson.teaser },
    ...lesson.keyPoints.map((text, i) => ({type:'concept', title:`Ключевая мысль ${i+1}`, text})),
    { type:'summary', title:'Запомни', text:'Проверь, можешь ли ты объяснить ключевые идеи своими словами, а затем переходи к тесту.' },
  ]
  const steps = lesson.steps?.length ? lesson.steps : genericSteps
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState('lesson')
  const [quizIndex, setQuizIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [downloading, setDownloading] = useState(false)
  const pkgId = `grade-8:lesson-${lesson.paragraph}`
  const saved = offlineState.packages.some(x => x.id === pkgId)
  const current = steps[Math.min(step, steps.length-1)]
  const score = answers.reduce((sum, a, i) => sum + (a === lesson.quiz[i]?.correct ? 1 : 0), 0)
  const percent = lesson.quiz.length ? Math.round(score / lesson.quiz.length * 100) : 0

  useEffect(() => { setStep(0); setMode('lesson'); setQuizIndex(0); setAnswers([]) }, [lessonId])

  async function saveOffline() {
    setDownloading(true)
    try { await downloadLessonPackage(lesson); await refreshOfflineState() } finally { setDownloading(false) }
  }

  function pickAnswer(index) {
    const next = [...answers, index]
    setAnswers(next)
    if (quizIndex < lesson.quiz.length - 1) setQuizIndex(quizIndex + 1)
    else setMode('result')
  }

  return <div className="lesson-dark-shell">
    <div className="lesson-dark-topbar">
      <button onClick={() => setScreen('topics')}>← К списку уроков</button>
      <div><span>8 класс</span><b>§{lesson.paragraph}</b><span>стр. {lesson.pages}</span></div>
      <button className={saved ? 'offline-saved-btn' : 'offline-download-btn'} onClick={saveOffline} disabled={saved || downloading}>{saved ? '✓ Офлайн' : downloading ? 'Сохраняем…' : '⇩ Скачать'}</button>
    </div>

    {mode === 'lesson' && <>
      <section className="lesson-dark-hero">
        <div><span className="lesson-section-label">УРОК {lesson.paragraph}</span><h1>{lesson.shortTitle}</h1><p>{lesson.teaser}</p><div className="lesson-meta-pills"><span>◷ ~{lesson.duration} мин</span><span>▣ {lesson.objectives.length} цели</span><span>★ Тренировка без XP</span></div></div>
        <div className="lesson-hero-logo"><AtomMark/></div>
      </section>

      <div className="lesson-progress"><div>{steps.map((_,i)=><i key={i} className={i <= step ? 'active' : ''}/>)}</div><span>{step+1}/{steps.length}</span></div>

      <section className="lesson-card-dark">
        <div className="lesson-card-tag">{current.type === 'summary' ? 'ЗАПОМНИ' : 'ТЕОРИЯ'}</div>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        {lesson.formula && step > 0 && <div className="formula-card-dark">{lesson.formula}</div>}
        <LessonVisual type={current.type}/>
        {step === 0 && <div className="lesson-goals"><strong>После урока ты сможешь:</strong>{lesson.objectives.map(item=><span key={item}>✓ {item}</span>)}</div>}
      </section>

      <div className="lesson-dark-actions">
        <button onClick={() => setStep(Math.max(0, step-1))} disabled={step===0}>← Назад</button>
        {step < steps.length-1 ? <button className="primary" onClick={() => setStep(step+1)}>Дальше →</button> : <button className="primary" onClick={() => {setMode('quiz');setQuizIndex(0);setAnswers([])}}>Пройти тест →</button>}
      </div>
    </>}

    {mode === 'quiz' && <section className="lesson-quiz-dark">
      <div className="quiz-head-dark"><span>Итоговый тест · §{lesson.paragraph}</span><strong>{quizIndex+1}/{lesson.quiz.length}</strong></div>
      <div className="quiz-progress-dark"><i style={{width:`${((quizIndex+1)/lesson.quiz.length)*100}%`}}/></div>
      <h2>{lesson.quiz[quizIndex].q}</h2>
      <div className="quiz-options-dark">{lesson.quiz[quizIndex].options.map((o,i)=><button key={o} onClick={() => pickAnswer(i)}><span>{String.fromCharCode(65+i)}</span>{o}</button>)}</div>
    </section>}

    {mode === 'result' && <section className="lesson-result-dark">
      <div className="result-check">✓</div><span>УРОК ЗАВЕРШЁН</span><h1>{percent >= 70 ? 'Отличная работа!' : 'Стоит повторить материал'}</h1><p>Верных ответов: {score} из {lesson.quiz.length}</p>
      <div className="lesson-result-grid"><div><strong>{percent}%</strong><span>результат</span></div><div><strong>0 XP</strong><span>тренировочный тест</span></div><div><strong>§{lesson.paragraph}</strong><span>пройден</span></div></div>
      <div className="lesson-dark-actions"><button onClick={() => {setMode('lesson');setStep(0)}}>Повторить урок</button><button className="primary" onClick={() => setScreen('topics')}>К списку уроков</button></div>
    </section>}
  </div>
}

function TopicScreen({ grade, topic, topicIndex, startQuiz, setScreen, offlineState, downloadCurrentTopic }) {
  const packageId = `grade-${grade}:topic-${topicIndex}`
  const saved = offlineState.packages.some(item => item.id === packageId || item.id === `grade-${grade}:full-course`)
  return (
    <>
      <button className="back-page" onClick={() => setScreen('topics')}>← Назад</button>
      <div className="topic-header-card"><span className={`topic-number ${topic.tone}`}>{topic.icon}</span><div><small>{grade} класс · школьный курс</small><h1>{topic.title}</h1><p>Короткая теория, разобранные примеры и проверка знаний.</p></div><div className="topic-offline-action">{saved ? <span className="saved-offline">✓ Доступно офлайн</span> : <button className="soft-btn" onClick={downloadCurrentTopic}>⇩ Скачать тему</button>}</div></div>
      <div className="lesson-steps"><article><span>1</span><h3>Теория</h3><p>Основные определения, законы и физический смысл.</p><button className="soft-btn">Открыть</button></article><article><span>2</span><h3>Примеры</h3><p>Разобранные задачи перед проверкой знаний.</p><button className="soft-btn">Смотреть</button></article><article className="lesson-accent"><span>3</span><h3>Тестирование</h3><p>Тренировочный тест для самопроверки. XP доступны в разделе «Задачи».</p><button className="blue-btn" onClick={startQuiz}>Начать тест</button></article></div>
    </>
  )
}

function QuizScreen({ quizIndex, answer }) {
  return (
    <div className="task-page">
      <div className="task-top"><button className="back-page">← Назад</button><strong>Равномерное движение</strong><span className="xp-orange">Тренировка</span></div>
      <div className="task-dots">{quiz.map((_,i) => <span key={i} className={i === quizIndex ? 'active' : i < quizIndex ? 'done' : ''}>{i+1}</span>)}</div>
      <section className="task-card"><div className="task-meta"><span>Задание {quizIndex+1} из {quiz.length}</span><b>Базовый уровень</b></div><h2>{quiz[quizIndex].q}</h2><div className="answer-buttons">{quiz[quizIndex].options.map((o,i) => <button key={o} onClick={() => answer(i)}>{o}</button>)}</div></section>
      <button className="hint-row">💡 Нужна подсказка? <span>⌄</span></button>
    </div>
  )
}

function ResultScreen({ percent, score, earned, setScreen, startQuiz, claim }) {
  return <div className="result-white"><div className="result-ring">{percent}%</div><h1>{percent >= 70 ? 'Тест пройден!' : 'Попробуй ещё раз'}</h1><p>Правильных ответов: {score} из {quiz.length}</p><div className="earned-pill">+{earned} XP</div><small>Это тренировочный тест без начисления XP.</small><div className="result-actions"><button className="soft-btn" onClick={startQuiz}>Повторить</button><button className="blue-btn" onClick={claim}>Сохранить результат</button></div></div>
}

function Rating({ grade, xp }) {
  return <><div className="section-head"><h1>Рейтинг</h1></div><div className="rating-tabs"><button className="active">Мой класс</button><button>Параллель</button><button>Школа</button><button>Общий</button></div><div className="rating-layout"><div className="rating-list">{leaderboard.map(([name, points, avatar],i) => <div className="rating-row" key={name}><span className={`rank rank-${i+1}`}>{i+1}</span><span className="mini-avatar">{avatar}</span><strong>{name}</strong><b>{points} XP</b></div>)}</div><aside className="my-place"><span>Твоё место</span><div className="profile-bubble">🧑🏻</div><strong>3</strong><b>{xp} XP</b><p>«Постоянство<br/>приводит к результату» 💡</p></aside></div></>
}

function Achievements() {
  const items = [['⭐','Первые шаги','Реши 10 задач'],['🔥','Неделя знаний','Занимайся 7 дней подряд'],['⚙','Мастер механики','Реши 50 задач по механике'],['⬡','Эксперт','по электричеству','locked'],['◉','Готов к ОГЭ','Реши 100 заданий формата ОГЭ','locked'],['♕','Легенда Genius','Набери 10 000 XP','locked']]
  return <><div className="section-head"><h1>Мои достижения</h1></div><div className="achievement-tabs"><button className="active">Все</button><button>Обучение</button><button>ОГЭ</button><button>Активность</button><button>Особые</button></div><div className="achievement-grid">{items.map((it,i) => <article key={i} className={it[3] ? 'locked' : ''}><div className="achievement-icon">{it[3] ? '🔒' : it[0]}</div><strong>{it[1]}</strong><span>{it[2]}</span></article>)}</div></>
}

function OfflineMaterials({ grade, topics, state, refresh, syncNow, isOnline }) {
  const [busy, setBusy] = useState('')

  async function downloadAll() {
    setBusy('grade')
    try { if (grade === 8) await downloadGradeLessonsPackage(grade, grade8Lessons); else await downloadGradePackage(grade, topics); await refresh() } finally { setBusy('') }
  }

  async function removeOne(id) {
    setBusy(id)
    try { await removeOfflinePackage(id); await refresh() } finally { setBusy('') }
  }

  async function clearAll() {
    if (!window.confirm('Удалить все скачанные материалы с этого устройства? Прогресс и XP на сервере не удалятся.')) return
    setBusy('clear')
    try { await clearOfflinePackages(); await refresh() } finally { setBusy('') }
  }

  return <>
    <div className="section-head offline-head"><div><h1>Офлайн-материалы</h1><p className="subtle">Скачанные темы работают без интернета. Прогресс синхронизируется при появлении сети.</p></div><button className="blue-btn small" onClick={downloadAll} disabled={busy === 'grade'}>{busy === 'grade' ? 'Сохраняем…' : `⇩ Скачать весь ${grade} класс`}</button></div>
    <div className="offline-summary-grid">
      <div><strong>{formatBytes(state.usedBytes)}</strong><span>Занято на устройстве</span></div>
      <div><strong>{state.packages.length}</strong><span>Офлайн-пакетов</span></div>
      <div><strong>{state.pending.length}</strong><span>Ждут синхронизации</span></div>
      <div><strong className={isOnline ? 'online-text' : 'offline-text'}>{isOnline ? 'Онлайн' : 'Офлайн'}</strong><span>Состояние сети</span></div>
    </div>
    {!state.supported && <div className="offline-warning">В этом браузере IndexedDB недоступна. Офлайн-режим не сможет сохранять материалы.</div>}
    {state.packages.length === 0 ? <div className="empty-state"><div>⇩</div><h3>Пока ничего не скачано</h3><p>Открой урок и нажми «Скачать» или сохрани весь курс текущего класса.</p></div> : <div className="offline-list">
      {[...state.packages].sort((a,b) => new Date(b.downloadedAt) - new Date(a.downloadedAt)).map(item => <article key={item.id}>
        <div className="offline-package-icon">{item.kind === 'task-bank' ? '✓' : item.kind === 'GRADE' ? '▦' : item.kind === 'LESSON' ? '§' : '▣'}</div>
        <div className="offline-package-copy"><strong>{item.title}</strong><span>{item.subtitle || `${item.grade} класс`}</span><small>Версия {item.contentVersion} · {formatBytes(item.sizeBytes)} · сохранено {new Date(item.downloadedAt).toLocaleString('ru-RU')}</small></div>
        <div className="offline-package-status"><span>{item.kind === 'task-bank' ? (item.contentVersion === TASK_BANK_VERSION ? '✓ Текущая версия' : 'Доступно обновление') : '✓ Скачано'}</span><button onClick={() => removeOne(item.id)} disabled={busy === item.id}>{busy === item.id ? 'Удаляем…' : 'Удалить'}</button></div>
      </article>)}
    </div>}
    <section className="sync-queue-card">
      <div><h2>Синхронизация прогресса</h2><p>Офлайн-ответы и попытки хранятся локально до подтверждения сервером. Сам ученик не может напрямую начислить себе XP.</p></div>
      <div className="sync-actions"><span>{state.pending.length ? `${state.pending.length} событий в очереди` : '✓ Очередь пуста'}</span><button className="soft-btn" onClick={syncNow} disabled={!isOnline || state.pending.length === 0}>Синхронизировать</button></div>
    </section>
    {state.packages.length > 0 && <button className="danger-text-btn" onClick={clearAll} disabled={busy === 'clear'}>{busy === 'clear' ? 'Удаляем…' : 'Удалить все офлайн-материалы'}</button>}
  </>
}

function Profile({ grade, setGrade, xp }) {
  return <>
    <div className="profile-title">
      <div className="big-avatar">🧑🏻</div>
      <div><h1>GeniusStudent</h1><p>ID: GS-8F4A91 · персональные данные не требуются</p></div>
    </div>
    <div className="metric-grid">
      <div className="metric-card"><strong>4 820</strong><span>XP · 7 класс</span></div>
      <div className="metric-card"><strong>{grade === 8 ? xp : 2140}</strong><span>XP · 8 класс</span></div>
      <div className="metric-card"><strong>760</strong><span>XP · 9 класс</span></div>
      <div className="metric-card"><strong>7 дней</strong><span>Лучшая серия</span></div>
    </div>
    <section className="profile-settings">
      <h2>Текущий класс</h2>
      <div className="grade-mini-row">{[7,8,9].map(g => <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>{g}</button>)}</div>
      <p>В прототипе переключение класса доступно для демонстрации. В серверной версии изменение текущего класса будет контролироваться правилами аккаунта, а XP сохранится отдельно для каждого класса.</p>
    </section>
    <section className="profile-settings device-safe-card">
      <h2>Доступ и устройства</h2>
      <div className="safe-device-row"><span>✓</span><div><strong>Текущая сессия активна</strong><p>Genius не собирает модель телефона, IMEI, серийные номера, контакты или данные других приложений.</p></div></div>
    </section>
  </>
}

function TeacherDashboard({ setScreen, request, setRequest }) {
  const [tab, setTab] = useState(request?.status === 'PENDING' ? 'requests' : 'classes')
  const pendingCount = request?.status === 'PENDING' ? 1 : 0

  function approveRequest() {
    if (!request) return
    setRequest({...request, status:'APPROVED', approvedAt:new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})})
  }

  function rejectRequest() {
    if (!request) return
    setRequest({...request, status:'REJECTED'})
  }

  return <div className="student-app">
    <aside className="sidebar-light">
      <Brand dark onClick={() => setTab('classes')} />
      <nav>
        <button className={`side-nav ${tab === 'classes' ? 'active' : ''}`} onClick={() => setTab('classes')}><span>▦</span>Мои классы</button>
        <button className={`side-nav ${tab === 'academic' ? 'active' : ''}`} onClick={() => setTab('academic')}><span>▤</span>Дневник и ДЗ</button>
        <button className={`side-nav ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}><span>◎</span>Запросы {pendingCount > 0 && <b className="nav-badge">{pendingCount}</b>}</button>
        <button className={`side-nav ${tab === 'keys' ? 'active' : ''}`} onClick={() => setTab('keys')}><span>⌁</span>Ключи доступа</button>
        <button className={`side-nav ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}><span>▣</span>Результаты</button>
        <button className={`side-nav ${tab === 'bank' ? 'active' : ''}`} onClick={() => setTab('bank')}><span>◇</span>Банк задач</button>
      </nav>
      <button className="logout" onClick={() => setScreen('landing')}>↪ Выход</button>
    </aside>
    <main className="student-content">
      {tab === 'classes' && <>
        <div className="teacher-head"><div><h1>Мои классы</h1><p className="subtle">Управление учебными группами без лишних персональных данных.</p></div><button className="blue-btn small">+ Создать класс</button></div>
        <div className="teacher-classes">{[['7А','24 ученика','88%'],['8Б','28 учеников','92%'],['9А','25 учеников','76%'],['9Б','30 учеников','68%']].map(c => <div key={c[0]}><span>{c[0]}</span><div><strong>{c[1]}</strong><small>Активность: {c[2]}</small></div><button onClick={() => setTab('academic')}>Открыть →</button></div>)}</div>
        <h2 className="quick-title">Быстрые действия</h2>
        <div className="quick-grid"><button onClick={() => setTab('keys')}>⌁<span>Выдать ключ</span></button><button onClick={() => setTab('requests')}>◎<span>Запросы на подключение</span></button><button onClick={() => setTab('academic')}>▤<span>Открыть дневник</span></button></div>
      </>}

      {tab === 'academic' && <TeacherAcademic />}

      {tab === 'requests' && <>
        <div className="teacher-head"><div><h1>Запросы на подключение</h1><p className="subtle">Код не открывает доступ автоматически — каждый запрос подтверждается учителем.</p></div><span className="pending-count-pill">{pendingCount} ожидает</span></div>
        {!request && <div className="empty-state"><div>✓</div><h3>Новых запросов нет</h3><p>Когда ученик введёт выданный код, запрос появится здесь.</p></div>}
        {request && <article className={`connection-request ${request.status.toLowerCase()}`}>
          <div className="request-main">
            <div className="request-avatar">{request.grade}</div>
            <div><span className={`status-chip ${request.status.toLowerCase()}`}>{request.status === 'PENDING' ? 'ОЖИДАЕТ' : request.status === 'APPROVED' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}</span><h3>{request.className} · {request.codeLabel}</h3><p>Запрос создан в {request.requestedAt}. Genius не передаёт учителю модель устройства или другие данные телефона.</p></div>
          </div>
          {request.status === 'PENDING' && <div className="request-actions"><button className="reject-btn" onClick={rejectRequest}>Отклонить</button><button className="blue-btn small" onClick={approveRequest}>Подтвердить подключение</button></div>}
          {request.status !== 'PENDING' && <div className="request-actions"><button className="soft-btn" onClick={() => setScreen('pending')}>Открыть экран ученика (демо)</button></div>}
        </article>}
      </>}

      {tab === 'keys' && <>
        <div className="teacher-head"><div><h1>Ключи доступа</h1><p className="subtle">Каждый ученик получает персональный одноразовый ключ.</p></div><button className="blue-btn small">+ Создать ключ</button></div>
        <div className="security-table">
          <div className="security-table-head"><span>Класс</span><span>Ключ</span><span>Назначение</span><span>Статус</span></div>
          <div><b>8Б</b><code>GNS-8K4P-X7M2</code><span>ключ №17</span><em className={request ? 'status-used' : 'status-active'}>{request ? 'Запрос создан' : 'Активен'}</em></div>
          <div><b>9А</b><code>GNS-2Q9M-R4T8</code><span>ключ №04</span><em className="status-active">Активен</em></div>
        </div>
        <div className="security-callout"><strong>Production-правило</strong><p>В базе будет храниться только криптографический хэш ключа. После успешной активации исходный код повторно использовать нельзя.</p></div>
      </>}

      {tab === 'results' && <>
        <div className="teacher-head"><div><h1>Результаты</h1><p className="subtle">Здесь будет только учебная активность внутри Genius.</p></div></div>
        <div className="metric-grid"><div className="metric-card"><strong>83</strong><span>Учеников</span></div><div className="metric-card"><strong>79%</strong><span>Средняя точность</span></div><div className="metric-card"><strong>1 248</strong><span>Задач за неделю</span></div><div className="metric-card"><strong>68%</strong><span>Активность</span></div></div>
        <div className="security-callout"><strong>Принцип приватности</strong><p>Учитель видит результаты тестов, XP, прогресс и активность внутри Genius. Геолокация, файлы, сообщения, контакты и активность в других приложениях не собираются.</p></div>
      </>}

      {tab === 'bank' && <>
        <div className="teacher-head"><div><h1>Банк задач</h1><p className="subtle">Текущий учебный банк 8 класса: 319 задач, единое поле ответа, навигация стрелками и офлайн-пакеты. Для нового пакета из сборника решения пока скрыты, ответы сохраняются без автоматической проверки.</p></div><button className="blue-btn small" onClick={() => setScreen('practice')}>Открыть как ученик →</button></div>
        <div className="metric-grid"><div className="metric-card"><strong>100</strong><span>Задач</span></div><div className="metric-card"><strong>3</strong><span>Тематических раздела</span></div><div className="metric-card"><strong>8</strong><span>Перерисованных схем</span></div><div className="metric-card"><strong>✓</strong><span>Ответы проверены</span></div></div>
        <div className="teacher-bank-grid"><article><span>♨</span><div><small>§1–§26</small><strong>Тепловые явления</strong><p>Задачи распределены по темам учебника и доступны для локальной практики.</p></div></article><article><span>ϟ</span><div><small>§27–§40</small><strong>Электрические явления</strong><p>В банк входят задания по заряду, току, измерительным приборам и сопротивлению.</p></div></article><article><span>◎</span><div><small>Доп. темы</small><strong>Электромагнитные и световые явления</strong><p>Задачи вынесены отдельно, чтобы не придумывать номера параграфов, которых нет в загруженной части учебника.</p></div></article></div>
        <div className="security-callout"><strong>Genius v13</strong><p>В банк добавлены 169 задач из предоставленного сборника Перышкина. Задачи со звёздочкой отмечены как повышенный уровень, графики 839 и 852 и рисунок 862 перерисованы в стиле Genius. Запуск на Windows доступен одним кликом.</p></div>
      </>}
    </main>
  </div>
}

export default function Page() {
  const [screen, setScreen] = useState('landing')
  const [grade, setGrade] = useState(8)
  const [xp, setXp] = useState(0)
  const [request, setRequest] = useState(null)
  useEffect(() => {
    const requested=new URLSearchParams(window.location.search).get('screen')
    if(['offline','performance','practice','topics','labs','oge'].includes(requested))setScreen(requested)
  }, [])

  if (screen === 'landing') return <Landing onStudentAccess={() => setScreen('studentAccess')} onTeacherLogin={() => setScreen('teacherLogin')} />
  if (screen === 'studentAccess') return <StudentAccess setScreen={setScreen} request={request} setRequest={setRequest} setGrade={setGrade} />
  if (screen === 'pending') return <PendingAccess setScreen={setScreen} request={request} />
  if (screen === 'teacherLogin') return <TeacherLogin setScreen={setScreen} />
  if (screen === 'teacher') return <TeacherDashboard setScreen={setScreen} request={request} setRequest={setRequest} />
  return <StudentShell screen={screen} setScreen={setScreen} grade={grade} setGrade={setGrade} xp={xp} setXp={setXp} />
}
