import { useEffect, useState } from 'react'
import { Check, ChevronRight, Cpu, Download, Database, Info, Lock, Monitor, Moon, Sun, Trash2, UserRound, X } from 'lucide-react'
import type { LocalAIState } from '../lib/ai'
import type { AppData } from '../models'
import { clearData, exportData } from '../lib/storage'

type LocalAIController = {
  state: LocalAIState; busy: boolean; message: string
  install(modelId: string): Promise<void>; cancel(): Promise<void>; remove(): Promise<void>; test(): Promise<void>
}

export type Theme = 'light' | 'dark' | 'system'

function formatBytes(bytes: number) {
  if (!bytes) return '0 GB'
  return `${(bytes / 1e9).toFixed(bytes >= 1e9 ? 1 : 2)} GB`
}

function LocalAIContent({ controller }: { controller: LocalAIController }) {
  const { state, busy, message } = controller
  const [advanced, setAdvanced] = useState(false)
  const [provider, setProvider] = useState({ type: 'custom' as const, name: '', endpoint: '', model: '', apiKey: '' })
  const [providerMessage, setProviderMessage] = useState('')
  const progress = state.totalBytes ? Math.min(100, Math.round(state.downloadedBytes / state.totalBytes * 100)) : 0

  useEffect(() => {
    window.scholarAI?.provider.get().then((value) => {
      if (value.type === 'custom') setProvider({ type: 'custom', name: value.name || '', endpoint: value.endpoint || '', model: value.model || '', apiKey: value.apiKey || '' })
    })
  }, [])

  if (state.status === 'downloading' || state.status === 'verifying') return <section className="ai-download-panel">
    <div className="settings-icon"><Download /></div>
    <p className="kicker">PRIVATE & OFFLINE</p>
    <h2>{state.status === 'verifying' ? 'Checking your download' : 'Downloading Local AI'}</h2>
    <p>{state.status === 'verifying' ? 'Making sure every byte arrived safely before installation.' : 'You can keep using ScholarAI while this finishes.'}</p>
    <div className="download-numbers"><strong>{formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}</strong><span>{progress}%</span></div>
    <div className="download-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    <div className="private-note"><Lock size={15} />This stays on your computer.</div>
    {state.status === 'downloading' && <button className="button secondary" onClick={() => controller.cancel()}>Cancel download</button>}
  </section>

  const ready = state.status === 'ready' || state.status === 'installed'
  return <>
    {ready ? <section className="settings-section ai-ready">
      <div className="settings-row"><div className="settings-icon"><Cpu /></div><div><div className="status-line"><h2>Local AI</h2><span><i />Ready</span></div><p>Runs privately on this computer</p></div></div>
      <div className="model-installed"><div><strong>{state.modelName}</strong><span>{formatBytes(state.totalBytes)}</span></div><div><button className="button secondary" disabled={busy} onClick={() => controller.test()}>Test</button><button className="button tertiary" disabled={busy} onClick={() => window.confirm('Remove Local AI from this computer? You can download it again later.') && controller.remove()}><Trash2 size={15} />Remove</button></div></div>
    </section> : <section className="settings-section ai-setup">
      <div className="settings-icon"><Cpu /></div><p className="kicker">RECOMMENDED</p><h2>Run AI privately on this computer.</h2><p className="settings-lead">No account, API key, or separate software required. Download once, then use ScholarAI offline.</p>
      <div className="model-choice primary-choice"><div><span className="choice-label">LOCAL AI · DEFAULT</span><h3>Qwen 2.5 3B</h3><p>Balanced for lessons and study material on everyday computers</p><span className="model-size">~2.1 GB download</span></div><button className="button" disabled={busy} onClick={() => controller.install('qwen2.5-3b-instruct-q4km')}>Download Local AI</button></div>
      <div className="model-choice"><div><span className="choice-label">SMALLER COMPUTERS</span><h3>Qwen3 1.7B</h3><p>Faster and lighter, with simpler responses</p><span className="model-size">~1.3 GB download</span></div><button className="button secondary" disabled={busy} onClick={() => controller.install('qwen3-1.7b-q4km')}>Use lightweight model</button></div>
      {!window.scholarAI && <p className="desktop-note"><Monitor size={15} />Downloads become available in the installed desktop app.</p>}
    </section>}
    {message && <div className={state.status === 'error' ? 'settings-message error' : 'settings-message'}>{message}<button aria-label="Dismiss message"><X size={14} /></button></div>}
    <section className="settings-section advanced-section"><button className="advanced-toggle" onClick={() => setAdvanced(!advanced)}><span><strong>Other models</strong><small>Add an OpenAI-compatible provider</small></span><ChevronRight className={advanced ? 'rotated' : ''} /></button>{advanced && <form className="provider-form" onSubmit={async (event) => { event.preventDefault(); if (!window.scholarAI) return setProviderMessage('Provider settings are saved by the desktop app.'); await window.scholarAI.provider.set(provider); setProviderMessage('Provider saved securely.') }}><p>For advanced users who prefer another model service.</p><label>Name<input value={provider.name} onChange={(event) => setProvider({ ...provider, name: event.target.value })} placeholder="My provider" /></label><label>Endpoint<input value={provider.endpoint} onChange={(event) => setProvider({ ...provider, endpoint: event.target.value })} placeholder="https://api.example.com/v1" /></label><label>Model<input value={provider.model} onChange={(event) => setProvider({ ...provider, model: event.target.value })} placeholder="Model identifier" /></label><label>API key<input type="password" autoComplete="off" value={provider.apiKey} onChange={(event) => setProvider({ ...provider, apiKey: event.target.value })} placeholder="Stored securely" /></label><div className="button-row"><button className="button secondary">Save provider</button><button type="button" className="button secondary" onClick={async () => { if (!window.scholarAI) return setProviderMessage('Connection testing is available in the desktop app.'); try { await window.scholarAI.provider.set(provider); await window.scholarAI.generate({ system: 'Reply with OK only.', prompt: 'Connection test', maxTokens: 8 }); setProviderMessage('Connection successful.') } catch (error) { setProviderMessage(error instanceof Error ? error.message : 'Connection failed.') } }}>Test connection</button></div>{providerMessage && <small>{providerMessage}</small>}</form>}</section>
  </>
}

