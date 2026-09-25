import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('uses button-only setup and records the local AI choice without starting setup', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /built-in local ai/i }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ aiPreference: 'local' }), [])
    expect(onSetupAI).not.toHaveBeenCalled()
  })
})
