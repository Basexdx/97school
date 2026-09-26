# Cloudflare deployment

The production build is a static Next.js export served from Workers Static Assets.
The same Worker handles `/api/*` and uses the D1 binding named `DB`, so the browser
and API stay on one origin and the existing `SameSite=Strict` session cookies work.

## First deployment

1. Create a D1 database named `genius-db` in the Cloudflare dashboard or with
   `npx wrangler d1 create genius-db`.
2. Copy its database ID into `wrangler.jsonc` in the `d1_databases` entry. Keep the
   database ID in configuration; never put secret values there.
3. Apply the schema and task tracking tables:

   ```sh
   npx wrangler d1 execute genius-db --remote --file=cloudflare/schema.sql
   npx wrangler d1 execute genius-db --remote --file=cloudflare/task-bank.sql
   ```

4. Set the Worker secrets using Wrangler's interactive prompts. Use unique,
   randomly generated values and do not commit them:

   ```sh
   npx wrangler secret put TEACHER_ACCESS_SECRET
   npx wrangler secret put RATE_LIMIT_SECRET
   ```

5. Build and deploy:

   ```sh
   npm ci
   npm run build:cloudflare
   npx wrangler deploy
   ```

Wrangler deploys the Worker and the `out/` static site together. Requests under
`/api/*` reach the Worker; other existing files are served as static assets.

## Local preview

After creating the local D1 database and running the local schema scripts, run
`npm run build:cloudflare`, then `npx wrangler dev`. Local secrets belong in
`.dev.vars`, which is ignored by Git.

The current account binding ID in `wrangler.jsonc` is a placeholder. Replace it
with the ID from the Cloudflare account before applying remote migrations or
deploying. Never use a production database for local previews.
