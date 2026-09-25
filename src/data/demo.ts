import type { AppData, Course, Lesson, SourceMaterial } from '../models'

const sourceId = 'demo-source-cellular-respiration'
const chunks = [
  { id: 'demo-chunk-atp', sourceId, heading: 'ATP and cellular work', content: 'Cells require a usable energy currency to power active transport, movement, synthesis, and other cellular work. ATP transfers energy when its terminal phosphate bond is broken. Cellular respiration converts energy stored in glucose into ATP that a cell can use.' },
  { id: 'demo-chunk-glycolysis', sourceId, heading: 'Glycolysis', content: 'Glycolysis occurs in the cytoplasm. One six-carbon glucose is split into two three-carbon pyruvate molecules. The pathway has an energy investment phase and an energy payoff phase, producing a net gain of two ATP and two NADH per glucose.' },
  { id: 'demo-chunk-pyruvate', sourceId, heading: 'Pyruvate oxidation', content: 'In eukaryotic cells, pyruvate enters the mitochondrial matrix. Each pyruvate loses carbon dioxide, is oxidized while NAD+ becomes NADH, and joins coenzyme A to form acetyl-CoA.' },
  { id: 'demo-chunk-krebs', sourceId, heading: 'Citric acid cycle', content: 'Acetyl-CoA enters the citric acid cycle in the mitochondrial matrix. Its two carbons are eventually released as carbon dioxide. The cycle captures energy mainly as NADH and FADH2 and also makes a small amount of ATP.' },
  { id: 'demo-chunk-etc', sourceId, heading: 'Electron transport', content: 'NADH and FADH2 donate high-energy electrons to the electron transport chain in the inner mitochondrial membrane. As electrons move through protein complexes, their energy pumps protons into the intermembrane space. Oxygen is the final electron acceptor and combines with electrons and protons to form water.' },
  { id: 'demo-chunk-chemiosmosis', sourceId, heading: 'Chemiosmosis', content: 'The electron transport chain creates an electrochemical proton gradient across the inner mitochondrial membrane. Protons flow back into the matrix through ATP synthase. This flow drives oxidative phosphorylation, which produces most of the ATP in cellular respiration.' },
  { id: 'demo-chunk-overview', sourceId, heading: 'Process overview', content: 'Cellular respiration transfers energy from glucose to ATP through glycolysis, pyruvate oxidation, the citric acid cycle, and oxidative phosphorylation. Glycolysis starts in the cytoplasm; the remaining aerobic stages occur in or across the mitochondrion.' },
]

export const demoSource: SourceMaterial = {
  id: sourceId,
  name: 'Chapter 7 — Cellular Respiration.pdf',
  type: 'pdf',
  addedAt: '2026-09-22T16:00:00.000Z',
  text: chunks.map((chunk) => chunk.content).join('\n\n'),
  chunks,
}

type LessonSeed = {
  title: string
  objective: string
  concept: string
  eyebrow: string
  sectionTitle: string
  body: string
  key: string
  question: string
  options: string[]
  answer: string
  explanation: string
  minutes: number
}

function lesson(seed: LessonSeed, index: number): Lesson {
  const id = `demo-lesson-${index + 1}`
  const chunkId = chunks[index].id
  return {
    id,
    title: seed.title,
    objective: seed.objective,
    estimatedMinutes: seed.minutes,
    concepts: [seed.concept],
    sections: [
      { id: `${id}-a`, kind: 'explanation', eyebrow: seed.eyebrow, title: seed.sectionTitle, body: seed.body, sourceChunkIds: [chunkId] },
      { id: `${id}-b`, kind: 'key-idea', eyebrow: 'KEY IDEA', title: 'Hold onto this', body: seed.key, sourceChunkIds: [chunkId] },
    ],
    checkpoints: [{
      id: `${id}-check`, kind: 'multiple-choice', concept: seed.concept, question: seed.question,
      options: seed.options, correctAnswer: seed.answer, explanation: seed.explanation, sourceChunkIds: [chunkId],
    }],
    progress: index < 2
      ? { completed: true, currentStep: 4, completedAt: '2026-09-24T18:00:00.000Z', checkpointAnswers: { [`${id}-check`]: { answer: seed.answer, correct: true, attempts: 1, answeredAt: '2026-09-24T18:00:00.000Z' } } }
      : { completed: false, currentStep: 0, checkpointAnswers: {} },
  }
}

