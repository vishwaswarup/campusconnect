# Campus Connect

A centralized college student-services portal: events, notes & resources, announcements, lost & found, complaints, clubs, profiles and a full admin console.

**Stack:** Node.js · Express 4 · MongoDB + Mongoose · session auth (bcrypt, `express-session` + `connect-mongo`) · Multer uploads · Bootstrap 5 · vanilla JS (hash-routed SPA) · Chart.js. No paid APIs, no AI dependency. All frontend libraries are vendored in `public/vendor`, so it works offline.

## Quick start

```bash
npm install
cp .env.example .env          # then set SESSION_SECRET (see below)
# MongoDB must be running, e.g. `brew services start mongodb-community` or Atlas URI in .env
npm run seed                  # demo data (WIPES the configured database)
npm start                     # http://localhost:3000
```

Demo accounts (created by `npm run seed`, development only):

| Role    | Email                          | Password       |
|---------|--------------------------------|----------------|
| Admin   | admin@campusconnect.edu        | Admin@12345    |
| Student | student@campusconnect.edu      | Student@123    |

`npm run dev` restarts on change · `npm test` runs the test suite.

## Environment variables (`.env.example`)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | HTTP port (default 3000) |
| `MONGODB_URI` | Main database |
| `MONGODB_URI_TEST` | Separate DB used (and wiped) by tests |
| `SESSION_SECRET` | 32+ random chars; **required in production** (app refuses to start without it) |
| `CORS_ORIGINS` | Comma-separated extra allowed origins; empty = same-origin only |
| `UPLOAD_DIR` | Where uploaded files are stored (persistent disk in production) |
| `TRUST_PROXY` | `true` behind an HTTPS proxy (needed for secure cookies on Render/Railway/Heroku) |
| `STUDENT_UPLOADS` | `false` disables student note uploads |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Creating the first admin (secure)

There is **no public admin registration**; the API ignores any `role` sent by clients. Create admins from the server shell:

```bash
npm run create-admin                       # interactive, password input hidden
# or non-interactive:
ADMIN_NAME="Registrar" ADMIN_EMAIL=registrar@college.edu ADMIN_PASSWORD='LongPass12345' npm run create-admin
```
Passwords need 10+ characters with letters and digits. Running it for an existing email promotes that user and resets the password. Do **not** run `npm run seed` in production (it refuses unless `SEED_FORCE=true`).

## Project structure

```
server/
  app.js, server.js          Express app (helmet CSP, sessions, sanitising, CORS) / bootstrap
  config/                    env config, constants (single source of enum values), db
  models/                    User, Event, EventRegistration, Resource, Announcement,
                             LostFoundItem, Complaint, ComplaintUpdate, Club, ClubMembership, ActivityLog
  controllers/ routes/       one pair per module
  middleware/                auth (authenticate/requireAdmin), upload (Multer + magic-byte check), security, error
  utils/                     validate (whitelist validator), helpers (pagination, search), files, activity log
public/                      landing, login, register, help, 403/404, app.html (SPA shell)
  js/pages/, js/pages/admin/ one module per screen
scripts/                     seed.js, create-admin.js
tests/                       node:test suites (55 tests) against an isolated database
docs/                        API.md, DEPLOYMENT.md
```

## Security design (summary)

- bcrypt (cost 12) password hashing; generic login errors (no account enumeration); session id regenerated on login; HttpOnly + SameSite=Lax cookies (`Secure` in production); login/register/password endpoints rate-limited (20 per 15 min per IP).
- Roles enforced by backend middleware on every route. Students see 404 (not 403) for other students' private records (complaints, pending resources).
- Whitelist validation on every write (mass-assignment of `role`, `email`, `studentId` is impossible); `$`-operators and dotted keys stripped from all input; search text is regex-escaped.
- Uploads: extension + MIME allow-list, **magic-byte verification**, random server-side filenames, size limits, stored outside the web root and served only through authorised endpoints with `nosniff`. SVG/HTML are not accepted.
- Origin check on state-changing requests (CSRF defence in depth), strict CSP (scripts from `self` only), Helmet headers, CSV-injection-safe exports, errors never leak stack traces.
- Internal complaint notes are filtered at the query level and never reach student responses.

## Known limitations

- **No email delivery.** Password reset / email verification are not implemented because they need an external provider (SMTP/SendGrid). Students who forget a password must ask an admin (there is currently no admin UI to reset a student password; this is future work). This is stated honestly in the Help page.
- Uploads are stored on local disk. Hosts with ephemeral filesystems lose files on redeploy unless a persistent disk or object storage is used (see `docs/DEPLOYMENT.md`).
- Rate limiting is in-memory (per instance).
- Student-facing detail pages for admins reuse student views; there is no bulk import/export beyond participant CSV.
- The application has **not** been deployed to a live host by this project run; only local verification was done.

## Documentation
- [API reference](docs/API.md)
- [Deployment guide](docs/DEPLOYMENT.md)

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Failed to start: connect ECONNREFUSED` | MongoDB isn't running or `MONGODB_URI` is wrong |
| App refuses to start in production | Set `SESSION_SECRET` (32+ chars) and `MONGODB_URI` |
| Logged out immediately in production | Set `TRUST_PROXY=true` behind HTTPS proxy so secure cookies are accepted |
| `Too many attempts` | Auth rate limit; wait 15 min or restart the server in development |
| Seeded resource downloads 404 after wiping `uploads/` | Re-run `npm run seed` |
| Tests fail connecting | Ensure MongoDB is running; tests use `MONGODB_URI_TEST` |