export function SettingsView({ controller, theme, onTheme, data, onChange }: { controller: LocalAIController; theme: Theme; onTheme: (theme: Theme) => void; data: AppData; onChange: (fn: (data: AppData) => AppData) => void }) {
  const [tab, setTab] = useState<'models' | 'appearance' | 'profile' | 'data' | 'about'>('models')
  const [className, setClassName] = useState('')
  const tabs = [{ id: 'appearance' as const, label: 'Appearance', icon: Sun }, { id: 'models' as const, label: 'Models', icon: Cpu }, { id: 'profile' as const, label: 'Profile', icon: UserRound }, { id: 'data' as const, label: 'Data', icon: Database }, { id: 'about' as const, label: 'About', icon: Info }]
  return <div className="page settings-page"><div className="settings-header"><h1>Settings</h1></div><div className="settings-layout"><nav className="settings-nav">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}</nav><div className="settings-content">
    {tab === 'models' && <><div className="settings-content-title"><h1>Models</h1><p>Choose how ScholarAI generates lessons, notes, flashcards, and quizzes.</p></div><LocalAIContent controller={controller} /></>}
    {tab === 'appearance' && <><div className="settings-content-title"><h1>Appearance</h1></div><section className="settings-section appearance-section"><h2>Theme</h2>{([{ id: 'system', label: 'System', icon: Monitor }, { id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }] as const).map(({ id, label, icon: Icon }) => <label key={id} className={theme === id ? 'selected' : ''}><input type="radio" name="theme" checked={theme === id} onChange={() => onTheme(id)} /><Icon size={18} /><span>{label}</span>{theme === id && <Check size={16} />}</label>)}</section></>}
    {tab === 'profile' && <><div className="settings-content-title"><h1>Profile</h1><p>Personalization changes future generations without deleting study data.</p></div><section className="settings-section profile-form"><label>Education level<input value={data.profile.educationType} onChange={(event) => onChange((current) => ({ ...current, profile: { ...current.profile, educationType: event.target.value } }))} /></label><label>Grade or field<input value={data.profile.grade || data.profile.field || ''} onChange={(event) => onChange((current) => ({ ...current, profile: { ...current.profile, grade: event.target.value } }))} /></label><h3>Classes</h3><div className="selected-list">{data.classes.map((item) => <button key={item.id} onClick={() => onChange((current) => ({ ...current, classes: current.classes.filter((entry) => entry.id !== item.id) }))}>{item.name} ×</button>)}</div><div className="inline-entry"><input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Add class" /><button className="button secondary" onClick={() => { const value = className.trim(); if (!value) return; onChange((current) => ({ ...current, classes: [...current.classes, { id: crypto.randomUUID(), name: value, createdAt: new Date().toISOString() }], profile: { ...current.profile, classes: [...current.profile.classes, value] } })); setClassName('') }}>Add</button></div><label>Study goals<textarea value={data.profile.studyGoals.join('\n')} onChange={(event) => onChange((current) => ({ ...current, profile: { ...current.profile, studyGoals: event.target.value.split('\n').filter(Boolean) } }))} /></label><label>Learning preferences<textarea value={data.profile.learningPreferences.join('\n')} onChange={(event) => onChange((current) => ({ ...current, profile: { ...current.profile, learningPreferences: event.target.value.split('\n').filter(Boolean) } }))} /></label></section></>}
    {tab === 'data' && <><div className="settings-content-title"><h1>Data</h1><p>Your study data stays on this computer.</p></div><section className="settings-section data-actions"><div><strong>Local data location</strong><p>ScholarAI application data directory</p></div><button className="button secondary" onClick={() => exportData(data)}>Export my data</button><button className="button tertiary" onClick={() => { if (window.confirm('Delete all local ScholarAI data? This cannot be undone.') && window.confirm('Are you absolutely sure? Export first if you need a copy.')) { clearData(); location.reload() } }}><Trash2 size={15} />Delete all local data</button></section></>}
    {tab === 'about' && <><div className="settings-content-title"><h1>About</h1></div><section className="settings-section about-panel"><h2>ScholarAI</h2><p>Version 0.1.0</p><p>Open-source desktop study application.</p><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a><a href="https://opensource.org/license/mit" target="_blank" rel="noreferrer">MIT License</a></section></>}
  </div></div></div>
}

export function LocalAIHomeCard({ state, onSetup }: { state: LocalAIState; onSetup: () => void }) {
  if (state.status === 'ready' || state.status === 'installed') return null
  const downloading = state.status === 'downloading' || state.status === 'verifying'
  const progress = state.totalBytes ? Math.min(100, Math.round(state.downloadedBytes / state.totalBytes * 100)) : 0
  return <button className="local-ai-home" onClick={onSetup}><div className="local-ai-symbol"><Lock /></div><div><p className="kicker">{downloading ? 'SETTING UP' : 'PRIVATE · FREE · WORKS OFFLINE'}</p><h2>{downloading ? `Downloading Local AI — ${progress}%` : 'Set up Local AI'}</h2><p>{downloading ? `${formatBytes(state.downloadedBytes)} of ${formatBytes(state.totalBytes)}` : 'Generate lessons privately, without an account or API key.'}</p></div><ChevronRight /></button>
}
