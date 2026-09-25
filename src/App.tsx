import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, FileText,
  Home as HomeIcon, Layers3, Library, MoreHorizontal, Plus, RotateCcw,
  Search, Settings, Sparkles, Trash2, Upload, X, Zap, GraduationCap,
} from 'lucide-react'
import { LocalAIHomeCard, SettingsView, type Theme } from './components/SettingsView'
import { Onboarding } from './components/Onboarding'
import { ClassesView } from './components/ClassWorkspace'
import speedyAILogo from './assets/branding/speedyai-logo.png'
import { useLocalAI } from './hooks/useLocalAI'
import { desktopCourseProvider, explainSection } from './lib/ai'
import { extractSource } from './lib/extract'
import { generateCourse } from './lib/generation'
import { emptyData, loadData, saveData } from './lib/storage'
import type { AppData, Course, Lesson, LessonCheckpoint, LessonSection, SourceMaterial } from './models'

type Page = 'home' | 'classes' | 'library' | 'sources' | 'study' | 'settings'
type Player = { courseId: string; lessonId: string } | null

function courseProgress(course: Course) {
  return Math.round((course.lessons.filter((lesson) => lesson.progress.completed).length / course.lessons.length) * 100)
}

function nextLesson(course: Course) {
  return course.lessons.find((lesson) => !lesson.progress.completed) || course.lessons[course.lessons.length - 1]
}

