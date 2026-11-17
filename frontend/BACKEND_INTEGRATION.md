# Backend integration guide

The frontend never sends `college_id`. The backend must take the college from the authenticated user's JWT and enforce
college isolation (documents and chat) and roles (`admin` vs `student`) on every request. Route guards in the React app
are navigation only.

Paths below are relative to `VITE_API_BASE_URL` (default `/api`, proxied to FastAPI by `vite.config.js`).
Authentication, admin document upload/listing, and student chat are implemented for this demo. Conversations are not persisted.

## Where each contract lives in the code

| Area | File | What to edit |
|---|---|---|
| Endpoint paths | `.env` (see `.env.example`), read in `src/config.js` | Override the default API paths if needed. |
| Login | `src/api/auth.js` → `AUTH_CONTRACT` | Login field names, response keys, role strings |
| Upload and document list | `src/api/documents.js` | Multipart part names, response keys |
| Chat | `src/api/chat.js` | Request body, answer and source fields |
| Token header, error parsing, 401 handling | `src/api/http.js` | Bearer token and error shape |
| Token storage | `src/auth/session.js` | localStorage vs cookie |

## 1. Authentication (implemented demo)

The FastAPI service is in `backend/`. Its demo accounts are defined only in `backend/auth.py`; the frontend does not bundle account credentials.

- Start the backend from the repository root with `uvicorn backend.main:app --reload`.
- Start the frontend from `frontend/` with `npm run dev`. Vite proxies `/api` to `http://localhost:8000`.
- `POST /api/auth/login` accepts JSON `{ "email", "password" }` and returns `{ "access_token", "token_type", "user" }`.
- `GET /api/auth/me` requires `Authorization: Bearer <token>` and returns the signed-in demo profile.
- Access tokens are HS256 signed and expire after one hour. Set `AUTH_SECRET` to a stable secret if tokens should survive backend restarts; otherwise a random key is generated on each start.
- This is demonstration-only authentication, not production identity management. Credentials are hardcoded, passwords are not stored in a database, and sign-up is disabled.

The frontend stores the JWT in localStorage, checks expiry, and sends it as a bearer token. A 401 on an authenticated request clears the session and redirects to `/login`. `VITE_AUTH_LOGIN_PATH` can override the default `/auth/login` path relative to `VITE_API_BASE_URL`.

## 2. Document upload (admin) — implemented

`POST /api/documents` (default `VITE_DOCUMENTS_UPLOAD_PATH=/documents`, relative to `/api`)

Requires an admin bearer token. The frontend sends `multipart/form-data` and does **not** set `Content-Type`; the browser adds the boundary.
The backend derives the college from the token, validates and synchronously indexes the PDF, then stores it under `data/uploads/<college_id>/`.
The original filename is kept as metadata; stored files use the ingestion document ID.

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

Response: `{ "status": "added"|"updated"|"skipped", "document_id", "document_name", "chunks": <int> }`.
The upload is stored only after successful ingestion. Invalid PDFs and scanned PDFs return HTTP 422; files over 20 MB return 413.

## 3. Document list (admin) — implemented

`GET /api/documents` (default `VITE_DOCUMENTS_LIST_PATH=/documents`, relative to `/api`). Requires an admin bearer token and returns the signed-in college's uploaded documents as an array. Per row it reads:
`document_id`, `document_name`, `doc_type`, `company_display` or `company`, `batch`, `status` (string, shown as a badge),
`chunks` or `chunk_count`, `ingested_at` (epoch seconds, as in the chunk metadata) or `uploaded_at` / `created_at`.
The list is persisted in per-document metadata files alongside PDFs under `data/uploads/<college_id>/`.

## 4. Chat (student) — implemented

`POST /api/query` (default `VITE_CHAT_PATH=/query`, relative to `/api`). Requires a student bearer token.

- Request: `{ "question": "...", "history": [{ "role": "user"|"assistant", "content": "..." }] }`.
  The frontend sends up to the last five completed exchanges (10 messages) for follow-up context. The backend rejects a longer history.
- Response: `{ "answer": "...", "sources": [{ "doc": "...", "page": 1 }] }`. Page numbers are one-based.
- The backend uses the authenticated student's `college_id` to choose the vector collection. It does not store chat requests or history.
- Chat history is held in React memory only; refreshing the page, logging out, or starting a new chat clears it.
- Set `GEMINI_API_KEY` in the repository-root `.env` file or backend environment. Without it, chat returns HTTP 503 with a configuration message.
- Answer text may use `**bold**` and `- ` bullets. Nothing else is rendered as markup.

## Open integration items

1. Document storage and listing use the authenticated user's `college_id`; apply the same isolation to future chat routes.
2. Upload is synchronous; embedding a large PDF may take a while and the frontend has no timeout and shows no fake progress.
3. Document deletion and pagination are not implemented.
4. CORS settings, or confirmation that production serves the frontend and API from one origin.
5. Later, not blocking: endpoints for student profile and eligibility, company/drive information, student statistics for the admin dashboard, and a document count for the student dashboard.

## RAG notes

1. `rag/query.py` returns an answer and document/page sources from retrieved chunks.
2. `rag/ingest.py` now defines and cleans `job_role` on `DocumentMetadata`, so company notices can be indexed.
3. The frontend mirrors the limits in `ingest.py` (20 MB, title 120, company 100, job role 100). Tell us if they change.
4. Wording of "I don't have that information, please contact the T&P cell." is shown as a normal answer. Agree whether the backend will mark no-answer cases separately.
