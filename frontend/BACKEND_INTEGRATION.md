# Backend integration guide (for Sarthak and Harsh)

The frontend never sends `college_id`. The backend must take the college from the authenticated user's JWT and enforce
college isolation (documents and chat) and roles (`admin` vs `student`) on every request. Route guards in the React app
are navigation only.

Paths below are relative to `VITE_API_BASE_URL` (default `/api`, proxied to FastAPI by `vite.config.js`).
**Everything marked UNCONFIRMED is an assumption in one place in the code. Change it there, not in components.**

## Where each contract lives in the code

| Area | File | What to edit |
|---|---|---|
| Endpoint paths | `.env` (see `.env.example`), read in `src/config.js` | Set the real paths. An empty path shows a "not connected yet" state. |
| Login | `src/api/auth.js` → `AUTH_CONTRACT` | Field names, JSON vs form encoding, role strings |
| Upload and document list | `src/api/documents.js` | Multipart part names, response keys |
| Chat and history | `src/api/chat.js` | Request body, response keys |
| Token header, error parsing, 401 handling | `src/api/http.js` | Bearer vs cookie, error shape |
| Token storage | `src/auth/session.js` | localStorage vs cookie |

## 1. Authentication (UNCONFIRMED, nothing agreed)

| | Frontend currently does |
|---|---|
| Endpoint | `POST VITE_AUTH_LOGIN_PATH` (empty by default → login shows "not connected") |
| Request | JSON `{ "email", "password" }` (switchable to form-encoded with a `username` field in `AUTH_CONTRACT`) |
| Response read | `access_token` (string). Optional `user: { role, name, email, college_name }`. Falls back to `role` / `name` / `email` claims in the JWT. |
| Roles | `admin`, `college_admin` → College Admin. `student` → Student. Anything else is rejected. Edit `roleMap`. |
| Authenticated calls | `Authorization: Bearer <token>` on every request |
| Expiry | Token `exp` claim is checked every 30 s and on load. Any 401 on a request that carried a token clears the session and goes to `/login` with a "session ended" notice. No refresh logic. |

## 2. Document upload (admin)

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

## 4. Chat (student) (UNCONFIRMED)

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

## Open items to settle

**Sarthak (backend)**
1. Login: path, request encoding and field names, response shape, role strings, whether admin and student log in at the same endpoint, and whether name / college come back in the response, in the JWT, or need a "me" endpoint.
2. Token transport: Bearer header (assumed) or httpOnly cookie? If cookie, the frontend needs `credentials: 'include'` plus CORS/CSRF handling. Token lifetime and refresh strategy.
3. Which JWT claim carries the college, and confirmation that every documents and chat route filters by it.
4. Upload: final path and prefix, multipart part names, response keys (esp. the chunk count key), HTTP codes for bad PDF / too large / validation, and whether ingestion is synchronous. Embedding a large PDF may take a while and the frontend has no timeout and shows no fake progress.
5. Document list endpoint: path, fields, an indexing `status` vocabulary, pagination. Is delete or replace-by-id planned?
6. Chat: path, request and response above, whether the thread is held by `conversation_id`, and the error codes for "no answer" versus failures.
7. Chat history endpoints, if they will exist at all.
8. CORS settings, or confirmation that production serves the frontend and API from one origin.
9. Later, not blocking: endpoints for student profile and eligibility, company/drive information, student statistics for the admin dashboard, and a document count for the student dashboard.

**Harsh (RAG)**
1. `rag/query.py` returns plain text. For source chips the response needs document name and page per source (the chunk metadata already has `document_name` and `page`).
2. `rag/ingest.py`: the `job_role` field is currently indented inside the `NoticeType` enum, not inside `DocumentMetadata`. `ingest_document` reads `meta.job_role`, so company notices would fail with an attribute error. Move it into `DocumentMetadata` (and add it to the cleaning validator as the comment says).
3. The frontend mirrors the limits in `ingest.py` (20 MB, title 120, company 100, job role 100). Tell us if they change.
4. Wording of "I don't have that information, please contact the T&P cell." is shown as a normal answer. Agree whether the backend will mark no-answer cases separately.
