// Demo data. Replace with API responses once the backend exposes them.
const day = 86400000
const now = Date.now()
const ago = (d, h = 0) => new Date(now - d * day - h * 3600000).toISOString()
const ahead = (d, h = 0) => new Date(now + d * day + h * 3600000).toISOString()

export const TENANT = { id: 'kiit', name: 'KIIT University', short: 'KIIT', cell: 'Training & Placement Cell' }

export const STUDENT = {
  id: 's1', name: 'Rohan Sharma', email: 'rohan.sharma@kiit.ac.in', role: 'student',
  roll: '2205xxxx', branch: 'CSE', year: 2027, cgpa: 8.4, backlogs: 0,
  examsCleared: 3, currentOfferLpa: null, stream: 'IT',
}
export const ADMIN = { id: 'a1', name: 'Kavita Singh', email: 'tnp@kiit.ac.in', role: 'admin', title: 'TnP Coordinator' }
export const SUPER = { id: 'sa1', name: 'Platform Admin', email: 'root@placemate.ai', role: 'super', title: 'Super admin' }

export const DRIVES = [
  { id: 'd1', company: 'Google', role: 'Software Engineer', ctc: 32, category: 3, type: 'IT', date: ahead(2), deadline: ahead(0, 9),
    criteria: { minCgpa: 8.0, branches: ['CSE', 'IT'], maxBacklogs: 0, gradYear: 2027 }, notice: 'Google_Drive_Notice.pdf' },
  { id: 'd2', company: 'Microsoft', role: 'SDE Intern + PPO', ctc: 18, category: 3, type: 'IT', date: ahead(5), deadline: ahead(3),
    criteria: { minCgpa: 7.5, branches: ['CSE', 'IT', 'ECE'], maxBacklogs: 0, gradYear: 2027 }, notice: 'Microsoft_SDE_Intern_v2.pdf' },
  { id: 'd3', company: 'TCS', role: 'Digital Associate', ctc: 7, category: 1, type: 'IT', date: ahead(8), deadline: ahead(6),
    criteria: { minCgpa: 6.0, branches: ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'], maxBacklogs: 2, gradYear: 2027 }, notice: 'TCS_Digital_2027.pdf' },
  { id: 'd4', company: 'Infosys', role: 'Systems Engineer', ctc: 6.5, category: 1, type: 'IT', date: ahead(10), deadline: ahead(7),
    criteria: { minCgpa: 6.0, branches: ['CSE', 'IT', 'ECE', 'EEE'], maxBacklogs: 1, gradYear: 2027 }, notice: 'Infosys_SE_2027.pdf' },
  { id: 'd5', company: 'Adobe', role: 'Member of Technical Staff', ctc: 24, category: 3, type: 'IT', date: ahead(14), deadline: ahead(11),
    criteria: { minCgpa: 8.5, branches: ['CSE', 'IT'], maxBacklogs: 0, gradYear: 2027 }, notice: 'Adobe_MTS.pdf' },
  { id: 'd6', company: 'L&T', role: 'Graduate Engineer Trainee', ctc: 6, category: 1, type: 'Core', date: ahead(12), deadline: ahead(9),
    criteria: { minCgpa: 6.5, branches: ['CIVIL', 'MECH', 'EEE'], maxBacklogs: 0, gradYear: 2027 }, notice: 'LT_GET_2027.pdf' },
]

export const UPDATES = [
  { id: 'u1', text: 'Placement regulations for the 2027 batch updated', when: ago(2), tone: 'blue' },
  { id: 'u2', text: 'New drives added: Adobe, Qualcomm', when: ago(3), tone: 'green' },
  { id: 'u3', text: 'Microsoft deadline extended by 48 hours (supersedes earlier notice)', when: ago(4), tone: 'amber' },
  { id: 'u4', text: 'Exit test 3 schedule published by Kareer School', when: ago(7), tone: 'violet' },
]

export const DOCS = [
  { id: 'k1', name: 'T&P Regulations_2027 Batch.pdf', type: 'Policy', company: '—', pages: 6, chunks: 58, status: 'indexed', date: ago(40), by: 'Kavita Singh', version: 'v2', supersedes: null },
  { id: 'k2', name: 'Google_Drive_Notice.pdf', type: 'Company notice', company: 'Google', pages: 2, chunks: 11, status: 'indexed', date: ago(4), by: 'Kavita Singh', version: 'v1', supersedes: null },
  { id: 'k3', name: 'Microsoft_SDE_Intern_v2.pdf', type: 'Company notice', company: 'Microsoft', pages: 2, chunks: 9, status: 'indexed', date: ago(1), by: 'Kavita Singh', version: 'v2', supersedes: 'Microsoft_SDE_Intern.pdf' },
  { id: 'k4', name: 'TCS_Digital_2027.pdf', type: 'Company notice', company: 'TCS', pages: 3, chunks: 14, status: 'indexed', date: ago(6), by: 'Kavita Singh', version: 'v1', supersedes: null },
  { id: 'k5', name: 'Placement FAQ.docx', type: 'FAQ', company: '—', pages: 5, chunks: 33, status: 'indexed', date: ago(20), by: 'Kavita Singh', version: 'v1', supersedes: null },
  { id: 'k6', name: 'Adobe_MTS.pdf', type: 'Company notice', company: 'Adobe', pages: 2, chunks: 0, status: 'processing', date: ago(0, 1), by: 'Kavita Singh', version: 'v1', supersedes: null },
]

export const CHAT_HISTORY_SEED = [
  { id: 'c1', title: 'Category 2 eligibility after a 6 LPA offer', when: ago(1) },
  { id: 'c2', title: 'Can I reject an offer after selection?', when: ago(3) },
  { id: 'c3', title: 'Off-campus offer: who do I inform?', when: ago(6) },
]

export const SUGGESTIONS = [
  'Can students accept a PPO after sitting for campus placements?',
  'If I get a 6 LPA offer, what do I need for Category 2?',
  'What happens if I register for a drive and skip it?',
  'What should I do if I receive an off-campus offer?',
]

export const SEVERITY = ['Critical', 'High', 'Normal', 'Low']
export const COMPLEXITY = ['Clarification', 'Policy interpretation', 'Needs authority approval']
export const CATEGORY = ['Eligibility', 'Process', 'Documents', 'Grievance', 'Other']
export const SLA_HOURS = { Critical: 4, High: 24, Normal: 48, Low: 96 }

export const TICKETS_SEED = [
  { id: 'T-1042', student: 'Ananya Das', branch: 'ECE', question: 'My Microsoft online test clashes with a mid-sem lab exam tomorrow. Can the T&P cell get a different slot for me?',
    severity: 'Critical', complexity: 'Needs authority approval', category: 'Process', status: 'open', assignee: 'Kavita Singh',
    reason: 'Needs an exception from the company and the university', created: ago(0, 2), due: ahead(0, 4), merged: 2, reusable: null, answer: null, confidence: 0.21 },
  { id: 'T-1041', student: 'Rohan Sharma', branch: 'CSE', question: 'I hold a 6 LPA offer and a 10 LPA company starts joining in August. Can I switch through the T&P office?',
    severity: 'High', complexity: 'Policy interpretation', category: 'Eligibility', status: 'open', assignee: 'Kavita Singh',
    reason: 'Verifier found the draft answer unsupported by the regulations', created: ago(0, 6), due: ahead(0, 20), merged: 1, reusable: null, answer: null, confidence: 0.38 },
  { id: 'T-1040', student: 'Imran Qureshi', branch: 'MECH', question: 'Does the L&T notice apply to dual-degree students?',
    severity: 'Normal', complexity: 'Policy interpretation', category: 'Eligibility', status: 'in_progress', assignee: 'Rahul Mishra',
    reason: 'No retrieved passage mentions dual-degree students', created: ago(1), due: ahead(1), merged: 4, reusable: null, answer: null, confidence: 0.29 },
  { id: 'T-1039', student: 'Sneha Patra', branch: 'IT', question: 'Is there a minimum CGPA for sitting in placements at all?',
    severity: 'Low', complexity: 'Clarification', category: 'Eligibility', status: 'resolved', assignee: 'Rahul Mishra',
    reason: 'Regulations are silent on a global CGPA cutoff', created: ago(3), due: ago(1), merged: 7, reusable: true, reviewed: false,
    answer: 'The 2027 regulations do not set a global CGPA cutoff. Each company notice sets its own criteria, so check the notice for the drive you want.', confidence: 0.12 },
  { id: 'T-1038', student: 'Arjun Nayak', branch: 'CSE', question: 'Can I get my medical fitness certificate verified at the campus hospital?',
    severity: 'Normal', complexity: 'Clarification', category: 'Documents', status: 'resolved', assignee: 'Kavita Singh',
    reason: 'Question not covered by indexed documents', created: ago(5), due: ago(3), merged: 1, reusable: false, reviewed: true,
    answer: 'Yes. Visit the campus hospital with your offer letter between 10 AM and 4 PM on working days.', confidence: 0.17 },
]

export const TENANTS = [
  { id: 'kiit', name: 'KIIT University', students: 450, docs: 6, tickets: 5, status: 'live', plan: 'Pilot', leaks: 0, created: ago(60) },
  { id: 'tenant-2', name: 'Demo Institute of Technology', students: 120, docs: 2, tickets: 0, status: 'onboarding', plan: 'Trial', leaks: 0, created: ago(4) },
]

export const ANALYTICS = {
  escalation: [
    { week: 'W1', rate: 41 }, { week: 'W2', rate: 36 }, { week: 'W3', rate: 33 }, { week: 'W4', rate: 27 },
    { week: 'W5', rate: 24 }, { week: 'W6', rate: 19 }, { week: 'W7', rate: 16 },
  ],
  volume: [
    { day: 'Mon', answered: 96, escalated: 18 }, { day: 'Tue', answered: 120, escalated: 22 }, { day: 'Wed', answered: 143, escalated: 19 },
    { day: 'Thu', answered: 111, escalated: 14 }, { day: 'Fri', answered: 158, escalated: 21 }, { day: 'Sat', answered: 74, escalated: 8 }, { day: 'Sun', answered: 51, escalated: 5 },
  ],
  severity: [
    { name: 'Critical', value: 6, color: '#e5484d' }, { name: 'High', value: 14, color: '#f59e0b' },
    { name: 'Normal', value: 31, color: '#2d5bff' }, { name: 'Low', value: 18, color: '#94a3b8' },
  ],
  topics: [
    { topic: 'Category rules', count: 84 }, { topic: 'Offer acceptance', count: 61 }, { topic: 'Eligibility', count: 57 },
    { topic: 'Off-campus', count: 33 }, { topic: 'Documents', count: 29 }, { topic: 'Exit tests', count: 22 },
  ],
}

// Answers taken from evaluation/results_v2_*.json so the demo mirrors the real RAG output.
const P = (n) => ({ doc: 'T&P Regulations_2027 Batch.pdf', page: n })
export const KB_ANSWERS = [
  { keys: ['attendance', 'theory'], text: 'A minimum of **75%** attendance is required for theory classes (or as per AICTE norms for medical reasons).', sources: [P(2)], confidence: 0.93 },
  { keys: ['practical', 'seminar'], text: '**100%** attendance is mandatory for practicals and seminars (or as per AICTE norms for medical reasons).', sources: [P(2)], confidence: 0.92 },
  { keys: ['exit test'], text: 'You must appear for all **3 exit tests** conducted by Kareer School. Missing them makes you ineligible for the campus recruitment process.', sources: [P(2)], confidence: 0.95 },
  { keys: ['categories'], text: 'Placement categories depend on the CTC per annum:\n- **Category 1:** 3 LPA to 7 LPA\n- **Category 2:** above 7 LPA up to 14 LPA\n- **Category 3:** above 14 LPA', sources: [P(3)], confidence: 0.9 },
  { keys: ['6 lpa', 'category 2'], text: 'With a 6 LPA Category 1 offer, a new offer must be more than **1.5 times** your current CTC (more than 9 LPA) **and** at least **7.01 LPA**. Whichever is higher applies, so you need above **9 LPA**.', sources: [P(3)], confidence: 0.88 },
  { keys: ['how many offers'], text: 'A student can avail a maximum of **three offers** through campus recruitment. Core engineering streams have separate limits.', sources: [P(3)], confidence: 0.91 },
  { keys: ['category 3', 'continue'], text: 'No. A student offered in Category 3 is **not eligible** for further campus recruitment.', sources: [P(4)], confidence: 0.94 },
  { keys: ['reject', 'offer'], text: 'No. Once an offer is made, students **cannot reject** it. It is also mandatory to accept any PPO or internship offer you are selected for.', sources: [P(4), P(5)], confidence: 0.9 },
  { keys: ['ppo'], text: 'It is mandatory to accept the offer if you are selected in any category offering a PPO or internship. If you do not, you are considered placed and **no further opportunities** are given.', sources: [P(3), P(5)], confidence: 0.86 },
  { keys: ['register', 'skip'], text: 'Any absence after registering for a drive leads to **disqualification** from the campus recruitment program. The university follows a zero-tolerance policy.', sources: [P(4), P(5)], confidence: 0.92 },
  { keys: ['off-campus'], text: 'Email **placement@kiit.ac.in** or **dean.ie@kiit.ac.in** with your offer letter attached. You can join an off-campus company after a campus selection if you follow the conditions on page 5.', sources: [P(5)], confidence: 0.84 },
  { keys: ['plagiarism'], text: 'Plagiarism, unfair means or misconduct reported by a company is taken seriously. Such students are **debarred** from the campus recruitment process.', sources: [P(2), P(3)], confidence: 0.9 },
  { keys: ['contact', 'company officials'], text: 'No. You may not contact visiting companies or their officials unless you have permission from university authorities.', sources: [P(4)], confidence: 0.93 },
  { keys: ['sign-off'], text: 'A sign-off form is a form every selected student must sign in the prescribed format after being selected by a company in the categories under section 2.5.', sources: [P(5)], confidence: 0.82 },
]
