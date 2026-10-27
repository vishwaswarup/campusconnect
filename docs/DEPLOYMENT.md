# Deployment guide

> Status: **not yet deployed**. These steps are the recommended path; verify with the checklist at the end after you deploy.

Campus Connect is a single Node.js service (it serves both the API and the static frontend), plus MongoDB. Recommended: **MongoDB Atlas** (free M0 tier) + **Render** web service.

## 1. Database (MongoDB Atlas)
1. Create a free cluster, a database user, and allow your host's IP (or `0.0.0.0/0` while testing).
2. Copy the connection string: `mongodb+srv://USER:PASS@cluster.mongodb.net/campusconnect?retryWrites=true&w=majority`.

## 2. Web service (Render)
1. Push the repo to GitHub (`.env` and `uploads/` are git-ignored).
2. New → Web Service → connect repo. Build: `npm install` · Start: `npm start` · Health check path: `/api/health`.
3. Environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=<atlas string>`
   - `SESSION_SECRET=<48+ random bytes>`
   - `TRUST_PROXY=true`
   - `UPLOAD_DIR=/var/data/uploads`
   - `CORS_ORIGINS=` (empty – frontend and API share one origin)
4. **Persistent uploads:** attach a Render *Disk* (paid plan) mounted at `/var/data`. Without a disk, the filesystem is wiped on every deploy and uploaded notes/images are lost (database records would remain, files would not). Alternatives: Railway volume, a VPS, or adapting `middleware/upload.js` to S3/Cloudinary.
5. HTTPS is provided by the platform; with `NODE_ENV=production` cookies are `Secure` and HSTS/CSP headers are on.

## 3. First admin
Open the service shell (Render → Shell) and run:
```bash
ADMIN_NAME="Registrar" ADMIN_EMAIL=registrar@college.edu ADMIN_PASSWORD='<10+ chars, letters+digits>' npm run create-admin
```
Never run `npm run seed` in production.

## 4. Same-host vs split deployment
Default is one origin (no CORS). If you host the frontend elsewhere, add its origin to `CORS_ORIGINS`; cookies would then need `SameSite=None; Secure`, which requires editing `server/app.js` — the single-origin setup is strongly recommended.

## 5. Post-deploy verification checklist
- [ ] `GET https://<host>/api/health` returns `{"status":"ok"}`
- [ ] Register a test student, log in, log out
- [ ] Admin login works; student gets "Access denied" on `#/admin`
- [ ] Upload a note as a student, approve as admin, download it; redeploy and confirm the file still downloads (proves persistent storage)
- [ ] Browser console free of errors; check on a phone
Only after these pass should the deployment be considered verified.

## Other hosts
Any host that runs `node server/server.js` with the variables above works (Railway, Fly.io, a VPS with Nginx + PM2). Behind Nginx set `proxy_set_header X-Forwarded-Proto $scheme;` and `TRUST_PROXY=true`, and `client_max_body_size 12m;`.
