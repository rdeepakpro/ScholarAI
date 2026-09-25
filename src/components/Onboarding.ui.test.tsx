import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('downloads Local AI when chosen and only finishes onboarding once it is ready', async () => {
    const onComplete = vi.fn()
    const onSetupAI = vi.fn()
    render(<Onboarding onComplete={onComplete} onSetupAI={onSetupAI} />)

    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    fireEvent.click(screen.getByRole('button', { name: /college/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /understand difficult topics/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /short lessons/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByRole('button', { name: /built-in local ai/i })).toHaveTextContent('Qwen 2.5 3B')
    expect(screen.getByRole('button', { name: /use another provider/i })).toBeVisible()
    expect(onComplete).not.toHaveBeenCalled()
    expect(onSetupAI).not.toHaveBeenCalled()

    let status = 'not-installed'
    const install = vi.fn(async () => { status = 'ready' })
    const state = () => ({ available: true, status, modelId: null, modelName: null, modelPath: null, downloadedBytes: 0, totalBytes: 0, error: null, catalog: { recommended: { id: 'qwen2.5-3b-instruct-q4km', displayName: 'Qwen 2.5 3B', bytes: 1, source: '' } } })
    window.scholarAI = { localAI: { getState: async () => state(), install, cancel: vi.fn(), remove: vi.fn(), test: vi.fn(), generate: vi.fn(), onProgress: () => () => {} }, provider: { get: vi.fn(), set: vi.fn() }, generate: vi.fn() } as unknown as typeof window.scholarAI

    fireEvent.click(screen.getByRole('button', { name: /built-in local ai/i }))
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    await waitFor(() => expect(install).toHaveBeenCalledWith('qwen2.5-3b-instruct-q4km'))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ aiPreference: 'local' }), []))
    expect(onSetupAI).not.toHaveBeenCalled()
    delete window.scholarAI
  })
})
