# PlaceMate AI frontend

React + Vite frontend for the Smart Campus Placement Assistant. It lives in this folder only; the Python RAG code is untouched.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Log in from the first screen. Pick a role and press **Log in** with empty fields (demo mode):

| Role | Goes to | What it shows |
|---|---|---|
| Student | `/app` | Dashboard with docked chat, AI assistant with citations, eligibility checker, companies, guidelines, my questions, history, settings |
| TnP staff | `/admin` | Overview, ticket queue with triage and reply, knowledge base upload, answer review, analytics, tenant settings |
| Platform admin | `/platform` | Colleges (tenants), isolation tests, platform users |

## Demo loop to try

1. As a student, ask *"If I get a 6 LPA offer, what do I need for Category 2?"* and get a cited answer.
2. Ask something the documents do not cover, such as *"Does the L&T notice apply to dual-degree students?"*. The assistant raises a ticket with severity, complexity and category.
3. Log out, log in as TnP staff, open the ticket, reply and mark it reusable.
4. Open **Answer review** and add it to the knowledge base.
5. Log back in as the student: the reply shows under **My Questions**.

Data is kept in `localStorage`. **Profile & Settings → Reset demo data** restores the sample data.

## Connecting the backend

`src/api/client.js` is the only file that talks to the server. Mock mode is on by default (`.env`: `VITE_USE_MOCK=true`).
Set it to `false` and requests go to `/api/*`, proxied to `VITE_API_URL` (default `http://localhost:8000`) by `vite.config.js`.

The chat expects this from `POST /api/query` with `{ question, college_id }`:

```json
{ "type": "answer",   "text": "...", "sources": [{ "doc": "T&P Regulations_2027 Batch.pdf", "page": 3 }], "confidence": 0.9 }
{ "type": "escalate", "reason": "...", "severity": "High", "complexity": "Policy interpretation", "category": "Eligibility", "confidence": 0.3, "eta_hours": 24 }
```

The current `rag/query.py` returns plain text. A small FastAPI wrapper that adds sources and the escalate decision is the next backend step. Tickets, documents, tenants and auth are still held in the browser (`src/context/AppContext.jsx`) and need matching endpoints.

## Structure

```
src/
  api/client.js          assistant API + mock answers
  context/AppContext.jsx app state (auth, tickets, docs, chat), persisted locally
  lib/eligibility.js     deterministic eligibility check
  components/            Shell (layouts), ChatPanel, shared UI
  pages/student|admin|super
  data/seed.js           demo data, including answers taken from evaluation/results_v2_*.json
```

Route guards in `App.jsx` are for navigation only. Real role and tenant checks must be enforced by the API.
