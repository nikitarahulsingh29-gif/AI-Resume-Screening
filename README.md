# AI Resume Screening (Demo Project)

A starter project with HTML/CSS/JS frontend, Node.js/Express backend, and Supabase PostgreSQL schema.

## Features
- Enter a job description and candidate details.
- Upload a resume file (PDF/DOC/DOCX/TXT) as a demo attachment.
- Demo scoring uses transparent keyword overlap, not a real AI model.
- Store candidates and screening results in Supabase.
- Review results in a simple dashboard.

> Responsible use: this is a decision-support demo, not an automated hiring decision system. Do not use scores as the sole basis for hiring. Validate the system for bias, accessibility, privacy, and job-relatedness. This demo does not parse the contents of uploaded files; it scores the pasted resume text.

## Requirements
- Node.js 18+
- A Supabase project

## Setup
1. Extract the ZIP and open a terminal in this folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. In Supabase SQL Editor, run `supabase/schema.sql`.
4. Copy `.env.example` to `.env` and fill in your Supabase URL and **service role key**.
   - The service role key is secret. Keep `.env` out of Git and never put it in frontend code.
5. Start the server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000

## Notes
- `SUPABASE_SERVICE_ROLE_KEY` is only used on the server. For production, prefer a carefully designed RLS policy and a least-privilege access pattern.
- Uploads are kept in browser memory for this demo and are not stored. Paste resume text into the text area for screening.
- The sample keyword scorer is deliberately simple and explainable. Replace `scoreResume()` with a validated model/service if needed, and document its limitations.
