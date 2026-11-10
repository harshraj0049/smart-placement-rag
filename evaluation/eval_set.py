"""Phase 3: typed evaluation set.

Each case:
  id, question
  type          gold route: rules | company | company_rules | multi_company | cross_company | out_of_scope
  companies     gold companies, as STORED (lowercase) values
  must_contain  short snippets that must appear in the retrieved chunks for the answer to be
                possible (case/whitespace-insensitive). Empty = not scored for evidence recall.
  expect_refusal  True when the right answer is "no information" / "no notice for X".

Rules questions R01-R34 are the original TEST_QUERIES. Company questions C01-C31 are
COMPANY_TEST_QUERIES from evaluate.py, typed. X* and M* are new: company+rules and
multi-company questions, the types the router exists for.
"""

RULES_QUESTIONS = [
    ("What is the minimum attendance required for theory classes?", ["minimum of 75%"]),
    ("What is the attendance requirement for practicals and seminars?", ["100%"]),
    ("How many exit tests are mandatory before placement participation?", ["03 (three) exit tests"]),
    ("Can students with pending university dues participate in placements?", ["defaulters of college dues"]),
    ("What happens if plagiarism is detected during a placement process?", ["plagiarism"]),
    ("What are the three placement categories?", ["category – 1: ctc ranging from 3 lpa to 7 lpa"]),
    ("How many offers can a student receive through campus placements?", ["maximum three (03) offers"]),
    ("Can a student with a Category 3 offer continue participating in placements?", ["offered in category – 3 shall not be eligible"]),
    ("If I get a 6 LPA offer, what minimum package do I need to become eligible for Category 2?", ["1.5 times"]),
    ("If I get a 10 LPA offer, can I sit for a 14 LPA company?", ["14.01 lpa"]),
    ("If I get a 10 LPA offer, what minimum package do I need to become eligible for Category 3?", ["14.01 lpa"]),
    ("Can a core branch student receive multiple core offers?", ["maximum two offers from the core companies"]),
    ("If a core student gets an IT offer first, can they still sit for core companies?", ["first offer in it company"]),
    ("If a core student gets a core offer first, can they participate in IT companies later?", ["shall not be allowed to participate in it/ites"]),
    ("How many IT offers can a core engineering student receive?", ["maximum one it/ites offer"]),
    ("What happens if I register for a drive and do not attend it?", ["zero tolerance"]),
    ("Can I reject an offer after being selected?", ["cannot reject the offers"]),
    ("What happens if I skip an interview round after clearing the online test?", ["must attend the further rounds"]),
    ("Can students directly contact company officials during the recruitment process?", ["not allowed to communicate directly"]),
    ("What happens if a student misbehaves with company representatives?", []),
    ("If two companies have overlapping recruitment processes and I am waitlisted in one, can I attend the other?", ["waitlisted"]),
    ("Which offer do I have to accept if I receive multiple offers during overlapping processes?", ["offered first"]),
    ("Is it mandatory to accept an internship or PPO offer?", []),
    ("Can I leave a PPO internship midway?", []),
    ("What happens if I leave an internship due to medical reasons?", []),
    ("Do I need to submit any documents after accepting an offer?", []),
    ("What is a placement sign-off form?", []),
    ("What should I do if I receive an off-campus offer?", []),
    ("Can I join an off-campus company after already being selected through campus placement?", []),
]
RULES_REFUSALS = [
    "What is the minimum CGPA required for placement?",
    "What is the highest package offered at KIIT?",
    "How many companies visit KIIT every year?",
    "Can I sit for placements with a 6.5 CGPA?",
    "What is the average salary package for KIIT students?",
]

C = "company"
CASES = []
for i, (q, snips) in enumerate(RULES_QUESTIONS, 1):
    CASES.append({"id": f"R{i:02d}", "question": q, "type": "rules", "companies": [], "must_contain": snips})
for j, q in enumerate(RULES_REFUSALS, len(RULES_QUESTIONS) + 1):
    CASES.append({"id": f"R{j:02d}", "question": q, "type": "rules", "companies": [], "must_contain": [],
                  "expect_refusal": True})

