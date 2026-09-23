import type {
  User, Course, Skill, Exam, ExamSkill, Student, SkillAssessment,
  ProjectAssessment, AssessmentStatus,
} from "./types";

// ---------------- Users ----------------
export const currentAdmin: User = {
  id: "u-admin-1",
  fullName: "Mr. Dauda Jr.",
  role: "admin",
  email: "dauda@kmfenterprise.ng",
  isActive: true,
};

export const csas: User[] = [
  { id: "u-csa-1", fullName: "Nurse F. Yakubu", role: "csa", email: "f.yakubu@example.com", isActive: true },
  { id: "u-csa-2", fullName: "Mr. T. Abanyam", role: "csa", email: "t.abanyam@example.com", isActive: true },
  { id: "u-csa-3", fullName: "Mrs. R. Danladi", role: "csa", email: "r.danladi@example.com", isActive: true },
  { id: "u-csa-4", fullName: "Mr. S. Ibrahim", role: "csa", email: "s.ibrahim@example.com", isActive: true },
];

// ---------------- Courses ----------------
export const courses: Course[] = [
  { id: "c-116", code: "CHE116", title: "Community Health Extension I" },
  { id: "c-214", code: "CHE214", title: "Community Health Extension II" },
  { id: "c-300", code: "NGC300", title: "Pre-National Practical & Project Assessment" },
];

// ---------------- Skills (12 known rubrics + 3 pending from client) ----------------
function makeSkill(id: string, name: string, minutes: number, steps: [string, number][]): Skill {
  const nativeTotal = steps.reduce((s, [, m]) => s + m, 0);
  return {
    id,
    name,
    nativeTotal,
    timeAllowedMinutes: minutes,
    isActive: true,
    steps: steps.map(([description, maxMarks], i) => ({
      id: `${id}-step-${i + 1}`,
      skillId: id,
      stepOrder: i + 1,
      description,
      maxMarks,
    })),
  };
}