function App() {
  const [data, setData] = useState<AppData>(() => loadData(emptyData()))
  const [page, setPage] = useState<Page>('home')
  const [selectedCourseId, setSelectedCourseId] = useState(data.courses[0]?.id || '')
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id || '')
  const [player, setPlayer] = useState<Player>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [regenerateCourseId, setRegenerateCourseId] = useState<string | null>(null)
  const [generationClassId, setGenerationClassId] = useState<string | null>(null)
  const [generationTitle, setGenerationTitle] = useState('')
  const [toast, setToast] = useState('')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('speedyai:theme') as Theme) || 'system')
  const localAI = useLocalAI()

  useEffect(() => saveData(data), [data])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [page])
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    apply(); localStorage.setItem('speedyai:theme', theme)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('.search input')?.focus() }
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); setPage('sources'); window.setTimeout(() => document.querySelector<HTMLButtonElement>('[data-add-material]')?.click(), 0) }
      if (event.key === ',') { event.preventDefault(); setPage('settings') }
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [])

  const selectedCourse = data.courses.find((course) => course.id === selectedCourseId)
  const activeCourse = player ? data.courses.find((course) => course.id === player.courseId) : undefined
  const activeLesson = activeCourse?.lessons.find((lesson) => lesson.id === player?.lessonId)
  const startGeneration = (courseId?: string, classId?: string, title = '') => { setRegenerateCourseId(courseId || null); setGenerationClassId(classId || null); setGenerationTitle(title); setShowGenerator(true) }

  function openCourse(courseId: string) {
    setSelectedCourseId(courseId)
    setPage('library')
  }

  function updateCourse(courseId: string, fn: (course: Course) => Course) {
    setData((current) => ({ ...current, courses: current.courses.map((course) => course.id === courseId ? fn(course) : course) }))
  }

  async function createCourse(sourceIds: string[], title?: string) {
    const original = data.courses.find((course) => course.id === regenerateCourseId)
    const generationSources = data.sources.filter((source) => sourceIds.includes(source.id))
    const provider = await desktopCourseProvider(data.profile.learningPreferences)
    const generated = await generateCourse({ sources: generationSources, title: title || original?.title }, provider)
    const course = original ? { ...generated, id: original.id, createdAt: original.createdAt, classId: original.classId } : { ...generated, classId: generationClassId || undefined }
    setData((current) => ({ ...current, courses: original ? current.courses.map((item) => item.id === original.id ? course : item) : [course, ...current.courses] }))
    setSelectedCourseId(course.id); setPage('library'); setShowGenerator(false); setRegenerateCourseId(null); setGenerationClassId(null); setGenerationTitle(''); setToast(original ? 'Course regenerated from its sources' : 'Course generated and saved locally')
  }

  if (!data.onboardingCompleted) return <Onboarding onComplete={(profile, names) => { const now = new Date().toISOString(); const classes = names.map((name) => ({ id: crypto.randomUUID(), name, createdAt: now })); setData({ ...data, profile, classes, onboardingCompleted: true }); setSelectedClassId(classes[0]?.id || '') }} onSetupAI={() => setPage('settings')} />

  if (player && activeCourse && activeLesson) {
    return <LessonPlayer course={activeCourse} lesson={activeLesson} sources={data.sources} onExit={() => setPlayer(null)} onUpdate={(course) => updateCourse(course.id, () => course)} onCheckpoint={(event) => setData((current) => ({ ...current, checkpointEvents: [...current.checkpointEvents, event] }))} onOpenLesson={(lessonId) => setPlayer({ courseId: activeCourse.id, lessonId })} />
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="main-content">
        <Topbar onGenerate={() => startGeneration()} />
        {page === 'home' && <Home data={data} localAI={localAI.state} onSetup={() => setPage('settings')} onPlay={(courseId, lessonId) => setPlayer({ courseId, lessonId })} onGenerate={async (prompt) => {
          if (!data.sources.length) return startGeneration(undefined, undefined, prompt)
          await createCourse(data.sources.map((source) => source.id), prompt)
        }} onStudy={() => setPage('study')} onNavigate={setPage} />}
        {page === 'classes' && <ClassesView data={data} selectedId={selectedClassId} onSelect={setSelectedClassId} onChange={setData} onAddClass={(name) => { const item = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }; setData((current) => ({ ...current, classes: [...current.classes, item], profile: { ...current.profile, classes: [...current.profile.classes, name] } })); setSelectedClassId(item.id) }} onOpenCourse={openCourse} onGenerateLessons={() => startGeneration(undefined, selectedClassId)} />}
        {page === 'library' && selectedCourse ? <CourseView course={selectedCourse} sources={data.sources} onPlay={(lessonId) => setPlayer({ courseId: selectedCourse.id, lessonId })} onRename={(name) => updateCourse(selectedCourse.id, (course) => ({ ...course, title: name, updatedAt: new Date().toISOString() }))} onDelete={() => { if (!window.confirm(`Delete “${selectedCourse.title}”? Your lesson progress will also be removed.`)) return; setData((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== selectedCourse.id) })); setSelectedCourseId(data.courses.find((course) => course.id !== selectedCourse.id)?.id || ''); setPage('home') }} onRegenerate={() => startGeneration(selectedCourse.id)} /> : null}
        {page === 'library' && !selectedCourse && <EmptyLibrary onGenerate={() => startGeneration()} />}
        {page === 'sources' && <SourcesView sources={data.sources} onAdd={(sources) => setData((current) => ({ ...current, sources: [...sources, ...current.sources] }))} onGenerate={() => startGeneration()} />}
        {page === 'study' && <StudyMode data={data} onPlay={(courseId, lessonId) => setPlayer({ courseId, lessonId })} />}
        {page === 'settings' && <SettingsView controller={localAI} theme={theme} onTheme={setTheme} data={data} onChange={setData} />}
      </main>
      {showGenerator && <GenerateModal sources={data.sources} initialSelected={regenerateCourseId ? data.courses.find((course) => course.id === regenerateCourseId)?.sourceIds : undefined} initialTitle={generationTitle || (regenerateCourseId ? data.courses.find((course) => course.id === regenerateCourseId)?.title : undefined)} regenerating={Boolean(regenerateCourseId)} onClose={() => { setShowGenerator(false); setRegenerateCourseId(null); setGenerationClassId(null); setGenerationTitle('') }} onSources={(sources) => setData((current) => ({ ...current, sources: [...sources, ...current.sources] }))} onGenerate={createCourse} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const nav = [
    { id: 'home' as const, label: 'Home', icon: HomeIcon },
    { id: 'classes' as const, label: 'Classes', icon: GraduationCap },
    { id: 'sources' as const, label: 'Materials', icon: Library },
    { id: 'study' as const, label: 'Study', icon: Zap },
  ]
  return <aside className="sidebar">
    <button className="brand" onClick={() => onNavigate('home')}><span className="brand-mark"><img src={speedyAILogo} alt="" /></span><span>SpeedyAI</span></button>
    <nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => onNavigate(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>
    <button className="sidebar-settings" onClick={() => onNavigate('settings')}><Settings size={18} />Settings</button>
  </aside>
}

function Topbar({ onGenerate }: { onGenerate: () => void }) {
  const [query, setQuery] = useState('')
  return <header className="topbar"><div className="search"><Search size={17} /><input aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" /><kbd>⌘ K</kbd></div><button className="button compact" onClick={onGenerate}><Plus size={16} />Generate lessons</button></header>
}

function Home({ data, localAI, onSetup, onPlay, onGenerate, onStudy, onNavigate }: { data: AppData; localAI: ReturnType<typeof useLocalAI>['state']; onSetup: () => void; onPlay: (courseId: string, lessonId: string) => void; onGenerate: (prompt: string) => Promise<void>; onStudy: () => void; onNavigate: (page: Page) => void }) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = data.courses.find((course) => courseProgress(course) < 100) || data.courses[0]
  const lesson = active && nextLesson(active)
  const dueCards = data.flashcards.filter((card) => new Date(card.dueAt) <= new Date()).length
  async function submitPrompt() {
    const value = prompt.trim()
    if (!value || busy) return
    setBusy(true); setError('')
    try { await onGenerate(value) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not generate this lesson.') }
    finally { setBusy(false) }
  }
  return <div className="page home-page">
    <section className="home-generator">
      <p className="kicker">GENERATE A LESSON</p>
      <h1>What do you want to learn?</h1>
      <p>Ask for a topic and SpeedyAI will build a short, interactive course from your material.</p>
      <div className="lesson-prompt">
        <textarea aria-label="What do you want to learn?" rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitPrompt() } }} placeholder="Teach me the main ideas in my uploaded material" />
        <button aria-label="Generate lesson" disabled={!prompt.trim() || busy} onClick={() => void submitPrompt()}>{busy ? <span className="prompt-spinner" /> : <ArrowRight size={18} />}</button>
      </div>
      <div className="prompt-meta"><span><FileText size={14} />Grounded in {data.sources.length ? `${data.sources.length} uploaded ${data.sources.length === 1 ? 'material' : 'materials'}` : 'your uploaded material'}</span><button onClick={() => onNavigate('sources')}>{data.sources.length ? 'Manage materials' : 'Add material'}</button></div>
      {error && <p className="prompt-error" role="alert">{error}</p>}
    </section>
    <LocalAIHomeCard state={localAI} onSetup={onSetup} />
    {active && lesson && <section className="continue-simple"><p className="kicker">CONTINUE LEARNING</p><div><span><small>{data.classes[0]?.name || 'Lessons'}</small><strong>{active.title}</strong><em>Lesson {active.lessons.indexOf(lesson) + 1} of {active.lessons.length} · {lesson.title}</em></span><button className="button" onClick={() => onPlay(active.id, lesson.id)}>Continue</button></div></section>}
    <div className="home-lists"><section><div className="section-title"><h2>Recent classes</h2><button onClick={() => onNavigate('classes')}>View all</button></div><div className="simple-rows">{data.classes.slice(0, 3).map((item) => { const materials = data.sources.filter((source) => source.classId === item.id).length; const lessons = data.courses.filter((course) => course.classId === item.id).reduce((sum, course) => sum + course.lessons.length, 0); return <button key={item.id} onClick={() => onNavigate('classes')}><strong>{item.name}</strong><small>{materials} materials · {lessons} lessons</small></button> })}</div></section><section><div className="section-title"><h2>Due today</h2></div><div className="simple-rows"><button onClick={() => onNavigate('classes')}><strong>{dueCards} flashcards</strong><small>Spaced review</small></button><button onClick={onStudy}><strong>{data.checkpointEvents.filter((event) => !event.correct).length} weak concepts</strong><small>Study mode</small></button></div></section></div>
  </div>
}

