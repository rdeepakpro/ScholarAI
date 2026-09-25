import { z } from 'zod'

export const SourceChunkSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  heading: z.string().optional(),
  content: z.string().min(1),
})

export const SourceMaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  addedAt: z.string(),
  text: z.string(),
  chunks: z.array(SourceChunkSchema),
  classId: z.string().optional(),
})

export const LessonSectionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['explanation', 'key-idea', 'example', 'definition', 'comparison', 'formula', 'diagram', 'important']),
  eyebrow: z.string(),
  title: z.string(),
  body: z.string().min(1),
  sourceChunkIds: z.array(z.string()).default([]),
})

export const LessonCheckpointSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['multiple-choice', 'true-false', 'short-recall']),
  concept: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  sourceChunkIds: z.array(z.string()).default([]),
})

export const LessonProgressSchema = z.object({
  completed: z.boolean(),
  currentStep: z.number().int().nonnegative(),
  checkpointAnswers: z.record(z.string(), z.object({
    answer: z.string(),
    correct: z.boolean(),
    attempts: z.number().int().positive(),
    answeredAt: z.string(),
  })),
  completedAt: z.string().optional(),
})

export const LessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  estimatedMinutes: z.number().int().min(3).max(10),
  concepts: z.array(z.string()).min(1),
  sections: z.array(LessonSectionSchema).min(1),
  checkpoints: z.array(LessonCheckpointSchema).min(1),
  progress: LessonProgressSchema,
})

export const CourseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().positive(),
  lessons: z.array(LessonSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  classId: z.string().optional(),
})

export type SourceChunk = z.infer<typeof SourceChunkSchema>
export type SourceMaterial = z.infer<typeof SourceMaterialSchema>
export type LessonSection = z.infer<typeof LessonSectionSchema>
export type LessonCheckpoint = z.infer<typeof LessonCheckpointSchema>
export type LessonProgress = z.infer<typeof LessonProgressSchema>
export type Lesson = z.infer<typeof LessonSchema>
export type Course = z.infer<typeof CourseSchema>

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.string(),
})

export const NoteSchema = z.object({
  id: z.string(), classId: z.string().optional(), sourceIds: z.array(z.string()),
  title: z.string(), markdown: z.string(), createdAt: z.string(), updatedAt: z.string(),
})

export const FlashcardSchema = z.object({
  id: z.string(), classId: z.string().optional(), sourceIds: z.array(z.string()), concept: z.string(),
  front: z.string(), back: z.string(), explanation: z.string().optional(), dueAt: z.string(),
  intervalDays: z.number().nonnegative(), ease: z.number().positive(), reviewHistory: z.array(z.object({ rating: z.enum(['again', 'hard', 'good', 'easy']), reviewedAt: z.string(), dueAt: z.string() })),
})

export const QuizSchema = z.object({
  id: z.string(), classId: z.string().optional(), sourceIds: z.array(z.string()), title: z.string(),
  questions: z.array(LessonCheckpointSchema), attempts: z.array(z.object({ answers: z.record(z.string(), z.string()), correct: z.number().nonnegative(), total: z.number().nonnegative(), completedAt: z.string() })),
  createdAt: z.string(),
})

export const ChatThreadSchema = z.object({
  id: z.string(), classId: z.string().optional(), sourceIds: z.array(z.string()), title: z.string(),
  messages: z.array(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), content: z.string(), sourceChunkIds: z.array(z.string()).optional(), createdAt: z.string() })),
  createdAt: z.string(), updatedAt: z.string(),
})

export const ProfileSchema = z.object({
  educationType: z.string().default(''), grade: z.string().optional(), field: z.string().optional(),
  studyFor: z.string().optional(), classes: z.array(z.string()).default([]),
  studyGoals: z.array(z.string()).default([]), learningPreferences: z.array(z.string()).default([]),
  aiPreference: z.enum(['local', 'custom']).optional(),
})

export type ClassRecord = z.infer<typeof ClassSchema>
export type Note = z.infer<typeof NoteSchema>
export type Flashcard = z.infer<typeof FlashcardSchema>
export type Quiz = z.infer<typeof QuizSchema>
export type ChatThread = z.infer<typeof ChatThreadSchema>
export type Profile = z.infer<typeof ProfileSchema>

export type CheckpointEvent = {
  courseId: string
  lessonId: string
  checkpointId: string
  concept: string
  correct: boolean
  occurredAt: string
}

export type AppData = {
  version: number
  sources: SourceMaterial[]
  courses: Course[]
  checkpointEvents: CheckpointEvent[]
  classes: ClassRecord[]
  notes: Note[]
  flashcards: Flashcard[]
  quizzes: Quiz[]
  chats: ChatThread[]
  profile: Profile
  onboardingCompleted: boolean
}
