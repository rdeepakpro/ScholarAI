import { z } from 'zod'
import { ChatThreadSchema, ClassSchema, CourseSchema, FlashcardSchema, NoteSchema, ProfileSchema, QuizSchema, SourceMaterialSchema, type AppData } from '../models'

const STORAGE_KEY = 'speedyai:v0.1.0'
const AppDataSchema = z.object({
  version: z.number().default(2),
  sources: z.array(SourceMaterialSchema),
  courses: z.array(CourseSchema),
  checkpointEvents: z.array(z.object({
    courseId: z.string(),
    lessonId: z.string(),
    checkpointId: z.string(),
    concept: z.string(),
    correct: z.boolean(),
    occurredAt: z.string(),
  })),
  classes: z.array(ClassSchema).default([]),
  notes: z.array(NoteSchema).default([]),
  flashcards: z.array(FlashcardSchema).default([]),
  quizzes: z.array(QuizSchema).default([]),
  chats: z.array(ChatThreadSchema).default([]),
  profile: ProfileSchema.default({ educationType: '', classes: [], studyGoals: [], learningPreferences: [] }),
  onboardingCompleted: z.boolean().default(true),
})

export function emptyData(): AppData {
  return { version: 2, sources: [], courses: [], checkpointEvents: [], classes: [], notes: [], flashcards: [], quizzes: [], chats: [], profile: { educationType: '', classes: [], studyGoals: [], learningPreferences: [] }, onboardingCompleted: false }
}

export function loadData(fallback: AppData): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = AppDataSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return fallback
    const migrated = parsed.data
    if (!migrated.classes.length && migrated.courses.length) {
      migrated.classes = migrated.courses.map((course) => ({ id: `class-${course.id}`, name: course.title, createdAt: course.createdAt }))
    }
    return migrated
  } catch {
    return fallback
  }
}

export function hasStoredData() { return Boolean(localStorage.getItem(STORAGE_KEY)) }

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `speedyai-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href)
}

export function clearData() { localStorage.removeItem(STORAGE_KEY) }

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
