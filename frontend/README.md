# PlaceMate AI frontend

React + Vite frontend for the Smart Campus Placement Assistant. The authentication API is in the repository's `backend/` folder.

Two roles for the MVP:

| Role | Lands on | MVP screens |
|---|---|---|
| College admin | `/admin` | Dashboard, Knowledge base (PDF upload with validation, uploaded documents) |
| Student | `/app` | Dashboard, AI Placement Assistant (RAG chat), Companies, My Eligibility |

Companies, drives, eligibility and "latest updates" are **sample data** and are labelled that way until the backend provides them.
Documents and chat answers come from the API. Chat context stays in memory for up to five exchanges and is not saved.

## Run

```bash
python -m pip install -r requirements.txt
uvicorn backend.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite opens at `http://localhost:5173`. Run `npm run build` in `frontend/` for a production build.

Authentication is handled by the backend. The frontend submits the entered credentials to the login API and does not include demo accounts or a login bypass. Authentication details and demo-only limitations are in
[`BACKEND_INTEGRATION.md`](./BACKEND_INTEGRATION.md).

The success path (added / updated / skipped with a real chunk count, a real answer) needs the backend. To check the request shape,
open the browser's Network tab: uploads are `multipart/form-data` with no `college_id`; chat sends the question and up to ten prior messages.
Both carry `Authorization: Bearer ...` once login works. Set `GEMINI_API_KEY` in the repository-root `.env` for live chat responses.

## Connecting the backend

Read **`BACKEND_INTEGRATION.md`** for the endpoint contracts and remaining integration questions. In short:

1. Set the paths in `.env` (`VITE_AUTH_LOGIN_PATH`, `VITE_DOCUMENTS_UPLOAD_PATH`, `VITE_DOCUMENTS_LIST_PATH`, `VITE_CHAT_PATH`, ...).
2. Adjust the small `*_CONTRACT` blocks in `src/api/auth.js`, `src/api/documents.js`, `src/api/chat.js` if the field names differ.
3. If the backend has no `/api` prefix, set `VITE_PROXY_STRIP_API=true`.

## Structure

```
src/
  config.js              env-driven endpoint paths and feature flags
  api/http.js            fetch wrapper: bearer token, multipart, error parsing, 401 handling
  api/auth.js            login (unconfirmed contract in one object)
  api/documents.js       upload + list
  api/chat.js            stateless ask with recent context
  auth/session.js        JWT session storage and expiry check
  auth/roles.js          role to home route
  context/AppContext.jsx session, chat state, toast; demo slices only for non-MVP pages
  lib/validators.js      upload validation (PDF, 20 MB, batch, company-notice fields)
  hooks/                 useDocuments
  components/            Shell (role-based nav), ChatPanel, DocumentUploadForm, shared UI
  pages/student|admin|super
  data/seed.js           demo data for the sample pages only
```

## Pages outside the MVP

Ticket queue, answer review, analytics, admin/student settings, placement guidelines, "my questions" and the platform console
are kept in the code but hidden. Set `VITE_ENABLE_FUTURE_PAGES=true` to see them; they run on demo data in the browser.

Route guards are for navigation only. Role and college checks must be enforced by the API.