export const skills: Skill[] = [
  makeSkill("sk-standing-orders", "Management of Common Complaints Using Standing Orders", 10, [
    ["Pending — awaiting official rubric from client", 30],
  ]),
  makeSkill("sk-bp", "Blood Pressure Estimation", 10, [
    ["Pending — awaiting official rubric from client", 30],
  ]),
  makeSkill("sk-tpr", "Taking of Temperature, Pulse and Respiration", 10, [
    ["Pending — awaiting official rubric from client", 30],
  ]),
  makeSkill("sk-visual-acuity", "Visual Acuity Test", 10, [
    ["Approach (greetings, explanation of purpose)", 5],
    ["Measurement of the distance (6 metres away)", 6],
    ["Proper positioning of the chair and the patient", 5],
    ["Procedure (closing eyes intermittently, pointing, communicating)", 8],
    ["Proper recording", 6],
    ["Interpretation and advice", 8],
    ["Cleaning of the materials used", 2],
  ]),
  makeSkill("sk-muac", "Mid-Upper Arm Circumference (MUAC) Measurement", 10, [
    ["Explanation of purpose and procedure", 4],
    ["Pick up Shakir's strip", 4],
    ["Confirm Shakir's strip has the mark", 2],
    ["Retrieve cloth from left or right upper arm", 4],
    ["Apply strip midway between elbow and shoulder joint", 8],
    ["Read and interpret result reading", 6],
    ["Interpret the reading to the mother", 4],
    ["Document the findings appropriately", 4],
    ["Give appropriate info on next steps / when to call back", 4],
  ]),
  makeSkill("sk-weighing", "Weighing and Charting of Infants and Toddlers", 10, [
    ["Explanation of purpose, establish rapport", 5],
    ["Select appropriate scale for patient/client", 5],
    ["Balancing scale at zero before weighing", 2],
    ["Inviting mother and child for weighing", 5],
    ["Correct placement of baby on the scale", 5],
    ["Reading, recording of baby's weight", 6],
    ["Charting the weight on the growth chart", 6],
    ["Appropriate interpretation", 4],
    ["Recording on tally sheet", 2],
  ]),
  makeSkill("sk-ors", "Preparation and Administration of O.R.S.", 10, [
    ["Preparation (card check, explanation, hand washing)", 6],
    ["Checking and assembling O.R.S. equipment", 8],
    ["Preparation of O.R.S. (salt, sugar, water, mixing)", 12],
    ["Appropriate instruction and administration", 8],
    ["Follow-up instruction (storage, discard timing)", 6],
  ]),
  makeSkill("sk-tepid-sponging", "Performance of Tepid Sponging", 10, [
    ["Assemble equipment", 6],
    ["Explanation of purpose and procedure", 4],
    ["Spread mackintosh on the bed", 3],
    ["Spread towel over the mackintosh", 3],
    ["Position patient comfortably", 3],
    ["Soak cloth/sponge in lukewarm water", 3],
    ["Apply wet towel/sponge head to toe", 4],
    ["Continue until temperature goes down", 3],
    ["Allow evaporation, do not mop dry", 3],
    ["Reassure the mother", 3],
    ["Clean and replace equipment", 3],
    ["Observe and treat fever per standing orders", 2],
  ]),
  makeSkill("sk-oral-health", "Oral Health", 10, [
    ["Assembling all required items", 4],
    ["Explain purpose and procedure", 3],
    ["Press toothpaste on brush / give chewing stick", 3],
    ["Wet toothbrush and paste, or begin chewing", 3],
    ["Demonstrate cleaning technique, allow questions", 8],
    ["Brush front, back, and top of all teeth", 6],
    ["Give water/salt water to rinse", 3],
    ["Ask patient to spit out", 3],
    ["Wash brush / dispose chewing stick", 3],
    ["Give follow-up instruction, return materials", 4],
  ]),
  makeSkill("sk-stethoscope", "Use of Stethoscope for Chest Examination", 10, [
    ["Approach: explain purpose, establish rapport", 4],
    ["Hand washing and proper drying", 2],
    ["Exposing chest and back appropriately", 2],
    ["Check stethoscope for proper functioning", 4],
    ["Place ear pieces correctly", 4],
    ["Choose correct side (bell/diaphragm)", 4],
    ["Listen in logical sequence (resp rate, breath, heart)", 8],
    ["Interpret sound and explain findings", 6],
    ["Record findings, give follow-up", 6],
  ]),
  makeSkill("sk-ieC-fp", "IEC — Counselling of First-Visit Family Planning Client", 10, [
    ["Establishing rapport: greeting and introduction", 2],
    ["Explanation of intention", 2],
    ["Choice of appropriate teaching method", 6],
    ["Health talk: language and pace", 6],
    ["Clarity of speech and brevity", 6],
    ["Appropriate choice and use of IEC materials", 6],
    ["Checking understanding by asking questions", 6],
    ["Opportunity for return demonstration / feedback", 6],
  ]),
  makeSkill("sk-vaccine", "Administration of Vaccines by Injection", 10, [
    ["Create rapport, explain purpose and procedure", 4],
    ["Hand washing and proper drying", 2],
    ["Setting of tray with appropriate requirements", 6],
    ["Checking label and expiry date of vaccine", 4],
    ["Drawing correct dosage (correct vaccine)", 6],
    ["Preparation of client, site, administration", 8],
    ["Appropriate instructions and follow-up", 6],
    ["Return equipment, proper disposal", 4],
  ]),
  makeSkill("sk-albustix", "Urine Test for Albumin Using Albustix / Clinistix", 10, [
    ["Required materials ready (strip, reference chart)", 2],
    ["Approach: greet and introduce self", 2],
    ["Explain the procedure", 2],
    ["Obtain freshly voided urine specimen", 4],
    ["Dip test strip and remove immediately", 6],
    ["Match result with colour chart, record", 6],
    ["Interpretation of result to the patient", 6],
    ["Washing hands with soap and water", 2],
    ["Correct recording", 6],
    ["Follow-up instruction to patient", 4],
  ]),
  makeSkill("sk-auriscope", "Use of Auriscope for Ear Examination", 10, [
    ["Hand washing and proper drying", 2],
    ["Explanation of purpose and procedure", 2],
    ["Checking auriscope: light bright, speculum clean", 4],
    ["Choosing right size of speculum", 2],
    ["Instruct client to keep head steady", 2],
    ["Inspection of ear lobes and surrounding area", 6],
    ["Inspection for crust, blood, discharge, foreign body", 6],
    ["Correctly pulling ear lobe to locate eardrum", 6],
    ["Correct description of normal eardrum", 6],
    ["Recording of findings", 4],
  ]),
  makeSkill("sk-anc-nutrition", "IEC — Adequate Nutrition for Pregnant Women (ANC)", 10, [
    ["Establishing rapport: greeting and introduction", 2],
    ["Explanation of intention", 2],
    ["Choice of appropriate teaching method", 6],
    ["Health talk: language and pace", 6],
    ["Clarity of speech and brevity", 6],
    ["Appropriate choice and use of IEC materials", 6],
    ["Checking understanding by asking questions", 6],
    ["Opportunity for return demonstration / feedback", 6],
  ]),
];

// ---------------- Exams ----------------
export const exams: Exam[] = [
  {
    id: "ex-che116",
    courseId: "c-116",
    academicSession: "2026/2027",
    title: "CHE116 Practical Examination 2027",
    examType: "practical_only",
    practicalTargetTotal: 60,
    projectMaxTotal: 0,
    status: "open",
  },
  {
    id: "ex-che214",
    courseId: "c-214",
    academicSession: "2026/2027",
    title: "CHE214 Practical Examination 2027",
    examType: "practical_only",
    practicalTargetTotal: 30,
    projectMaxTotal: 0,
    status: "open",
  },
  {
    id: "ex-ngc300",
    courseId: "c-300",
    academicSession: "2026/2027",
    title: "NGC300 Pre-National Practical Examination 2027",
    examType: "practical_and_project",
    practicalTargetTotal: 100,
    projectMaxTotal: 20,
    status: "open",
  },
];

