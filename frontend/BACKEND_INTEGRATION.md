# Backend integration guide

The frontend never sends `college_id`. The backend must take the college from the authenticated user's JWT and enforce
college isolation (documents and chat) and roles (`admin` vs `student`) on every request. Route guards in the React app
are navigation only.

Paths below are relative to `VITE_API_BASE_URL` (default `/api`, proxied to FastAPI by `vite.config.js`).
Authentication is implemented for this demo. The document, chat, and history integrations below are still pending.

## Where each contract lives in the code

| Area | File | What to edit |
|---|---|---|
| Endpoint paths | `.env` (see `.env.example`), read in `src/config.js` | Set paths for integrations that are not implemented yet. |
| Login | `src/api/auth.js` → `AUTH_CONTRACT` | Login field names, response keys, role strings |
| Upload and document list | `src/api/documents.js` | Multipart part names, response keys |
| Chat and history | `src/api/chat.js` | Request body, response keys |
| Token header, error parsing, 401 handling | `src/api/http.js` | Bearer token and error shape |
| Token storage | `src/auth/session.js` | localStorage vs cookie |

## 1. Authentication (implemented demo)

The FastAPI service is in `backend/`. It has no database and only accepts these fixed demo accounts:

| Role | Email | Password |
|---|---|---|
| Student | `rohan.sharma@kiit.ac.in` | `student123` |
| College admin | `tnp@kiit.ac.in` | `admin123` |

- Start the backend from the repository root with `uvicorn backend.main:app --reload`.
- Start the frontend from `frontend/` with `npm run dev`. Vite proxies `/api` to `http://localhost:8000`.
- `POST /api/auth/login` accepts JSON `{ "email", "password" }` and returns `{ "access_token", "token_type", "user" }`.
- `GET /api/auth/me` requires `Authorization: Bearer <token>` and returns the signed-in demo profile.
- Access tokens are HS256 signed and expire after one hour. Set `AUTH_SECRET` to a stable secret if tokens should survive backend restarts; otherwise a random key is generated on each start.
- This is demonstration-only authentication, not production identity management. Credentials are hardcoded, passwords are not stored in a database, and sign-up is disabled.

The frontend stores the JWT in localStorage, checks expiry, and sends it as a bearer token. A 401 on an authenticated request clears the session and redirects to `/login`. `VITE_AUTH_LOGIN_PATH` can override the default `/auth/login` path relative to `VITE_API_BASE_URL`.

## 2. Document upload (admin) — not implemented yet

`POST VITE_DOCUMENTS_UPLOAD_PATH` (default `/documents`; use `/api/documents` via the proxy)

`multipart/form-data`. The frontend does **not** set `Content-Type`; the browser adds the boundary.
Part names follow `rag/ingest.py` (`DocumentMetadata`), part names themselves are UNCONFIRMED:

| Part | Sent when | Notes |
|---|---|---|
| `file` | always | PDF only, 1 byte to 20 MB |
| `doc_type` | always | `tnp_rules` \| `company_notice` \| `placement_faq` |
| `batch` | always | four-digit string, e.g. `2027` |
| `title` | if filled | max 120 chars |
| `notice_date` | if filled | `YYYY-MM-DD` |
| `company` | company notices | required, max 100 chars (`company`, not `company_name`, to match `ingest.py`) |
| `notice_type` | company notices | required: `registration` `job_description` `eligibility` `ppt` `schedule` `update` `general` |
| `job_role` | company notices, if filled | max 100 chars |

Response read (matches `IngestResult`): `{ "status": "added"|"updated"|"skipped", "document_id", "document_name", "chunks": <int> }`.
`chunks` is shown as returned. Error bodies: FastAPI `{ "detail": "..." }` or `{ "detail": [{ "loc": [...], "msg": "..." }] }`
are shown to the admin as-is (e.g. the 422 "scanned PDF" message from `IngestError`).

## 3. Document list (admin) — not ready

`GET VITE_DOCUMENTS_LIST_PATH` (empty by default). Accepts an array or `{ items | documents: [...] }`. Per row it reads:
`document_id`, `document_name`, `doc_type`, `company_display` or `company`, `batch`, `status` (string, shown as a badge),
`chunks` or `chunk_count`, `ingested_at` (epoch seconds, as in the chunk metadata) or `uploaded_at` / `created_at`.
Until this exists, the page says so and only lists uploads confirmed by the server during the current visit.

## 4. Chat (student) — not implemented yet

`POST VITE_CHAT_PATH` (default `/query`, inherited from the earlier README, please confirm)

- Request: `{ "question": "...", "conversation_id": "..." }` (`conversation_id` only after the backend has returned one)
- Response read: `answer` (also accepts `text` / `response`), optional `sources: [{ doc | document_name, page }]`,
  optional `conversation_id`, optional numeric `confidence`.
- Answer text may use `**bold**` and `- ` bullets. Nothing else is rendered as markup.

Follow-ups: the frontend relies on the backend remembering the thread through `conversation_id`. If the backend is stateless
instead, tell the frontend to send previous turns.

History (optional): `GET VITE_CONVERSATIONS_PATH` → list of `{ id | conversation_id, title | first_question, updated_at | created_at }`;
`GET VITE_CONVERSATION_PATH` with `{id}` placeholder → `{ messages: [{ role: "user"|"assistant", content | text, sources }] }`.
Both are empty by default and the UI says history is not available.

## Open integration items

1. Which JWT claim carries the college, and ensure every documents and chat route filters by it.
2. Upload: final path and prefix, multipart part names, response keys (especially the chunk count key), HTTP codes for bad PDF / too large / validation, and whether ingestion is synchronous. Embedding a large PDF may take a while and the frontend has no timeout and shows no fake progress.
3. Document list endpoint: path, fields, an indexing `status` vocabulary, pagination. Is delete or replace-by-id planned?
4. Chat: path, request and response above, whether the thread is held by `conversation_id`, and the error codes for "no answer" versus failures.
5. Chat history endpoints, if they will exist at all.
6. CORS settings, or confirmation that production serves the frontend and API from one origin.
7. Later, not blocking: endpoints for student profile and eligibility, company/drive information, student statistics for the admin dashboard, and a document count for the student dashboard.

## RAG notes

1. `rag/query.py` returns plain text. For source chips the response needs document name and page per source (the chunk metadata already has `document_name` and `page`).
2. `rag/ingest.py`: the `job_role` field is currently indented inside the `NoticeType` enum, not inside `DocumentMetadata`. `ingest_document` reads `meta.job_role`, so company notices would fail with an attribute error. Move it into `DocumentMetadata` (and add it to the cleaning validator as the comment says).
3. The frontend mirrors the limits in `ingest.py` (20 MB, title 120, company 100, job role 100). Tell us if they change.
4. Wording of "I don't have that information, please contact the T&P cell." is shown as a normal answer. Agree whether the backend will mark no-answer cases separately.
