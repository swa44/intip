# intip

Personal notes and file storage for Vercel, backed by Cloudflare R2.

## Deploy On Vercel

1. Create a Cloudflare R2 bucket named `intip`.
2. Create an R2 API token with read/write access for the bucket.
3. In Vercel, set the project root to this folder.
4. Add environment variables:
   - `INTIP_PASSWORD`: login password
   - `INTIP_SESSION_SECRET`: long random secret for session cookies
   - `R2_ACCOUNT_ID`: Cloudflare account ID
   - `R2_ACCESS_KEY_ID`: R2 access key
   - `R2_SECRET_ACCESS_KEY`: R2 secret key
   - `R2_BUCKET_NAME`: `intip`
5. Deploy.

No build command is required.

## R2 CORS

Direct browser uploads require CORS on the R2 bucket. Allow your Vercel domain:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Local Dev

Copy `.env.example` to `.env.local`, then set your own values.

```bash
npm install
npm run dev
```

## Notes

- Password login uses only `INTIP_PASSWORD`; no ID is required.
- Session cookies are signed with `INTIP_SESSION_SECRET`.
- Notes are stored in R2 as `app/notes.json`.
- File metadata is stored in R2 as `app/files.json`.
- Uploaded files are stored under `uploads/`.
- Uploads and downloads use signed R2 URLs, so large files do not pass through Vercel Functions.