function CourseView({ course, sources, onPlay, onRename, onDelete, onRegenerate }: { course: Course; sources: SourceMaterial[]; onPlay: (id: string) => void; onRename: (name: string) => void; onDelete: () => void; onRegenerate: () => void }) {
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(course.title)
  const next = nextLesson(course)
  return <div className="page course-page">
    <div className="course-header"><div><p className="kicker">BIOLOGY · GENERATED COURSE</p>{renaming ? <form onSubmit={(e) => { e.preventDefault(); onRename(name); setRenaming(false) }}><input className="title-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></form> : <h1>{course.title}</h1>}<p>{course.description}</p><div className="source-pills">{course.sourceIds.map((id) => <span key={id}><FileText size={13} />{sources.find((source) => source.id === id)?.name || 'Source'}</span>)}</div></div><div className="course-actions"><button className="button" onClick={() => onPlay(next.id)}>{courseProgress(course) ? 'Continue course' : 'Start course'} <ArrowRight size={17} /></button><button className="icon-button" aria-label="Course actions" onClick={() => setMenu(!menu)}><MoreHorizontal /></button>{menu && <div className="action-menu"><button onClick={() => { setRenaming(true); setMenu(false) }}>Rename course</button><button onClick={() => { onRegenerate(); setMenu(false) }}><RotateCcw size={14} /> Regenerate</button><button className="danger" onClick={onDelete}><Trash2 size={14} /> Delete course</button></div>}</div></div>
    <div className="course-summary"><div className="summary-progress"><div className="ring-small" style={{ '--progress': `${courseProgress(course) * 3.6}deg` } as React.CSSProperties}><span>{courseProgress(course)}%</span></div><div><strong>{course.lessons.filter((lesson) => lesson.progress.completed).length} of {course.lessons.length} lessons</strong><small>Course progress</small></div></div><div><Clock3 size={18} /><span><strong>{course.estimatedMinutes} min</strong><small>Estimated time</small></span></div><div><Zap size={18} /><span><strong>{weakCount(course)} concepts</strong><small>Need review</small></span></div></div>
    <section className="lesson-list"><div className="section-title"><div><p className="kicker">COURSE OUTLINE</p><h2>Lessons</h2></div></div>{course.lessons.map((lesson, index) => <button key={lesson.id} className={`lesson-row ${lesson.id === next.id ? 'current' : ''}`} onClick={() => onPlay(lesson.id)}><span className={`lesson-status ${lesson.progress.completed ? 'done' : ''}`}>{lesson.progress.completed ? <Check size={15} /> : index + 1}</span><div><strong>{lesson.title}</strong><p>{lesson.objective}</p></div><span className="lesson-time">{lesson.estimatedMinutes} min</span><ChevronRight size={18} /></button>)}</section>
  </div>
}

function weakCount(course: Course) { return course.lessons.flatMap((lesson) => Object.values(lesson.progress.checkpointAnswers)).filter((answer) => !answer.correct).length }

function LessonPlayer({ course, lesson, sources, onExit, onUpdate, onCheckpoint, onOpenLesson }: { course: Course; lesson: Lesson; sources: SourceMaterial[]; onExit: () => void; onUpdate: (course: Course) => void; onCheckpoint: (event: AppData['checkpointEvents'][number]) => void; onOpenLesson: (id: string) => void }) {
  const steps = useMemo(() => [{ type: 'intro' as const }, ...lesson.sections.map((content) => ({ type: 'section' as const, content })), ...lesson.checkpoints.map((content) => ({ type: 'checkpoint' as const, content })), { type: 'complete' as const }], [lesson])
  const [step, setStep] = useState(Math.min(lesson.progress.currentStep, steps.length - 1))
  const current = steps[step]
  const lessonIndex = course.lessons.findIndex((item) => item.id === lesson.id)
  const percentage = Math.round((step / (steps.length - 1)) * 100)

  function commitStep(nextStep: number) {
    setStep(nextStep)
    onUpdate({ ...course, updatedAt: new Date().toISOString(), lessons: course.lessons.map((item) => item.id === lesson.id ? { ...item, progress: { ...item.progress, currentStep: nextStep } } : item) })
  }
  function completeLesson() {
    const updated = { ...course, updatedAt: new Date().toISOString(), lessons: course.lessons.map((item) => item.id === lesson.id ? { ...item, progress: { ...item.progress, completed: true, currentStep: steps.length - 1, completedAt: new Date().toISOString() } } : item) }
    onUpdate(updated)
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.key === 'ArrowRight' || event.key === 'Enter') && current.type !== 'checkpoint' && step < steps.length - 1) commitStep(step + 1)
      if (event.key === 'ArrowLeft' && step > 0) commitStep(step - 1)
      if (event.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
  useEffect(() => { if (current.type === 'complete') completeLesson() }, [current.type]) // eslint-disable-line react-hooks/exhaustive-deps

  const section = current.type === 'section' ? current.content : null
  const checkpoint = current.type === 'checkpoint' ? current.content : null
  return <div className="player-shell"><header className="player-header"><button className="icon-button" onClick={onExit} aria-label="Exit lesson"><X /></button><div className="player-course"><strong>{course.title}</strong><span>Lesson {lessonIndex + 1} of {course.lessons.length}</span></div><div className="player-progress"><div><span style={{ width: `${percentage}%` }} /></div><small>{percentage}%</small></div></header><main className="lesson-stage">
    {current.type === 'intro' && <div className="lesson-intro"><div className="lesson-number">{String(lessonIndex + 1).padStart(2, '0')}</div><p className="kicker">LESSON {lessonIndex + 1} OF {course.lessons.length}</p><h1>{lesson.title}</h1><div className="objective"><span>What you'll learn</span><p>{lesson.objective}</p></div><div className="lesson-meta"><span><Clock3 size={16} />{lesson.estimatedMinutes} minutes</span><span><Layers3 size={16} />{lesson.concepts.length} concept</span></div></div>}
    {section && <SectionCard key={section.id} section={section} sources={sources} />}
    {checkpoint && <CheckpointCard key={checkpoint.id} checkpoint={checkpoint} previous={lesson.progress.checkpointAnswers[checkpoint.id]} onAnswer={(answer, correct) => {
      const prior = lesson.progress.checkpointAnswers[checkpoint.id]
      onUpdate({ ...course, lessons: course.lessons.map((item) => item.id === lesson.id ? { ...item, progress: { ...item.progress, checkpointAnswers: { ...item.progress.checkpointAnswers, [checkpoint.id]: { answer, correct, attempts: (prior?.attempts || 0) + 1, answeredAt: new Date().toISOString() } } } } : item) })
      onCheckpoint({ courseId: course.id, lessonId: lesson.id, checkpointId: checkpoint.id, concept: checkpoint.concept, correct, occurredAt: new Date().toISOString() })
    }} />}
    {current.type === 'complete' && <Completion course={course} lesson={lesson} onReview={() => {
      const missedIndex = lesson.checkpoints.findIndex((item) => lesson.progress.checkpointAnswers[item.id] && !lesson.progress.checkpointAnswers[item.id].correct)
      if (missedIndex >= 0) commitStep(1 + lesson.sections.length + missedIndex)
    }} onNext={() => course.lessons[lessonIndex + 1] ? onOpenLesson(course.lessons[lessonIndex + 1].id) : onExit()} onExit={onExit} />}
  </main>{current.type !== 'complete' && <footer className="player-footer"><button className="button secondary" disabled={step === 0} onClick={() => commitStep(step - 1)}><ArrowLeft size={17} />Back</button><span className="keyboard-tip"><kbd>←</kbd><kbd>→</kbd> to navigate</span><button className="button" disabled={checkpoint ? !lesson.progress.checkpointAnswers[checkpoint.id] : false} onClick={() => commitStep(Math.min(step + 1, steps.length - 1))}>{step === 0 ? 'Begin lesson' : checkpoint ? 'Continue' : 'Continue'}<ArrowRight size={17} /></button></footer>}</div>
}

function SectionCard({ section, sources }: { section: LessonSection; sources: SourceMaterial[] }) {
  const [sourceOpen, setSourceOpen] = useState(false)
  const [assist, setAssist] = useState<'different' | 'simple' | 'example' | null>(null)
  const [assistText, setAssistText] = useState('')
  const [assistBusy, setAssistBusy] = useState(false)
  const chunks = sources.flatMap((source) => source.chunks).filter((chunk) => section.sourceChunkIds.includes(chunk.id))
  async function requestAssist(mode: 'different' | 'simple' | 'example') {
    if (assist === mode) { setAssist(null); return }
    setAssist(mode); setAssistText(''); setAssistBusy(true)
    try {
      if (window.speedyAI) setAssistText(await explainSection(section, sources, mode))
      else setAssistText(mode === 'simple' ? `The central point is: ${section.body.split(/[.!?]/)[0].toLowerCase()}. Focus on that connection before adding the details.` : mode === 'different' ? 'Start with the relationship instead of the vocabulary. Then attach the terms from the source to that relationship.' : 'Imagine this concept as a handoff from one stage to the next.')
    } catch (error) { setAssistText(error instanceof Error ? error.message : 'Could not generate an explanation.') }
    finally { setAssistBusy(false) }
  }
  return <article className={`section-card kind-${section.kind}`}><p className="kicker">{section.eyebrow}</p><h1>{section.title}</h1><p className="section-body">{section.body}</p>{assist && <div className="assist-box"><Sparkles size={18} /><div><strong>{assist === 'simple' ? 'In simpler words' : assist === 'different' ? 'A different explanation' : 'Another way to picture it'}</strong><p>{assistBusy ? 'Thinking…' : assistText}</p></div></div>}<div className="section-tools"><button disabled={assistBusy} onClick={() => requestAssist('different')}>Explain differently</button><button disabled={assistBusy} onClick={() => requestAssist('simple')}>Simplify this</button><button disabled={assistBusy} onClick={() => requestAssist('example')}>Give me an example</button><button onClick={() => setSourceOpen(!sourceOpen)}><FileText size={14} />View source</button></div>{sourceOpen && <div className="source-drawer"><p className="kicker">SOURCE EXCERPT</p>{chunks.map((chunk) => <blockquote key={chunk.id}>{chunk.content}</blockquote>)}</div>}</article>
}

function CheckpointCard({ checkpoint, previous, onAnswer }: { checkpoint: LessonCheckpoint; previous?: Lesson['progress']['checkpointAnswers'][string]; onAnswer: (answer: string, correct: boolean) => void }) {
  const [selected, setSelected] = useState(previous?.answer || '')
  const [draft, setDraft] = useState('')
  const answered = Boolean(previous || selected)
  function choose(option: string) { if (answered) return; setSelected(option); onAnswer(option, option.toLowerCase().trim() === checkpoint.correctAnswer.toLowerCase().trim()) }
  const choices = checkpoint.kind === 'true-false' ? (checkpoint.options || ['True', 'False']) : checkpoint.options
  return <article className="checkpoint-card"><div className="check-icon"><Zap size={21} /></div><p className="kicker">CHECK YOUR UNDERSTANDING</p><h1>{checkpoint.question}</h1>{checkpoint.kind === 'short-recall' ? <form className="recall-form" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && !answered) choose(draft.trim()) }}><label htmlFor={`recall-${checkpoint.id}`}>Your answer</label><input id={`recall-${checkpoint.id}`} value={answered ? selected : draft} disabled={answered} onChange={(event) => setDraft(event.target.value)} placeholder="Type what you remember…" /><button className="button" disabled={!draft.trim() || answered}>Check answer</button></form> : <div className="answers">{choices?.map((option, index) => { const isSelected = selected === option; const correct = option === checkpoint.correctAnswer; return <button key={option} className={`${answered && correct ? 'correct' : ''} ${answered && isSelected && !correct ? 'incorrect' : ''}`} onClick={() => choose(option)}><span>{String.fromCharCode(65 + index)}</span>{option}{answered && correct ? <Check size={18} /> : null}</button> })}</div>}{answered && <div className={`feedback ${selected.toLowerCase().trim() === checkpoint.correctAnswer.toLowerCase().trim() ? 'right' : 'wrong'}`}><strong>{selected.toLowerCase().trim() === checkpoint.correctAnswer.toLowerCase().trim() ? 'Correct' : 'Not quite'}</strong><p>{checkpoint.explanation}</p></div>}</article>
}

