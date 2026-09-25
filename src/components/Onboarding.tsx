import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Cloud, Cpu, Lock } from 'lucide-react'
import type { Profile } from '../models'
import scholarAILogo from '../assets/branding/scholarai-logo.png'
import { useLocalAI } from '../hooks/useLocalAI'

const education = ['Middle School', 'High School', 'College / University', 'Graduate School', 'Self-Studying', 'Professional / Career']
const goals = ['Understand difficult topics', 'Prepare for exams', 'Remember information', 'Create better notes', 'Make flashcards', 'Practice with quizzes']
const preferences = ['Short lessons', 'Detailed explanations', 'Real examples', 'Practice questions', 'Flashcards', 'Visual breakdowns']

function ChoiceGrid({ values, selected, onToggle, single = false }: { values: string[]; selected: string[]; onToggle: (next: string[]) => void; single?: boolean }) {
  return <div className="choice-grid">{values.map((value) => <button key={value} className={selected.includes(value) ? 'selected' : ''} onClick={() => onToggle(single ? [value] : selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])}><span>{selected.includes(value) ? <Check size={15} /> : null}</span>{value}</button>)}</div>
}

export function Onboarding({ onComplete, onSetupAI }: { onComplete: (profile: Profile, classes: string[]) => void; onSetupAI: () => void }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>({ educationType: '', classes: [], studyGoals: [], learningPreferences: [] })
  const [installing, setInstalling] = useState(false)
  const total = 5
  function next() { setStep((value) => Math.min(total - 1, value + 1)) }
  function finish(aiPreference: 'local' | 'custom') {
    const completed = { ...profile, aiPreference }
    onComplete(completed, completed.classes)
    if (aiPreference === 'custom') onSetupAI()
  }

  if (installing) return <LocalAISetup onReady={() => finish('local')} onBack={() => setInstalling(false)} />

  return <main className="onboarding-shell"><div className="onboarding-card">{step > 0 && <button className="onboarding-back" aria-label="Back" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /></button>}{step > 0 && <p className="onboarding-progress">{step} of {total - 1}</p>}
    {step === 0 && <section className="onboarding-welcome"><div className="onboarding-brand"><span><img src={scholarAILogo} alt="ScholarAI" /></span><strong>ScholarAI</strong></div><h1>Learn anything from your own material.</h1><p>Turn class files into short lessons, helpful notes, flashcards, and quizzes.</p><button className="button" onClick={next}>Get started <ArrowRight size={16} /></button></section>}
    {step === 1 && <section><h1>What best describes you?</h1><p>Pick one. You can change this later.</p><ChoiceGrid values={education} selected={profile.educationType ? [profile.educationType] : []} single onToggle={([educationType]) => setProfile({ ...profile, educationType })} /><button className="button" disabled={!profile.educationType} onClick={next}>Continue</button></section>}
    {step === 2 && <section><h1>What should ScholarAI help with?</h1><p>Choose as many as you like.</p><ChoiceGrid values={goals} selected={profile.studyGoals} onToggle={(studyGoals) => setProfile({ ...profile, studyGoals })} /><button className="button" disabled={!profile.studyGoals.length} onClick={next}>Continue</button></section>}
    {step === 3 && <section><h1>How do you like to learn?</h1><p>Choose what sounds useful.</p><ChoiceGrid values={preferences} selected={profile.learningPreferences} onToggle={(learningPreferences) => setProfile({ ...profile, learningPreferences })} /><button className="button" disabled={!profile.learningPreferences.length} onClick={next}>Continue</button></section>}
    {step === 4 && <section className="ai-choice-step"><div className="onboarding-brand compact"><span><img src={scholarAILogo} alt="ScholarAI" /></span><strong>ScholarAI</strong></div><h1>How should your AI run?</h1><p>Choose now and change it anytime in Settings.</p><div className="ai-option-list">
      <button className="ai-option recommended" onClick={() => setInstalling(true)}><span className="ai-option-icon"><Cpu /></span><span><small>RECOMMENDED</small><strong>Built-in Local AI</strong><em>Qwen 2.5 3B · Private, free, and works offline</em></span><ArrowRight /></button>
      <button className="ai-option" onClick={() => finish('custom')}><span className="ai-option-icon"><Cloud /></span><span><small>ADVANCED</small><strong>Use another provider</strong><em>Connect an OpenAI-compatible service with your own key</em></span><ArrowRight /></button>
    </div><div className="onboarding-private"><Lock size={14} />Local AI downloads a one-time ~2.1 GB model, then runs entirely on this computer.</div></section>}
  </div></main>
}

function LocalAISetup({ onReady, onBack }: { onReady: () => void; onBack: () => void }) {
  const localAI = useLocalAI()
  const { state } = localAI
  const ready = state.status === 'ready' || state.status === 'installed'
  const failed = !localAI.busy && !ready && !['downloading', 'verifying'].includes(state.status) && (state.status === 'error' || Boolean(localAI.message))
  const modelId = state.catalog.recommended.id

  useEffect(() => {
    if (ready) { const timer = window.setTimeout(onReady, 600); return () => window.clearTimeout(timer) }
  }, [ready, onReady])

  useEffect(() => {
    if (window.scholarAI) void localAI.install(modelId)
    // Start the download once when this screen opens; retries go through the Try again button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const percent = state.totalBytes ? Math.min(100, Math.round(state.downloadedBytes / state.totalBytes * 100)) : 0
  const gb = (bytes: number) => (bytes / 1e9).toFixed(2)
  const label = ready ? 'Local AI is ready' : state.status === 'downloading' ? `Downloading ${state.catalog.recommended.displayName}` : state.status === 'verifying' ? 'Checking the download' : 'Starting Local AI'
  const detail = !window.scholarAI ? 'Local AI setup is available in the installed ScholarAI desktop app.'
    : failed ? (state.error || localAI.message)
    : ready ? 'Opening ScholarAI…'
    : state.status === 'downloading' ? `${gb(state.downloadedBytes)} of ${gb(state.totalBytes)} GB · keep ScholarAI open until this finishes.`
    : 'Loading the model and running a quick test. This can take a minute.'

  return <main className="onboarding-shell"><div className="onboarding-card"><button className="onboarding-back" aria-label="Back" disabled={localAI.busy} onClick={() => { void localAI.cancel(); onBack() }}><ArrowLeft size={18} /></button>
    <section className="local-ai-setup"><div className="onboarding-brand compact"><span><img src={scholarAILogo} alt="ScholarAI" /></span><strong>ScholarAI</strong></div>
      <h1>{failed ? 'Local AI setup stopped' : label}</h1>
      <p role="status">{detail}</p>
      {!failed && <div className="setup-progress" aria-label="Setup progress" aria-valuenow={ready ? 100 : percent} role="progressbar"><span className={state.status === 'downloading' || ready ? '' : 'indeterminate'} style={{ width: `${ready ? 100 : state.status === 'downloading' ? percent : 100}%` }} /></div>}
      {!failed && state.status === 'downloading' && <strong className="setup-percent">{percent}%</strong>}
      {failed && <div className="setup-actions"><button className="button" onClick={() => void localAI.install(modelId)}>Try again</button><button className="button secondary" onClick={onReady}>Continue without Local AI</button></div>}
    </section></div></main>
}
