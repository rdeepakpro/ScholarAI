import { beforeEach, describe, expect, it } from 'vitest'
import type { AppData, Course, SourceMaterial } from '../models'
import { emptyData, loadData, saveData } from './storage'

const createdAt = '2026-09-24T18:00:00.000Z'

const source: SourceMaterial = {
  id: 'source-algebra',
  name: 'Algebra notes.pdf',
  type: 'pdf',
  addedAt: createdAt,
  text: 'A variable represents an unknown value.',
  chunks: [{ id: 'chunk-variable', sourceId: 'source-algebra', heading: 'Variables', content: 'A variable represents an unknown value.' }],
}

const course: Course = {
  id: 'course-algebra',
  title: 'Algebra Foundations',
  description: 'Learn how variables work.',
  sourceIds: [source.id],
  estimatedMinutes: 5,
  createdAt,
  updatedAt: createdAt,
  lessons: [{
    id: 'lesson-variables',
    title: 'Understanding Variables',
    objective: 'Understand what a variable represents.',
    estimatedMinutes: 5,
    concepts: ['Variables'],
    sections: [{ id: 'section-variable', kind: 'explanation', eyebrow: 'START HERE', title: 'An unknown value', body: 'A variable stands for a value we do not yet know.', sourceChunkIds: ['chunk-variable'] }],
    checkpoints: [{ id: 'check-variable', kind: 'multiple-choice', concept: 'Variables', question: 'What does a variable represent?', options: ['An unknown value', 'A fixed operation'], correctAnswer: 'An unknown value', explanation: 'Variables are symbols for values.', sourceChunkIds: ['chunk-variable'] }],
    progress: { completed: true, currentStep: 2, completedAt: createdAt, checkpointAnswers: {} },
  }],
}

function populatedData(): AppData {
  return {
    ...emptyData(),
    onboardingCompleted: true,
    sources: [source],
    courses: [course],
    classes: [{ id: 'class-algebra', name: 'Algebra', createdAt }],
    checkpointEvents: [{ courseId: course.id, lessonId: 'lesson-variables', checkpointId: 'check-variable', concept: 'Variables', correct: true, occurredAt: createdAt }],
  }
}

describe('app data migration', () => {
  beforeEach(() => localStorage.clear())

  it('preserves user courses, lesson progress, sources, and checkpoint events', () => {
    const legacy = { sources: [source], courses: [course], checkpointEvents: populatedData().checkpointEvents }
    localStorage.setItem('speedyai:v0.1.0', JSON.stringify(legacy))

    const migrated = loadData(emptyData())

    expect(migrated.courses[0].lessons[0].progress.completed).toBe(true)
    expect(migrated.sources[0].id).toBe(source.id)
    expect(migrated.checkpointEvents).toHaveLength(1)
    expect(migrated.classes).toEqual([{ id: `class-${course.id}`, name: course.title, createdAt }])
  })

  it('removes only the old bundled demo and content derived from it', () => {
    const data = populatedData()
    data.sources.push({ ...source, id: 'demo-source-cellular-respiration', name: 'Chapter 7.pdf', chunks: [] })
    data.courses.push({ ...course, id: 'demo-course-cellular-respiration', sourceIds: ['demo-source-cellular-respiration'] })
    data.classes.push({ id: 'class-biology', name: 'Biology', createdAt })
    data.classes.push({ id: 'class-demo-course-cellular-respiration', name: 'Cellular Respiration', createdAt })
    data.profile.classes = ['Biology', 'Cellular Respiration', 'Algebra']
    data.notes.push({ id: 'demo-note', classId: 'class-biology', sourceIds: ['demo-source-cellular-respiration'], title: 'Old sample', markdown: '', createdAt, updatedAt: createdAt })
    localStorage.setItem('speedyai:v0.1.0', JSON.stringify(data))

    const migrated = loadData(emptyData())

    expect(migrated.sources.map((item) => item.id)).toEqual([source.id])
    expect(migrated.courses.map((item) => item.id)).toEqual([course.id])
    expect(migrated.classes).toEqual([{ id: 'class-algebra', name: 'Algebra', createdAt }])
    expect(migrated.notes).toEqual([])
    expect(migrated.profile.classes).toEqual(['Algebra'])
  })

  it('round-trips extended study data without clearing it', () => {
    const data = populatedData()
    saveData(data)
    expect(loadData(emptyData())).toEqual({ ...data, version: 3 })
  })
})
