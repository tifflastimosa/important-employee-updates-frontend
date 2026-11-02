# important-employee-updates-frontend
The frontend of a prototype of a web application that would help managers organize important messages for employees and help employees manage numerous work messages.

Built with React 19, React Router and Vite. It talks to the Spring Boot API in
[important-employee-updates-backend](../important-employee-updates-backend).

## Run it locally

You need [Node.js](https://nodejs.org/) 24.

In development, Vite forwards every `/api` request to the backend named by `BACKEND_URL`
in `.env` (default `http://localhost:8080`; see `.env.example`). Because the browser only
talks to the Vite dev server, the backend doesn't need any CORS setup for this.

### Against the deployed backend (quickest)

No Java or database needed. Note that you'll be reading and changing the live prototype's data.

```sh
npm install
echo "BACKEND_URL=https://important-employee-backend-f36c59d32d64.herokuapp.com" > .env
npm run dev
```

Open http://localhost:5173 and choose who you are.

### Against a local backend

1. Start the backend (port 8080), e.g. from the
   [backend repo](../important-employee-updates-backend): `./mvnw spring-boot:run`
2. In this repo (no `.env` needed):
   ```sh
   npm install
   npm run dev
   ```
3. Open http://localhost:5173 and choose who you are.

## What's in it

| Who | Page | What it does |
| --- | --- | --- |
| Everyone | **Sign in** (`/sign-in`) | Pick an employee (no passwords yet), or add a person. |
| Everyone | **My inbox** (`/inbox`) | Messages for you, sorted by priority. Tabs for *Needs action*, *Acknowledged*, *All*; filter by priority; search. |
| Everyone | **Message** (`/inbox/:id`) | Read a message and acknowledge it (plus one-time e-signature consent). |
| Managers & admins | **Manage messages** (`/manage`) | Every message with acknowledgement progress, summary stats, filters, sorting, edit and delete. |
| Managers & admins | **New / edit** (`/manage/new`, `/manage/:id/edit`) | Title, priority, body, audience (everyone or chosen departments) with a live count of who will be asked to acknowledge. |
| Managers & admins | **Status** (`/manage/:id`) | Who has and hasn't acknowledged, with "Copy emails" for sending reminders. |

## Code layout

```
src/
  api.js               REST client (parses the backend's ProblemDetail errors)
  session.jsx          "Signed in as" employee, remembered in localStorage
  utils.js             priorities, sorting, date formatting, useApi hook
  components/          Layout, MessageForm, shared UI (badges, progress, dialog, toast)
  pages/               SignIn, Inbox, MessageView, ManageMessages, MessageStatus, EditMessage
```

## Deploying to Heroku

The Node buildpack runs `npm run build` (Vite → `dist/`) during the build, then `npm start`,
which serves `dist/` with [`serve`](https://www.npmjs.com/package/serve) on Heroku's `$PORT`.
`-s` sends unknown paths to `index.html`, so links like `/inbox` work on refresh.

The frontend and API are separate Heroku apps, so two config vars connect them:

```sh
# Frontend: where the API lives. Read at BUILD time, so redeploy after changing it.
heroku config:set VITE_API_BASE_URL=https://<backend-app>.herokuapp.com -a <frontend-app>

# Backend: allow the frontend's origin through CORS.
heroku config:set APP_CORS_ALLOWED_ORIGINS=https://<frontend-app>.herokuapp.com -a <backend-app>
```

To try the production build locally: `npm run build && npm start` (http://localhost:3000).
