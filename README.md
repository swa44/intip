# intip

Personal notes and file storage for Cloudflare Pages.

## Deploy

1. Create a Cloudflare R2 bucket named `intip`.
2. In Cloudflare Pages, set the project root to this folder.
3. Set build output directory to `public`.
4. Add the R2 binding:
   - Binding name: `INTIP_BUCKET`
   - Bucket: `intip`
5. Add environment variables:
   - `INTIP_PASSWORD`: login password
   - `INTIP_SESSION_SECRET`: long random secret for session cookies

No build command is required. If using Wrangler:

```bash
npm install
npm run deploy
```

## Local Dev

Copy `.dev.vars.example` to `.dev.vars`, then set your own values.

```bash
npm install
npm run dev
```

Open the local URL printed by Wrangler.

## Notes

- Password login uses only `INTIP_PASSWORD`; no ID is required.
- Session cookies are signed with `INTIP_SESSION_SECRET`.
- Notes are stored in R2 as `app/notes.json`.
- File metadata is stored in R2 as `app/files.json`.
- Uploaded files are stored under `uploads/`.
