import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Cloud, Cpu, Lock } from 'lucide-react'
import type { Profile } from '../models'
import speedyAILogo from '../assets/branding/speedyai-logo.png'

const education = ['Middle School', 'High School', 'College / University', 'Graduate School', 'Self-Studying', 'Professional / Career']
const goals = ['Understand difficult topics', 'Prepare for exams', 'Remember information', 'Create better notes', 'Make flashcards', 'Practice with quizzes']
const preferences = ['Short lessons', 'Detailed explanations', 'Real examples', 'Practice questions', 'Flashcards', 'Visual breakdowns']

function ChoiceGrid({ values, selected, onToggle, single = false }: { values: string[]; selected: string[]; onToggle: (next: string[]) => void; single?: boolean }) {
  return <div className="choice-grid">{values.map((value) => <button key={value} className={selected.includes(value) ? 'selected' : ''} onClick={() => onToggle(single ? [value] : selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])}><span>{selected.includes(value) ? <Check size={15} /> : null}</span>{value}</button>)}</div>
}

export function Onboarding({ onComplete, onSetupAI }: { onComplete: (profile: Profile, classes: string[]) => void; onSetupAI: () => void }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>({ educationType: '', classes: [], studyGoals: [], learningPreferences: [] })
  const total = 5
  function next() { setStep((value) => Math.min(total - 1, value + 1)) }
  function finish(aiPreference: 'local' | 'custom') {
    const completed = { ...profile, aiPreference }
    onComplete(completed, completed.classes)
    if (aiPreference === 'custom') onSetupAI()
  }

  return <main className="onboarding-shell"><div className="onboarding-card">{step > 0 && <button className="onboarding-back" aria-label="Back" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /></button>}{step > 0 && <p className="onboarding-progress">{step} of {total - 1}</p>}
    {step === 0 && <section className="onboarding-welcome"><div className="onboarding-brand"><span><img src={speedyAILogo} alt="SpeedyAI" /></span><strong>SpeedyAI</strong></div><h1>Learn anything from your own material.</h1><p>Turn class files into short lessons, helpful notes, flashcards, and quizzes.</p><button className="button" onClick={next}>Get started <ArrowRight size={16} /></button></section>}
    {step === 1 && <section><h1>What best describes you?</h1><p>Pick one. You can change this later.</p><ChoiceGrid values={education} selected={profile.educationType ? [profile.educationType] : []} single onToggle={([educationType]) => setProfile({ ...profile, educationType })} /><button className="button" disabled={!profile.educationType} onClick={next}>Continue</button></section>}
    {step === 2 && <section><h1>What should SpeedyAI help with?</h1><p>Choose as many as you like.</p><ChoiceGrid values={goals} selected={profile.studyGoals} onToggle={(studyGoals) => setProfile({ ...profile, studyGoals })} /><button className="button" disabled={!profile.studyGoals.length} onClick={next}>Continue</button></section>}
    {step === 3 && <section><h1>How do you like to learn?</h1><p>Choose what sounds useful.</p><ChoiceGrid values={preferences} selected={profile.learningPreferences} onToggle={(learningPreferences) => setProfile({ ...profile, learningPreferences })} /><button className="button" disabled={!profile.learningPreferences.length} onClick={next}>Continue</button></section>}
    {step === 4 && <section className="ai-choice-step"><div className="onboarding-brand compact"><span><img src={speedyAILogo} alt="SpeedyAI" /></span><strong>SpeedyAI</strong></div><h1>How should your AI run?</h1><p>Choose now and change it anytime in Settings. Nothing downloads during onboarding.</p><div className="ai-option-list">
      <button className="ai-option recommended" onClick={() => finish('local')}><span className="ai-option-icon"><Cpu /></span><span><small>RECOMMENDED</small><strong>Built-in Local AI</strong><em>Qwen 2.5 3B · Private, free, and works offline</em></span><ArrowRight /></button>
      <button className="ai-option" onClick={() => finish('custom')}><span className="ai-option-icon"><Cloud /></span><span><small>ADVANCED</small><strong>Use another provider</strong><em>Connect an OpenAI-compatible service with your own key</em></span><ArrowRight /></button>
    </div><div className="onboarding-private"><Lock size={14} />Selecting Local AI only saves your choice. You can download the model later in Settings.</div></section>}
  </div></main>
}
