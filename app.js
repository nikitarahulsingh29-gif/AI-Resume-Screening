const form = document.querySelector("#screenForm");
const message = document.querySelector("#formMessage");
const fileInput = document.querySelector("#resumeFile");
const fileName = document.querySelector("#fileName");
const resultSection = document.querySelector("#resultSection");
const submitButton = form.querySelector("button[type=submit]");

fileInput.addEventListener("change", () => {
  fileName.textContent = fileInput.files[0]?.name || "No file selected";
});

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function renderChips(container, items, emptyText) {
  container.replaceChildren();
  if (!items?.length) {
    const span = document.createElement("span");
    span.className = "small-note";
    span.textContent = emptyText;
    container.append(span);
    return;
  }
  items.forEach(item => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = item;
    container.append(span);
  });
}

function renderResult(data) {
  const c = data.candidate;
  document.querySelector("#resultName").textContent = c.full_name;
  document.querySelector("#resultJob").textContent = c.job_title;
  document.querySelector("#scoreValue").textContent = data.result.score;
  document.querySelector("#resultSummary").textContent =
    `${data.result.matched.length} matched keyword(s). This is a basic text overlap signal, not a measure of candidate quality. ${data.saved ? "Saved to Supabase." : "Not saved to Supabase."}`;
  renderChips(document.querySelector("#matchedList"), data.result.matched, "No overlapping keywords found.");
  renderChips(document.querySelector("#missingList"), data.result.missing, "No job-description terms to compare.");
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  message.className = "message";
  submitButton.disabled = true;
  submitButton.textContent = "Screening…";
  try {
    const body = new FormData(form);
    const data = await api("/api/screen", { method: "POST", body });
    renderResult(data);
    message.textContent = data.notice || "Screening complete.";
    await loadCandidates();
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Screen resume <span aria-hidden="true">→</span>';
  }
});

async function loadCandidates() {
  const tbody = document.querySelector("#candidateRows");
  try {
    const data = await api("/api/candidates");
    tbody.replaceChildren();
    if (!data.candidates.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "empty";
      td.textContent = data.configured ? "No saved screenings yet." : "Configure Supabase to store and view candidate records.";
      tr.append(td); tbody.append(tr); return;
    }
    data.candidates.forEach(c => {
      const tr = document.createElement("tr");
      [c.full_name, c.job_title, `${c.screening_score}%`, null, new Date(c.created_at).toLocaleDateString()].forEach((value, i) => {
        const td = document.createElement("td");
        if (i === 3) {
          const span = document.createElement("span");
          span.className = "status";
          span.textContent = "Review required";
          td.append(span);
        } else td.textContent = value ?? "—";
        tr.append(td);
      });
      tbody.append(tr);
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Could not load candidate records.</td></tr>';
  }
}

document.querySelector("#refreshBtn").addEventListener("click", loadCandidates);
api("/api/health").then(data => {
  document.querySelector("#apiStatus").textContent = data.supabaseConfigured ? "Server connected · Supabase ready" : "Server online · Supabase not configured";
}).catch(() => {
  document.querySelector("#apiStatus").textContent = "Server not reachable";
});
loadCandidates();
