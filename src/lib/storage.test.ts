import { beforeEach, describe, expect, it } from 'vitest'
import { demoCourse, demoSource, initialData } from '../data/demo'
import { loadData, saveData } from './storage'

describe('app data migration', () => {
  beforeEach(() => localStorage.clear())

  it('preserves legacy courses, lesson progress, sources, and checkpoint events', () => {
    const legacy = { sources: [demoSource], courses: [demoCourse], checkpointEvents: [{ courseId: demoCourse.id, lessonId: demoCourse.lessons[0].id, checkpointId: demoCourse.lessons[0].checkpoints[0].id, concept: 'ATP', correct: true, occurredAt: new Date().toISOString() }] }
    localStorage.setItem('speedyai:v0.1.0', JSON.stringify(legacy))
    const migrated = loadData(initialData)
    expect(migrated.courses[0].lessons[0].progress.completed).toBe(true)
    expect(migrated.sources[0].id).toBe(demoSource.id)
    expect(migrated.checkpointEvents).toHaveLength(1)
    expect(migrated.classes).toHaveLength(1)
  })

  it('round-trips extended study data without clearing it', () => {
    saveData(initialData)
    expect(loadData(initialData)).toEqual(initialData)
  })
})
