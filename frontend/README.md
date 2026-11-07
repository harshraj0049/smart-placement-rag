# PlaceMate AI frontend

React + Vite frontend for the Smart Campus Placement Assistant. It lives in this folder only; the Python RAG code is untouched.

Two roles for the MVP:

| Role | Lands on | MVP screens |
|---|---|---|
| College admin | `/admin` | Dashboard, Knowledge base (PDF upload with validation, uploaded documents) |
| Student | `/app` | Dashboard, AI Placement Assistant (RAG chat), Companies, My Eligibility, Chat history |

Companies, drives, eligibility and "latest updates" are **sample data** and are labelled that way until the backend provides them.
Documents, chat answers and chat history are never simulated: they come from the API or show a "not connected" / error state.

## Run

```bash
cd frontend
npm install
cp .env.example .env     # adjust paths once Sarthak confirms them
npm run dev              # http://localhost:5173
npm run build            # production build
```

## Test it without a backend

With `VITE_DEV_LOGIN=true` (in `.env.example`) the login page shows **Enter as student / college admin**. This only works in
`npm run dev`. API calls then carry no token, so you can check:

- Admin → Knowledge base → Upload document: every validation message, the company-notice fields, and that the button locks while uploading. Without a server the upload ends in "Cannot reach the server".
- Student → AI Placement Assistant: loading, empty and error states, and **Try again**.
- Redirects: a student opening `/admin/...` lands on `/app`, an admin opening `/app/...` lands on `/admin`, a logged-out visitor lands on `/login`.

The success path (added / updated / skipped with a real chunk count, a real answer) needs the backend. To check the request shape,
open the browser's Network tab: the upload is `multipart/form-data` with no `college_id`, and carries `Authorization: Bearer ...` once login works.

## Connecting the backend

Read **`BACKEND_INTEGRATION.md`**. It lists every endpoint, request and response the frontend expects, which parts are
unconfirmed, and the questions for Sarthak and Harsh. In short:

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
  api/chat.js            ask + history
  auth/session.js        JWT session storage and expiry check
  auth/roles.js          role to home route
  context/AppContext.jsx session, chat state, toast; demo slices only for non-MVP pages
  lib/validators.js      upload validation (PDF, 20 MB, batch, company-notice fields)
  hooks/                 useDocuments, useConversations
  components/            Shell (role-based nav), ChatPanel, DocumentUploadForm, shared UI
  pages/student|admin|super
  data/seed.js           demo data for the sample pages only
```

## Pages outside the MVP

Ticket queue, answer review, analytics, admin/student settings, placement guidelines, "my questions" and the platform console
are kept in the code but hidden. Set `VITE_ENABLE_FUTURE_PAGES=true` to see them; they run on demo data in the browser.

Route guards are for navigation only. Role and college checks must be enforced by the API.
