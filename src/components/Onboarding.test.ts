import { describe, expect, it } from 'vitest'
import { onboardingBranch } from './onboarding-routes'

describe('onboarding branches', () => {
  it('uses course and field questions for college students', () => {
    const route = onboardingBranch('College / University')
    expect(route.detail).toBe('What are you studying?')
    expect(route.classes).toBe('What courses are you taking right now?')
  })

  it('uses purpose and learning-topic questions for self-study', () => {
    const route = onboardingBranch('Self-Studying')
    expect(route.options).toContain('Standardized test')
    expect(route.options).toContain('Certification')
    expect(route.classes).toBe('What are you learning?')
  })
})
