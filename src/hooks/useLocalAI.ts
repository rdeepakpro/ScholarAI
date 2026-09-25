import { useCallback, useEffect, useState } from 'react'
import type { LocalAIState } from '../lib/ai'

const browserState: LocalAIState = {
  available: false, status: 'not-installed', modelId: null, modelName: null, modelPath: null,
  downloadedBytes: 0, totalBytes: 0, error: null,
  catalog: {
    recommended: { id: 'qwen2.5-3b-instruct-q4km', displayName: 'Qwen 2.5 3B', bytes: 2104932768, source: 'Qwen/Qwen2.5-3B-Instruct-GGUF' },
    lightweight: { id: 'qwen3-1.7b-q4km', displayName: 'Qwen3 1.7B', bytes: 1280000000, source: 'ggml-org/Qwen3-1.7B-GGUF' },
  },
}

export function useLocalAI() {
  const [state, setState] = useState<LocalAIState>(browserState)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (!window.speedyAI) return setState(browserState)
    setState(await window.speedyAI.localAI.getState())
  }, [])

  useEffect(() => {
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
    const unsubscribe = window.speedyAI?.localAI.onProgress(setState)
    return () => { if (typeof unsubscribe === 'function') unsubscribe() }
  }, [refresh])

  async function run(action: () => Promise<unknown>, success = '') {
    setBusy(true); setMessage('')
    try { await action(); await refresh(); setMessage(success) }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }

  return {
    state, busy, message,
    install: (modelId: string) => run(async () => {
      if (!window.speedyAI) throw new Error('Model downloads are available in the installed SpeedyAI desktop app.')
      await window.speedyAI.localAI.install(modelId)
    }, 'Local AI is ready.'),
    cancel: () => run(async () => window.speedyAI?.localAI.cancel(), 'Download paused. You can resume it later.'),
    remove: () => run(async () => window.speedyAI?.localAI.remove(), 'Local AI was removed from this computer.'),
    test: () => run(async () => window.speedyAI?.localAI.test(), 'Test complete — Local AI is working.'),
    clearMessage: () => setMessage(''),
  }
}
