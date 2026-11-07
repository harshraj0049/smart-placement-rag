// Deterministic eligibility check. Mirrors the "eligibility tool" in the proposal:
// structured criteria are compared with the student's profile, no LLM guesswork.
export function checkEligibility(student, drive) {
  const c = drive.criteria
  const checks = [
    { label: 'CGPA', need: `≥ ${c.minCgpa}`, have: String(student.cgpa), ok: student.cgpa >= c.minCgpa },
    { label: 'Branch', need: c.branches.join(', '), have: student.branch, ok: c.branches.includes(student.branch) },
    { label: 'Active backlogs', need: `≤ ${c.maxBacklogs}`, have: String(student.backlogs), ok: student.backlogs <= c.maxBacklogs },
    { label: 'Graduation year', need: String(c.gradYear), have: String(student.year), ok: student.year === c.gradYear },
    { label: 'Exit tests', need: 'All 3 cleared', have: `${student.examsCleared} of 3`, ok: student.examsCleared >= 3 },
  ]
  if (student.currentOfferLpa) {
    const min = Math.max(student.currentOfferLpa * 1.5, drive.category === 2 ? 7.01 : drive.category === 3 ? 14.01 : 0)
    checks.push({ label: 'Offer upgrade rule', need: `CTC > ${min.toFixed(2)} LPA`, have: `${drive.ctc} LPA`, ok: drive.ctc > min })
  }
  return { eligible: checks.every((x) => x.ok), checks }
}

export const categoryOf = (lpa) => (lpa > 14 ? 3 : lpa > 7 ? 2 : 1)
