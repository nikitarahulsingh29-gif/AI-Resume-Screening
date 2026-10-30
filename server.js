require("dotenv").config();
const express = require("express");
const path = require("path");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|txt)$/i.test(file.originalname);
    cb(allowed ? null : new Error("Upload a PDF, DOC, DOCX, or TXT file."), allowed);
  }
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const supabaseReady = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = supabaseReady
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null;

function tokenize(value = "") {
  return [...new Set(value.toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) || [])];
}

// Transparent baseline scorer. It compares terms only; it is not an AI model.
function scoreResume(resumeText, jobDescription) {
  const jobTerms = tokenize(jobDescription).filter(t => !new Set([
    "with", "from", "that", "this", "have", "will", "your", "you", "and",
    "the", "for", "are", "our", "who", "can", "all", "into", "years"
  ]).has(t));
  const resumeTerms = new Set(tokenize(resumeText));
  const matched = [...new Set(jobTerms)].filter(term => resumeTerms.has(term));
  const missing = [...new Set(jobTerms)].filter(term => !resumeTerms.has(term)).slice(0, 12);
  const score = jobTerms.length ? Math.round((matched.length / new Set(jobTerms).size) * 100) : 0;
  return { score: Math.min(100, score), matched: matched.slice(0, 20), missing };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, supabaseConfigured: supabaseReady });
});

app.post("/api/screen", upload.single("resumeFile"), async (req, res) => {
  try {
    const { candidateName, candidateEmail, jobTitle, jobDescription, resumeText } = req.body;
    if (!candidateName?.trim() || !jobTitle?.trim() || !jobDescription?.trim() || !resumeText?.trim()) {
      return res.status(400).json({ error: "Name, job title, job description, and resume text are required." });
    }
    const result = scoreResume(resumeText, jobDescription);
    const candidate = {
      full_name: candidateName.trim(),
      email: candidateEmail?.trim() || null,
      job_title: jobTitle.trim(),
      resume_text: resumeText.trim(),
      screening_score: result.score,
      matched_keywords: result.matched,
      missing_keywords: result.missing,
      status: "review_required"
    };

    if (supabaseReady) {
      const { data, error } = await supabase.from("candidates").insert(candidate).select(
        "id, full_name, email, job_title, screening_score, matched_keywords, missing_keywords, status, created_at"
      ).single();
      if (error) {
        console.error("Supabase insert failed:", error.message);
        return res.status(500).json({ error: "Could not save candidate. Check your Supabase schema and server environment." });
      }
      return res.json({ candidate: data, result, saved: true });
    }
    return res.json({
      candidate: { ...candidate, id: `demo-${Date.now()}`, created_at: new Date().toISOString() },
      result,
      saved: false,
      notice: "Supabase is not configured; result was not persisted."
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: "Resume file is too large (5 MB max)." });
    }
    console.error(error);
    res.status(500).json({ error: error.message || "Unexpected server error." });
  }
});

app.get("/api/candidates", async (_req, res) => {
  if (!supabaseReady) return res.json({ candidates: [], configured: false });
  const { data, error } = await supabase.from("candidates")
    .select("id, full_name, email, job_title, screening_score, matched_keywords, missing_keywords, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: "Could not load candidates." });
  res.json({ candidates: data, configured: true });
});

app.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ error: err.message || "Invalid request." });
});

app.listen(port, () => console.log(`AI Resume Screening demo running at http://localhost:${port}`));
