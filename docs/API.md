# Campus Connect REST API

Base path `/api`. Session cookie (`cc.sid`) authentication. JSON in/out; file endpoints use `multipart/form-data`.
Responses: `{ "success": true, "data": ..., "meta": {page,limit,total,pages} }` or `{ "success": false, "message": "...", "errors": {field: msg} }`.
Status codes: 200/201 success · 400 validation · 401 not logged in · 403 forbidden · 404 not found (also used to hide private records) · 409 conflict/duplicate/full · 413 file too large · 429 rate limited.
List endpoints accept `page`, `limit` (max 50) and the filters shown. 🔒 = admin only.

## Auth & profile
| Method & path | Description |
|---|---|
| GET `/health` | Health check |
| GET `/meta/options` | Enumerations (departments, categories, statuses) |
| POST `/auth/register` | name, email, studentId, department, course, year, password, confirmPassword → creates **student** |
| POST `/auth/login` · POST `/auth/logout` | email, password |
| GET `/auth/me` (401 if logged out) · GET `/auth/session` (200, `data:null` if logged out) | Current user |
| PATCH `/me` | name, department, course, year, phone, bio (email/studentId/role not editable) |
| POST `/me/password` | currentPassword, newPassword, confirmPassword |
| POST `/me/avatar` | multipart `image` (jpg/png/webp ≤3MB) |
| GET `/users/:id/avatar` | Avatar image (login required) |
| GET `/me/summary` · GET `/dashboard` | Profile activity / student dashboard data |

## Events
GET `/events?q&category&when=upcoming|past|all&status(admin)` · GET `/events/mine` · GET `/events/:id` · POST `/events/:id/register` · DELETE `/events/:id/register`
🔒 POST `/events` · PUT `/events/:id` · DELETE `/events/:id` · GET `/events/:id/participants[?format=csv]`
Rules: no duplicate registration (unique index), closed after deadline (default: start time), atomic capacity check, cancel until start. Students only see `published`.

## Resources (notes)
GET `/resources?q&department&semester&subject&category&status(admin)` · GET `/resources/mine` · GET `/resources/:id` · GET `/resources/:id/download` · POST `/resources` (multipart `file` + title, subject, department, semester, category, description; student uploads → `pending`) · PUT `/resources/:id` (admin, or owner while pending) · DELETE `/resources/:id` (admin, or owner if not approved)
🔒 PATCH `/resources/:id/review` `{status: approved|rejected|pending, reviewNote}` (reason required to reject)
Allowed files: pdf, doc, docx, ppt, pptx, xlsx, txt ≤10MB. Non-approved resources are visible/downloadable only to owner and admins.

## Announcements
GET `/announcements?q&category&department` · GET `/announcements/:id` — students see only published, already-live, unexpired items targeted to everyone or their department.
🔒 POST · PUT `/announcements/:id` · PATCH `/announcements/:id/pin` (toggle) · DELETE.

## Lost & Found
GET `/lostfound?q&type&category&status&flagged(admin)` · GET `/lostfound/mine` · GET `/lostfound/:id` · GET `/lostfound/:id/image` · POST `/lostfound` (multipart, optional `image`) · PUT `/lostfound/:id` (owner/admin) · PATCH `/lostfound/:id/status` `{status: open|recovered}` (owner/admin) · POST `/lostfound/:id/flag` `{reason}` · DELETE `/lostfound/:id` (owner/admin)
🔒 DELETE `/lostfound/:id/flag`. Contact info is returned only to the reporter, admins, or when the reporter opted in (`showContact`).

## Complaints
GET `/complaints?q&status&category` (students: own only; admins: all, + `priority`, `sort=priority`) · POST `/complaints` (multipart, optional `attachment`) · GET `/complaints/:id` → `{complaint, history}` (internal notes only for admins) · GET `/complaints/:id/attachment` · POST `/complaints/:id/messages` `{message, internal?}` (students: follow-up while unresolved; admins: reply or internal note) · POST `/complaints/:id/reopen` `{message}` (owner, within 30 days of resolution)
🔒 PATCH `/complaints/:id` `{status, priority, category, assignedTo, message}` — lifecycle: submitted → under_review → in_progress → resolved; every change is recorded in history.

## Clubs
GET `/clubs?q&category&active(admin)` · GET `/clubs/:id` · POST `/clubs/:id/join` `{message}` · DELETE `/clubs/:id/join` (withdraw) · GET `/clubs/memberships/mine`
🔒 POST `/clubs` · PUT `/clubs/:id` · DELETE `/clubs/:id` · GET `/clubs/memberships?status&club` · PATCH `/clubs/memberships/:id` `{status: approved|rejected}`

## Admin
🔒 GET `/admin/stats` (database-backed counts and chart data) · GET `/admin/users?q&role&active&department` · PATCH `/admin/users/:id` (name, department, course, year, active — never role) · GET `/admin/activity`
