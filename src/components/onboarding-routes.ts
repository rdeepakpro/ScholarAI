export function onboardingBranch(type: string) {
  if (type === 'Middle School') return { detail: 'What grade are you in?', options: ['6th', '7th', '8th', 'Other'], classes: 'What subjects are you taking?', suggestions: ['Math', 'Science', 'English', 'History / Social Studies', 'World Language', 'Computer Science'] }
  if (type === 'High School') return { detail: 'What grade are you in?', options: ['9th / Freshman', '10th / Sophomore', '11th / Junior', '12th / Senior'], classes: 'What classes are you taking?', suggestions: ['English', 'Algebra', 'Geometry', 'Precalculus', 'Calculus', 'Biology', 'Chemistry', 'Physics', 'World History', 'US History', 'Computer Science'] }
  if (type === 'College / University') return { detail: 'What are you studying?', options: ['Computer Science', 'Biology', 'Business', 'Engineering', 'Psychology', 'Economics', 'Undeclared'], classes: 'What courses are you taking right now?', suggestions: [] }
  if (type === 'Graduate School') return { detail: 'What field are you studying?', options: [], classes: 'What courses or topics are you working on?', suggestions: [] }
  if (type === 'Self-Studying') return { detail: 'What are you studying for?', options: ['Learn a new subject', 'Standardized test', 'Certification', 'Personal interest', 'Skill development', 'Language learning'], classes: 'What are you learning?', suggestions: [] }
  if (type === 'Professional / Career') return { detail: 'What are you learning for?', options: ['Work training', 'Professional certification', 'New career skill', 'Interview preparation', 'Continuing education'], classes: 'What topic or skill?', suggestions: [] }
  return { detail: 'What are you currently learning?', options: [], classes: 'Add a topic', suggestions: [] }
}
