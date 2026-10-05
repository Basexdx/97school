# Student access and avatars

The landing screen retains the seasonal artwork and slogan. Student entry opens a separate code screen. All access uses the existing Worker API: `student/access/request`, `student/access/status`, teacher connection approvals, and persistent HttpOnly sessions. No demo code or frontend approval grants access.

After approval, an unfinished profile chooses an avatar group locally, then one of six portraits. The two supplied original PNG sheets are preserved in `public/avatars/`. `shared/student-avatars.mjs` defines twelve stable IDs and crop coordinates; the inline SVG component renders the same source artwork at every size. Group choice is only an unfinished browser-tab draft; gender is not stored on the server.

`POST /api/student/profile` accepts an authenticated student and a whitelisted `avatarId`. The additive, idempotent `student_profiles` table stores `student_id`, `avatar_id`, `profile_setup_completed=1`, and `updated_at`. Saving does not create a student. Existing SQLite installations apply this table on API startup through the existing schema loader. D1 deployments must apply the updated `cloudflare/schema.sql` before deploying this Worker.

`student/me` and approval responses return `avatarId` and `profileSetupCompleted`. Server data decides whether setup is required. Completed profiles skip setup after refresh, logout and recovery, or a new-device key tied to their existing student ID. Profile, sidebar, and home card share one server-backed student state. Avatar editing shows all twelve choices.

Student cookies have HttpOnly, SameSite=Strict, Secure on HTTPS, and Max-Age=30 days by default (`STUDENT_SESSION_DAYS` is configurable). Tokens are hashed in `student_sessions`, checked for expiry and revocation, and revoked on logout. An expired session requires teacher-approved reauthentication but retains the saved avatar. Recovery/new-device keys are restricted to an active student in the teacher-owned class. Concurrent approvals cannot create duplicate students.

Refresh restores the current authenticated section, pending request, or unfinished avatar draft. Saved browser state alone never grants access. Pending status is checked every three seconds with serialized requests and an abort on unmount. Network errors remain visible and polling resumes; rejection and expiry allow code retry.

Book spine labels use original image coordinates (1672×941) inside the same SVG as the seasonal background. Mobile uses a right-aligned crop, with text and books sharing the transform. Seasonal leaves and snow retain the existing animations.

Native builds require the existing `GENIUS_API_ORIGIN` GitHub secret (`NEXT_PUBLIC_GENIUS_API_ORIGIN` at build time) to point to the HTTPS API. Android uses CapacitorHttp's native fetch transport. Windows uses a same-origin loopback API proxy and the app's persistent Electron cookie store; the external API connection uses TLS, and HttpOnly cookies never pass through application JavaScript. Static builds write the public API origin to `out/native-api.json`; no credentials are packaged.

Validation: server flow and session tests, rejected/expired/used codes, duplicate approval, avatar persistence/editing/recovery, refresh routing, authentication gating, desktop proxy, full task-bank regression tests, SQL checks, Next web/static and API builds. Portraits and book labels were rendered separately for visual inspection. Live viewport interaction could not be checked because the available cloud browser rejected the local preview URL; no installed-device runtime claim is made.