export const examSkills: ExamSkill[] = [
  { id: "es-1", examId: "ex-ngc300", skillId: "sk-standing-orders", assignedMarks: 40, isCompulsory: true, displayOrder: 1, assignedCsaIds: ["u-csa-1"] },
  { id: "es-2", examId: "ex-ngc300", skillId: "sk-visual-acuity", assignedMarks: 20, isCompulsory: false, displayOrder: 2, assignedCsaIds: ["u-csa-1"] },
  { id: "es-3", examId: "ex-ngc300", skillId: "sk-muac", assignedMarks: 20, isCompulsory: false, displayOrder: 3, assignedCsaIds: ["u-csa-2"] },
  { id: "es-4", examId: "ex-ngc300", skillId: "sk-vaccine", assignedMarks: 20, isCompulsory: false, displayOrder: 4, assignedCsaIds: ["u-csa-2"] },
  { id: "es-5", examId: "ex-che214", skillId: "sk-standing-orders", assignedMarks: 30, isCompulsory: true, displayOrder: 1, assignedCsaIds: ["u-csa-3"] },
  { id: "es-6", examId: "ex-che116", skillId: "sk-bp", assignedMarks: 30, isCompulsory: false, displayOrder: 1, assignedCsaIds: ["u-csa-3"] },
  { id: "es-7", examId: "ex-che116", skillId: "sk-tpr", assignedMarks: 30, isCompulsory: false, displayOrder: 2, assignedCsaIds: ["u-csa-4"] },
];

// ---------------- Students ----------------
export const students: Student[] = [
  { id: "st-1", registrationNumber: "DCH/25/035", fullName: "Aminu Aisha Iya", level: "DCH 200 LEVEL" },
  { id: "st-2", registrationNumber: "DCH/25/036", fullName: "Bello Musa Sani", level: "DCH 200 LEVEL" },
  { id: "st-3", registrationNumber: "DCH/25/037", fullName: "Christiana Okoro", level: "DCH 200 LEVEL" },
  { id: "st-4", registrationNumber: "DCH/25/038", fullName: "Dauda Fatima Bello", level: "DCH 200 LEVEL" },
  { id: "st-5", registrationNumber: "DCH/25/039", fullName: "Emmanuel Terlumun", level: "DCH 200 LEVEL" },
  { id: "st-6", registrationNumber: "DCH/25/040", fullName: "Falmata Grema", level: "DCH 200 LEVEL" },
];

// ---------------- Skill assessments (mock scoring state) ----------------
export const skillAssessments: SkillAssessment[] = [
  { id: "sa-1", examSkillId: "es-1", studentId: "st-1", csaId: "u-csa-1", rawScore: 34, scaledScore: 34, status: "submitted", submittedAt: "2026-09-20T09:14:00Z" },
  { id: "sa-2", examSkillId: "es-2", studentId: "st-1", csaId: "u-csa-1", rawScore: 32, scaledScore: 16, status: "submitted", submittedAt: "2026-09-20T09:22:00Z" },
  { id: "sa-3", examSkillId: "es-3", studentId: "st-1", csaId: "u-csa-2", rawScore: 33, scaledScore: 18.3, status: "submitted", submittedAt: "2026-09-20T09:30:00Z" },
  { id: "sa-4", examSkillId: "es-4", studentId: "st-1", csaId: "u-csa-2", rawScore: null, scaledScore: null, status: "draft" },
  { id: "sa-5", examSkillId: "es-1", studentId: "st-2", csaId: "u-csa-1", rawScore: 30, scaledScore: 30, status: "submitted", submittedAt: "2026-09-20T10:02:00Z" },
  { id: "sa-6", examSkillId: "es-2", studentId: "st-2", csaId: "u-csa-1", rawScore: null, scaledScore: null, status: "pending" },
];

export const projectAssessments: ProjectAssessment[] = [
  { id: "pa-1", examId: "ex-ngc300", studentId: "st-1", csaId: "u-csa-1", score: 8, maxMarks: 10, status: "submitted", submittedAt: "2026-09-20T09:40:00Z" },
  { id: "pa-2", examId: "ex-ngc300", studentId: "st-1", csaId: "u-csa-2", score: 7, maxMarks: 10, status: "submitted", submittedAt: "2026-09-20T09:45:00Z" },
];

// ---------------- Status → pill styling helper ----------------
export const statusStyles: Record<AssessmentStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: "var(--neutral-soft)", fg: "var(--ink-muted)", label: "Pending" },
  draft: { bg: "var(--warn-soft)", fg: "var(--warn)", label: "Draft" },
  submitted: { bg: "var(--success-soft)", fg: "var(--success)", label: "Submitted" },
  amended: { bg: "var(--accent-soft)", fg: "var(--accent-ink)", label: "Amended" },
};