CASES += [
    # ---- eligibility
    {"id": "C01", "question": "What is the exact CGPA requirement for the AntBox recruitment drive?",
     "type": C, "companies": ["antbox"], "must_contain": ["6.00 or above cgpa"]},
    {"id": "C02", "question": "Which companies require an 80% or above throughout the entire academic career?",
     "type": "cross_company", "companies": ["pixelcompute"], "must_contain": ["80% throughout the academic career"]},
    {"id": "C03", "question": "If a student has an 8.0 CGPA, are they eligible to apply for Osfin.ai?",
     "type": C, "companies": ["osfin.ai"], "must_contain": ["8.50 or above cgpa"]},
    {"id": "C04", "question": "Does Infosys have a specific percentage cutoff for 10th and 12th grades?",
     "type": C, "companies": ["infosys"], "must_contain": ["aggregate 60%"]},
    {"id": "C05", "question": "Can a student with active backlogs apply for the BiteSpeed or Juspay drives?",
     "type": "multi_company", "companies": ["bitespeed", "juspay"], "must_contain": ["no backlogs"]},
    # ---- compensation
    {"id": "C06", "question": "What is the highest CTC offered by Juspay Technologies for the SDE role?",
     "type": C, "companies": ["juspay"], "must_contain": ["27.00 lakhs"]},
    {"id": "C07", "question": "How much joining bonus does Infosys offer for the Specialist Programmer L1 and L2 roles?",
     "type": C, "companies": ["infosys"], "must_contain": ["joining bonus"]},
    {"id": "C08", "question": "What is the detailed 4-year compensation structure for Mu Sigma?",
     "type": C, "companies": ["mu sigma"], "must_contain": ["compensation over 4 years"]},
    {"id": "C09", "question": "How much is the internship stipend for CME Group before the PPO conversion?",
     "type": C, "companies": ["cme group"], "must_contain": ["55,000"]},
    {"id": "C10", "question": "What is the total CTC offered by Zen Data Shastra over the three-year period?",
     "type": C, "companies": ["zen data shastra"], "must_contain": ["21.00 lakhs over three years"]},
    # ---- roles / skills
    {"id": "C11", "question": "Which company is specifically hiring for a Forward Deployed Engineer Intern?",
     "type": "cross_company", "companies": ["engati"], "must_contain": ["forward deployed engineer"]},
    {"id": "C12", "question": "What mandatory programming language requirement is needed for the Pibit.ai AI Internship?",
     "type": C, "companies": ["pibit.ai"], "must_contain": ["mandatory requirement"]},
    {"id": "C13", "question": "Which company is hiring for Mechanical Engineers and Embedded Hardware roles for EV subsystems?",
     "type": "cross_company", "companies": ["zaptics research"], "must_contain": []},
    {"id": "C14", "question": "Is knowledge of PureScript and functional programming required for Juspay?",
     "type": C, "companies": ["juspay"], "must_contain": ["purescript"]},
    {"id": "C15", "question": "What specific AI tools does Tredence expect candidates to use to expedite coding delivery?",
     "type": C, "companies": ["tredence"], "must_contain": []},
    # ---- agreements
    {"id": "C16", "question": "What is the financial penalty or recovery clause if I leave Mu Sigma within 24 months?",
     "type": C, "companies": ["mu sigma"], "must_contain": ["probation"]},
    {"id": "C17", "question": "How long is the mandatory service agreement for GyanSys?",
     "type": C, "companies": ["gyansys"], "must_contain": ["service agreement : 3 years"]},
    {"id": "C18", "question": "What are the exact terms of the indemnity agreement for Optimus Information?",
     "type": C, "companies": ["optimus information"], "must_contain": ["indemnity agreement"]},
    {"id": "C19", "question": "Does KPIT enforce a service agreement, and if so, for how many years?",
     "type": C, "companies": ["kpit"], "must_contain": ["2 years of service agreement"]},
    # ---- logistics
    {"id": "C20", "question": "Which company strictly requires a 1-minute video submission detailing past experiences during registration?",
     "type": "cross_company", "companies": ["bitespeed"], "must_contain": []},
    {"id": "C21", "question": "What are the strict browser and device requirements for the Springworks AI interview?",
     "type": C, "companies": ["springworks"], "must_contain": []},
    {"id": "C22", "question": "Which company explicitly states that they will take strict action against absentees who fail to attend the physical drive?",
     "type": "cross_company", "companies": [], "must_contain": []},
    {"id": "C23", "question": "Who conducts the initial shortlisting for the Recrivio drive before the company steps in?",
     "type": C, "companies": ["recrivio"], "must_contain": ["initial shortlisting will be done by tnp"]},
    # ---- open questions across companies (best effort until Phase 5)
    {"id": "C24", "question": "Which companies offer a stipend of Rs. 30,000 or more per month during the internship phase?",
     "type": "cross_company", "companies": [], "must_contain": []},
    {"id": "C25", "question": "If I am an Electrical Engineering (EE) student, which hardware or embedded companies can I apply to?",
     "type": "cross_company", "companies": [], "must_contain": []},
    {"id": "C26", "question": "Which roles offer a base CTC of over 15 LPA immediately upon joining?",
     "type": "cross_company", "companies": [], "must_contain": []},
    # ---- refusals
    {"id": "C27", "question": "What is the minimum CGPA required to apply for the Google Software Engineering role?",
     "type": C, "companies": [], "must_contain": [], "expect_refusal": True},
    {"id": "C28", "question": "Is the BiteSpeed internship completely remote?",
     "type": C, "companies": ["bitespeed"], "must_contain": [], "expect_refusal": True},
    {"id": "C29", "question": "Can I use Perplexity or ChatGPT during the Springworks AI interview if I get stuck?",
     "type": C, "companies": ["springworks"], "must_contain": [], "expect_refusal": True},
    {"id": "C30", "question": "What is the signing bonus for the Zaptics Research Embedded Software role?",
     "type": C, "companies": ["zaptics research"], "must_contain": [], "expect_refusal": True},
    {"id": "C31", "question": "Does Optimus Information allow candidates to skip the English proficiency written test?",
     "type": C, "companies": ["optimus information"], "must_contain": [], "expect_refusal": True},

    # ---- NEW: company + rules (the hardest and most useful type)
    {"id": "X01", "question": "I already have a 6 LPA offer in Category 1. Can I sit for the Juspay drive?",
     "type": "company_rules", "companies": ["juspay"], "must_contain": ["27.00 lakhs", "1.5 times"]},
    {"id": "X02", "question": "I got placed in Tredence at 12.5 LPA. Am I still allowed to apply for Lexmark?",
     "type": "company_rules", "companies": ["tredence", "lexmark"], "must_contain": ["12.5 lpa", "10.50 lpa", "has an offer in that slab"]},
    {"id": "X03", "question": "I have an offer of 8 LPA. Which Infosys Specialist Programmer levels could I still sit for?",
     "type": "company_rules", "companies": ["infosys"], "must_contain": ["specialist programmer l3", "1.5 times"]},
    {"id": "X04", "question": "If I register for the KPIT drive and then skip it, what happens to me?",
     "type": "company_rules", "companies": ["kpit"], "must_contain": ["zero tolerance"]},
    {"id": "X05", "question": "I am a Mechanical student with no offers yet. Can I apply to Osfin.ai?",
     "type": "company_rules", "companies": ["osfin.ai"], "must_contain": ["mechanical"]},
    {"id": "X06", "question": "I have a 10 LPA Category 2 offer. Is Recrivio's GTM Consultant role open to me?",
     "type": "company_rules", "companies": ["recrivio"], "must_contain": ["16.00 lpa", "14.01 lpa"]},

    # ---- NEW: named multi-company
    {"id": "M01", "question": "Compare the CTC of Mu Sigma and Tredence.",
     "type": "multi_company", "companies": ["mu sigma", "tredence"], "must_contain": ["compensation over 4 years", "12.5 lpa"]},
    {"id": "M02", "question": "Which has a higher stipend, Pibit.ai or Engati?",
     "type": "multi_company", "companies": ["pibit.ai", "engati"], "must_contain": ["35,000", "30,000"]},
    {"id": "M03", "question": "Do GyanSys and Zen Data Shastra both have a service agreement?",
     "type": "multi_company", "companies": ["gyansys", "zen data shastra"], "must_contain": ["service agreement : 3 years"]},
    {"id": "M04", "question": "What are the CGPA requirements for AntBox, Pibit.ai and Zen Data Shastra?",
     "type": "multi_company", "companies": ["antbox", "pibit.ai", "zen data shastra"], "must_contain": ["6.00 or above cgpa", "8.00 or above cgpa"]},

    # ---- out of scope
    {"id": "O01", "question": "Who won the IPL this year?", "type": "out_of_scope", "companies": [],
     "must_contain": [], "expect_refusal": True},
]
