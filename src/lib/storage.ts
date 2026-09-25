import { z } from 'zod'
import { ChatThreadSchema, ClassSchema, CourseSchema, FlashcardSchema, NoteSchema, ProfileSchema, QuizSchema, SourceMaterialSchema, type AppData } from '../models'

const STORAGE_KEY = 'scholarai:v0.1.0'
const LEGACY_STORAGE_KEY = 'speedyai:v0.1.0'
const LEGACY_DEMO_SOURCE_ID = 'demo-source-cellular-respiration'
const LEGACY_DEMO_COURSE_ID = 'demo-course-cellular-respiration'
const LEGACY_DEMO_CLASS_IDS = new Set(['class-biology', 'class-demo-course-cellular-respiration'])
const AppDataSchema = z.object({
  version: z.number().default(3),
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
  return { version: 3, sources: [], courses: [], checkpointEvents: [], classes: [], notes: [], flashcards: [], quizzes: [], chats: [], profile: { educationType: '', classes: [], studyGoals: [], learningPreferences: [] }, onboardingCompleted: false }
}

function removeLegacyDemo(data: AppData): AppData {
  const demoClassNames = data.classes
    .filter((classRecord) => LEGACY_DEMO_CLASS_IDS.has(classRecord.id))
    .map((classRecord) => classRecord.name)
  const belongsToDemo = (item: { classId?: string; sourceIds: string[] }) =>
    (item.classId ? LEGACY_DEMO_CLASS_IDS.has(item.classId) : false) || item.sourceIds.includes(LEGACY_DEMO_SOURCE_ID)

  return {
    ...data,
    version: 3,
    sources: data.sources.filter((source) => source.id !== LEGACY_DEMO_SOURCE_ID),
    courses: data.courses.filter((course) => course.id !== LEGACY_DEMO_COURSE_ID),
    checkpointEvents: data.checkpointEvents.filter((event) => event.courseId !== LEGACY_DEMO_COURSE_ID),
    classes: data.classes.filter((classRecord) => !LEGACY_DEMO_CLASS_IDS.has(classRecord.id)),
    notes: data.notes.filter((note) => !belongsToDemo(note)),
    flashcards: data.flashcards.filter((flashcard) => !belongsToDemo(flashcard)),
    quizzes: data.quizzes.filter((quiz) => !belongsToDemo(quiz)),
    chats: data.chats.filter((chat) => !belongsToDemo(chat)),
    profile: demoClassNames.length
      ? { ...data.profile, classes: data.profile.classes.filter((className) => !demoClassNames.includes(className)) }
      : data.profile,
  }
}

export function loadData(fallback: AppData): AppData {
  try {
    const raw = (localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!raw) return fallback
    const parsed = AppDataSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return fallback
    const migrated = removeLegacyDemo(parsed.data)
    if (!migrated.classes.length && migrated.courses.length) {
      migrated.classes = migrated.courses.map((course) => ({ id: `class-${course.id}`, name: course.title, createdAt: course.createdAt }))
    }
    return migrated
  } catch {
    return fallback
  }
}

export function exportData(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `scholarai-export-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href)
}

export function clearData() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY) }

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