function Completion({ course, lesson, onNext, onExit, onReview }: { course: Course; lesson: Lesson; onNext: () => void; onExit: () => void; onReview: () => void }) {
  const answers = Object.values(lesson.progress.checkpointAnswers)
  const correct = answers.filter((answer) => answer.correct).length
  return <article className="completion"><div className="completion-mark"><Check size={34} /></div><p className="kicker">LESSON COMPLETE</p><h1>Nicely done.</h1><p>You’ve built the next piece of the {course.title.toLowerCase()} story.</p><div className="learned"><strong>You learned</strong>{lesson.sections.map((section) => <span key={section.id}><Check size={16} />{section.body.split(/[.!?]/)[0]}</span>)}</div><div className="accuracy"><span>Checkpoint accuracy</span><strong>{correct} / {Math.max(answers.length, lesson.checkpoints.length)}</strong></div><div className="completion-actions"><button className="button secondary" onClick={onExit}>Finish</button>{correct < answers.length && <button className="button secondary" onClick={onReview}>Review mistakes</button>}<button className="button" onClick={onNext}>Next lesson <ArrowRight size={17} /></button></div></article>
}

function SourcesView({ sources, onAdd, onGenerate }: { sources: SourceMaterial[]; onAdd: (sources: SourceMaterial[]) => void; onGenerate: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function addFiles(files: FileList | null) { if (!files) return; setBusy(true); try { onAdd(await Promise.all([...files].map(extractSource))) } finally { setBusy(false) } }
  return <div className="page"><div className="page-heading"><div><p className="kicker">MATERIALS</p><h1>Your materials</h1><p>Everything SpeedyAI teaches is grounded in these uploads.</p></div><button data-add-material className="button" onClick={() => input.current?.click()}><Upload size={17} />{busy ? 'Importing…' : 'Add material'}</button><input hidden ref={input} type="file" multiple accept=".pdf,.pptx,.docx,.txt,.md,.csv" onChange={(e) => addFiles(e.target.files)} /></div><div className="materials-grid">{sources.map((source) => <div className="material-card" key={source.id}><div className="file-icon"><FileText /></div><div><strong>{source.name}</strong><p>{source.chunks.length} grounded sections · {Math.ceil(source.text.length / 1200)} min read</p></div><span>{source.type.toUpperCase()}</span></div>)}</div><button className="generate-banner" onClick={onGenerate}><BookOpen /><span><strong>Generate lessons from these materials</strong><small>Create an ordered, interactive course.</small></span><ArrowRight /></button></div>
}

function StudyMode({ data, onPlay }: { data: AppData; onPlay: (courseId: string, lessonId: string) => void }) {
  const course = data.courses.find((item) => courseProgress(item) < 100) || data.courses[0]
  const lesson = course && nextLesson(course)
  const weak = [...data.checkpointEvents].reverse().find((event) => !event.correct)
  return <div className="page study-page"><div className="study-hero"><p className="kicker light">TODAY'S SESSION</p><h1>A focused path through what matters.</h1><p>Built from your real lesson progress and checkpoint history.</p><div className="study-duration"><Clock3 />~16 minutes</div></div><div className="study-plan">{course && lesson && <StudyStep number="01" label="LEARN" title={`Continue “${lesson.title}”`} detail={`${lesson.estimatedMinutes} min · ${course.title}`} action="Continue" onClick={() => onPlay(course.id, lesson.id)} />}{weak && <StudyStep number="02" label="REVIEW" title={`Revisit ${weak.concept}`} detail="3 min · Based on a missed checkpoint" action="Review" onClick={() => onPlay(weak.courseId, weak.lessonId)} />}<StudyStep number={weak ? '03' : '02'} label="PRACTICE" title="8 due flashcards" detail="4 min · Spaced review" action="Coming soon" /><StudyStep number={weak ? '04' : '03'} label="CHECK" title="5 practice questions" detail="3 min · Mixed concepts" action="Coming soon" /></div></div>
}

function StudyStep({ number, label, title, detail, action, onClick }: { number: string; label: string; title: string; detail: string; action: string; onClick?: () => void }) { return <div className="study-step"><span className="step-number">{number}</span><div><p className="kicker">{label}</p><h3>{title}</h3><small>{detail}</small></div><button className="button secondary" disabled={!onClick} onClick={onClick}>{action}<ChevronRight size={16} /></button></div> }

function GenerateModal({ sources, initialSelected, initialTitle, regenerating, onClose, onSources, onGenerate }: { sources: SourceMaterial[]; initialSelected?: string[]; initialTitle?: string; regenerating?: boolean; onClose: () => void; onSources: (sources: SourceMaterial[]) => void; onGenerate: (ids: string[], title?: string) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>(initialSelected || sources.map((source) => source.id))
  const [title, setTitle] = useState(initialTitle || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  async function upload(files: FileList | null) { if (!files) return; setBusy(true); try { const added = await Promise.all([...files].map(extractSource)); onSources(added); setSelected((ids) => [...ids, ...added.map((source) => source.id)]) } catch (err) { setError(err instanceof Error ? err.message : 'Could not import file.') } finally { setBusy(false) } }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><button className="modal-close" aria-label="Close generator" onClick={onClose}><X /></button><div className="modal-icon"><Sparkles /></div><p className="kicker">{regenerating ? 'REGENERATE COURSE' : 'GENERATE LESSONS'}</p><h2>{regenerating ? 'Build a fresh course?' : 'What do you want to learn?'}</h2><p>Choose material to create a source-grounded course with ordered lessons and checkpoints.</p><label className="field"><span>Course title <small>optional</small></span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SpeedyAI will suggest one" /></label><div className="material-select-head"><strong>Select material</strong><button onClick={() => setSelected(selected.length === sources.length ? [] : sources.map((source) => source.id))}>{selected.length === sources.length ? 'Clear all' : 'Select all'}</button></div><div className="material-select">{sources.map((source) => <label key={source.id} className={selected.includes(source.id) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(source.id)} onChange={() => setSelected((ids) => ids.includes(source.id) ? ids.filter((id) => id !== source.id) : [...ids, source.id])} /><span className="check-box">{selected.includes(source.id) && <Check size={14} />}</span><FileText size={19} /><span><strong>{source.name}</strong><small>{source.chunks.length} source sections</small></span></label>)}</div><button className="upload-row" onClick={() => input.current?.click()}><Plus size={17} />Upload more material</button><input ref={input} hidden type="file" multiple accept=".pdf,.pptx,.docx,.txt,.md" onChange={(e) => upload(e.target.files)} />{error && <p className="error-text">{error}</p>}<button className="button modal-generate" disabled={!selected.length || busy} onClick={async () => { setBusy(true); setError(''); try { await onGenerate(selected, title || undefined) } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed.'); setBusy(false) } }}>{busy ? 'Building your course…' : regenerating ? 'Regenerate course' : 'Generate course'}<Sparkles size={17} /></button><small className="grounded-note">Generated content stays grounded in the selected material.</small></div></div>
}

function EmptyLibrary({ onGenerate }: { onGenerate: () => void }) { return <div className="empty-state"><h1>No courses yet</h1><p>Turn your first source into a guided learning experience.</p><button className="button" onClick={onGenerate}>Generate lessons</button></div> }

export default App
