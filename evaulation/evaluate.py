import json
import time
from rag.embedder import EmbeddingModel
from rag.retriver import get_hybrid_retriver
from rag.vector_store import get_vector_store
from langchain.chat_models import init_chat_model
import os
from dotenv import load_dotenv

load_dotenv()
os.environ['GOOGLE_API_KEY']=os.getenv("GEMINI_API_KEY")

TEST_QUERIES = [
    # Easy Retrieval
    ("easy", "What is the minimum attendance required for theory classes?"),
    ("easy", "What is the attendance requirement for practicals and seminars?"),
    ("easy", "How many exit tests are mandatory before placement participation?"),
    ("easy", "Can students with pending university dues participate in placements?"),
    ("easy", "What happens if plagiarism is detected during a placement process?"),
    # Placement Categories
    ("category", "What are the three placement categories?"),
    ("category", "How many offers can a student receive through campus placements?"),
    ("category", "Can a student with a Category 3 offer continue participating in placements?"),
    ("category", "If I get a 6 LPA offer, what minimum package do I need to become eligible for Category 2?"),
    ("category", "If I get a 10 LPA offer, can I sit for a 14 LPA company?"),
    ("category", "If I get a 10 LPA offer, what minimum package do I need to become eligible for Category 3?"),
    # Core Branch
    ("core", "Can a core branch student receive multiple core offers?"),
    ("core", "If a core student gets an IT offer first, can they still sit for core companies?"),
    ("core", "If a core student gets a core offer first, can they participate in IT companies later?"),
    ("core", "How many IT offers can a core engineering student receive?"),
    # Discipline
    ("discipline", "What happens if I register for a drive and do not attend it?"),
    ("discipline", "Can I reject an offer after being selected?"),
    ("discipline", "What happens if I skip an interview round after clearing the online test?"),
    ("discipline", "Can students directly contact company officials during the recruitment process?"),
    ("discipline", "What happens if a student misbehaves with company representatives?"),
    # Overlaps
    ("overlap", "If two companies have overlapping recruitment processes and I am waitlisted in one, can I attend the other?"),
    ("overlap", "Which offer do I have to accept if I receive multiple offers during overlapping processes?"),
    # After Selection
    ("post_selection", "Is it mandatory to accept an internship or PPO offer?"),
    ("post_selection", "Can I leave a PPO internship midway?"),
    ("post_selection", "What happens if I leave an internship due to medical reasons?"),
    ("post_selection", "Do I need to submit any documents after accepting an offer?"),
    ("post_selection", "What is a placement sign-off form?"),
    # Off-Campus
    ("off_campus", "What should I do if I receive an off-campus offer?"),
    ("off_campus", "Can I join an off-campus company after already being selected through campus placement?"),
    # Hallucination Tests — system should say "I don't know"
    ("hallucination", "What is the minimum CGPA required for placement?"),
    ("hallucination", "What is the highest package offered at KIIT?"),
    ("hallucination", "How many companies visit KIIT every year?"),
    ("hallucination", "Can I sit for placements with a 6.5 CGPA?"),
    ("hallucination", "What is the average salary package for KIIT students?"),
]