const lessonSeeds: LessonSeed[] = [
  { title: 'Why Cells Need ATP', objective: 'Understand why cells convert stored chemical energy into ATP.', concept: 'ATP', eyebrow: 'THE CELL’S ENERGY PROBLEM', sectionTitle: 'Stored energy is not yet usable energy', body: 'Glucose contains abundant chemical energy, but most cellular processes cannot draw on it directly. Cells transfer that energy into ATP—a compact, immediately usable energy currency.', key: 'Cellular respiration does not create energy. It transfers energy from glucose into ATP that can power cellular work.', question: 'Why do cells convert energy from glucose into ATP?', options: ['ATP is a directly usable energy currency', 'ATP stores genetic information', 'ATP produces oxygen', 'ATP forms the cell membrane'], answer: 'ATP is a directly usable energy currency', explanation: 'Cells can couple the breakdown of ATP to transport, movement, and synthesis. Glucose is energy-rich, but ATP is the immediately usable form.', minutes: 4 },
  { title: 'Glycolysis', objective: 'Explain how glucose begins being converted into usable cellular energy.', concept: 'Glycolysis', eyebrow: 'WHY GLYCOLYSIS MATTERS', sectionTitle: 'The first split', body: 'Glycolysis begins in the cytoplasm, where one six-carbon glucose molecule is rearranged and split into two three-carbon molecules of pyruvate.', key: 'One glucose becomes two pyruvate, with a net gain of two ATP and two NADH.', question: 'What is the primary purpose of glycolysis?', options: ['Produce oxygen', 'Begin extracting energy from glucose', 'Create DNA', 'Break down proteins'], answer: 'Begin extracting energy from glucose', explanation: 'Glycolysis starts glucose breakdown and captures some released energy in ATP and NADH.', minutes: 6 },
  { title: 'Pyruvate Oxidation', objective: 'Describe how pyruvate is prepared to enter the citric acid cycle.', concept: 'Pyruvate oxidation', eyebrow: 'THE BRIDGE STEP', sectionTitle: 'From pyruvate to acetyl-CoA', body: 'After glycolysis, pyruvate enters the mitochondrial matrix. A carbon leaves as carbon dioxide, NAD+ captures electrons, and the remaining two-carbon unit attaches to coenzyme A.', key: 'Each pyruvate becomes acetyl-CoA, producing one NADH and releasing one carbon dioxide.', question: 'What molecule enters the citric acid cycle?', options: ['Glucose', 'Acetyl-CoA', 'Oxygen', 'Lactate'], answer: 'Acetyl-CoA', explanation: 'Pyruvate is converted to acetyl-CoA before its two-carbon unit can enter the cycle.', minutes: 5 },
  { title: 'The Krebs Cycle', objective: 'Trace how the cycle captures energy from acetyl-CoA.', concept: 'Citric acid cycle', eyebrow: 'CAPTURING HIGH-ENERGY ELECTRONS', sectionTitle: 'A cycle built for carriers', body: 'Acetyl-CoA joins a four-carbon molecule, then proceeds through reactions that regenerate the starting molecule. Its carbons leave as carbon dioxide while electron carriers capture most of the released energy.', key: 'The cycle’s main output is not ATP—it is high-energy NADH and FADH₂ for the electron transport chain.', question: 'What is the cycle’s main energetic contribution?', options: ['Large amounts of ATP directly', 'NADH and FADH₂', 'Glucose', 'Oxygen'], answer: 'NADH and FADH₂', explanation: 'The cycle makes a small amount of ATP, but its major role is loading electron carriers.', minutes: 8 },
  { title: 'Electron Transport Chain', objective: 'Explain how electron energy creates a proton gradient.', concept: 'Electron transport chain', eyebrow: 'ENERGY BECOMES A GRADIENT', sectionTitle: 'Passing electrons downhill', body: 'NADH and FADH₂ donate electrons to protein complexes in the inner mitochondrial membrane. The released energy pumps protons out of the matrix.', key: 'Oxygen accepts electrons at the end of the chain. Without oxygen, electron flow stops.', question: 'What directly powers proton pumping?', options: ['Electron energy', 'DNA replication', 'Carbon dioxide', 'ATP breakdown'], answer: 'Electron energy', explanation: 'As electrons move through the chain, their energy is used to move protons across the membrane.', minutes: 7 },
  { title: 'Chemiosmosis', objective: 'Connect the proton gradient to ATP production.', concept: 'Chemiosmosis', eyebrow: 'A MOLECULAR TURBINE', sectionTitle: 'Letting protons flow home', body: 'The proton gradient stores potential energy. Protons flow back into the matrix through ATP synthase, causing the protein to catalyze ATP formation.', key: 'The gradient powers ATP synthase; ATP synthase does not create the gradient.', question: 'What directly drives ATP synthase?', options: ['Proton flow', 'Carbon dioxide release', 'Glucose splitting', 'Oxygen production'], answer: 'Proton flow', explanation: 'The movement of protons down their electrochemical gradient drives ATP synthase.', minutes: 5 },
  { title: 'Putting It All Together', objective: 'Connect every stage into one coherent account of cellular respiration.', concept: 'Cellular respiration', eyebrow: 'THE FULL ENERGY STORY', sectionTitle: 'One pathway, four connected stages', body: 'Glycolysis begins glucose breakdown. Pyruvate oxidation creates acetyl-CoA. The citric acid cycle loads electron carriers. Electron transport and chemiosmosis use those electrons to produce most ATP.', key: 'Matter moves and changes form; energy is progressively transferred into ATP.', question: 'Which sequence is correct?', options: ['Glycolysis → pyruvate oxidation → citric acid cycle → oxidative phosphorylation', 'Citric acid cycle → glycolysis → fermentation', 'Oxidative phosphorylation → glycolysis → pyruvate oxidation', 'Glycolysis → DNA replication → citric acid cycle'], answer: 'Glycolysis → pyruvate oxidation → citric acid cycle → oxidative phosphorylation', explanation: 'That order follows glucose carbon and captured energy through cellular respiration.', minutes: 7 },
]

export const demoCourse: Course = {
  id: 'demo-course-cellular-respiration',
  title: 'Cellular Respiration',
  description: 'Follow the energy in glucose as cells convert it into usable ATP.',
  sourceIds: [sourceId],
  estimatedMinutes: lessonSeeds.reduce((sum, seed) => sum + seed.minutes, 0),
  lessons: lessonSeeds.map(lesson),
  createdAt: '2026-09-22T16:00:00.000Z',
  updatedAt: '2026-09-24T18:00:00.000Z',
}

export const initialData: AppData = {
  version: 2,
  sources: [demoSource],
  courses: [demoCourse],
  checkpointEvents: [],
  classes: [{ id: 'class-biology', name: 'Biology', createdAt: '2026-09-22T16:00:00.000Z' }],
  notes: [], flashcards: [], quizzes: [], chats: [],
  profile: { educationType: '', classes: ['Biology'], studyGoals: [], learningPreferences: [] },
  onboardingCompleted: true,
}
