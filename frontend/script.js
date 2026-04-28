// ================================
// ElevareYou — script.js
// ================================
const API = "http://localhost:8000";

// State
const state = {
  resumeTab: "pdf", jobTab: "pdf",
  resumeFile: null, jobFile: null,
  analysisData: null
};

// ── Tab switching ────────────────────────────────────────────────
function switchTab(panel, tab) {
  if (panel === "resume") {
    state.resumeTab = tab;
    document.getElementById("rTabPdf").classList.toggle("active", tab === "pdf");
    document.getElementById("rTabText").classList.toggle("active", tab === "text");
    document.getElementById("rPdfZone").style.display = tab === "pdf" ? "flex" : "none";
    document.getElementById("rTextZone").style.display = tab === "text" ? "block" : "none";
  } else {
    state.jobTab = tab;
    document.getElementById("jTabPdf").classList.toggle("active", tab === "pdf");
    document.getElementById("jTabText").classList.toggle("active", tab === "text");
    document.getElementById("jPdfZone").style.display = tab === "pdf" ? "flex" : "none";
    document.getElementById("jTextZone").style.display = tab === "text" ? "block" : "none";
  }
}

// ── File handling ────────────────────────────────────────────────
function handleFile(event, panel) { setFile(event.target.files[0], panel); }

function handleDrop(event, panel) {
  event.preventDefault();
  getDz(panel).classList.remove("dragging");
  const file = event.dataTransfer.files[0];
  if (file) setFile(file, panel);
}
function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("dragging");
}
function handleDragLeave(event) { event.currentTarget.classList.remove("dragging"); }

function setFile(file, panel) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) { showError("Only PDF files are supported."); return; }
  if (file.size > 5 * 1024 * 1024) { showError("PDF too large — max 5MB."); return; }

  if (panel === "resume") {
    state.resumeFile = file;
    document.getElementById("rFileName").textContent = file.name;
    document.getElementById("rDzSuccess").style.display = "flex";
    document.getElementById("rDzBody").style.display = "none";
    getDz("resume").classList.add("has-file");
  } else {
    state.jobFile = file;
    document.getElementById("jFileName").textContent = file.name;
    document.getElementById("jDzSuccess").style.display = "flex";
    document.getElementById("jDzBody").style.display = "none";
    getDz("job").classList.add("has-file");
  }
}

function clearFile(event, panel) {
  event.stopPropagation();
  if (panel === "resume") {
    state.resumeFile = null;
    document.getElementById("rFileName").textContent = "";
    document.getElementById("rDzSuccess").style.display = "none";
    document.getElementById("rDzBody").style.display = "flex";
    document.getElementById("rPdfInput").value = "";
    getDz("resume").classList.remove("has-file");
  } else {
    state.jobFile = null;
    document.getElementById("jFileName").textContent = "";
    document.getElementById("jDzSuccess").style.display = "none";
    document.getElementById("jDzBody").style.display = "flex";
    document.getElementById("jPdfInput").value = "";
    getDz("job").classList.remove("has-file");
  }
}

function getDz(panel) {
  return document.getElementById(panel === "resume" ? "rPdfZone" : "jPdfZone");
}

// ── Char counters ────────────────────────────────────────────────
document.getElementById("rTextInput").addEventListener("input", function () {
  document.getElementById("rCharCount").textContent = this.value.length.toLocaleString() + " characters";
});
document.getElementById("jTextInput").addEventListener("input", function () {
  document.getElementById("jCharCount").textContent = this.value.length.toLocaleString() + " characters";
});

// ── Loading steps ────────────────────────────────────────────────
let stepTimer = null;
function startLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
  const steps = ["ls1","ls2","ls3","ls4"];
  let i = 0;
  steps.forEach(s => {
    const el = document.getElementById(s);
    el.classList.remove("active","done");
  });
  document.getElementById(steps[0]).classList.add("active");
  document.getElementById("lProgressFill").style.width = "5%";

  stepTimer = setInterval(() => {
    if (i < steps.length - 1) {
      document.getElementById(steps[i]).classList.remove("active");
      document.getElementById(steps[i]).classList.add("done");
      i++;
      document.getElementById(steps[i]).classList.add("active");
      document.getElementById("lProgressFill").style.width = ((i+1)/steps.length*90) + "%";
    }
  }, 3800);
}
function stopLoading() {
  clearInterval(stepTimer);
  ["ls1","ls2","ls3","ls4"].forEach(s => {
    document.getElementById(s).classList.remove("active");
    document.getElementById(s).classList.add("done");
  });
  document.getElementById("lProgressFill").style.width = "100%";
  setTimeout(() => { document.getElementById("loadingOverlay").style.display = "none"; }, 400);
}

// ── Error ────────────────────────────────────────────────────────
function showError(msg) {
  const bar = document.getElementById("errorBar");
  document.getElementById("errorMsg").textContent = msg;
  bar.style.display = "flex";
  setTimeout(() => { bar.style.display = "none"; }, 6000);
}

// ── Main analysis ────────────────────────────────────────────────
async function runAnalysis() {
  const btn = document.getElementById("analyzeBtn");
  document.getElementById("errorBar").style.display = "none";

  // Validate resume
  const resumeText = document.getElementById("rTextInput").value.trim();
  if (state.resumeTab === "pdf" && !state.resumeFile) {
    showError("Please upload a resume PDF or switch to 'Paste Text'."); return;
  }
  if (state.resumeTab === "text" && !resumeText) {
    showError("Please paste your resume text."); return;
  }

  // Validate job
  const jobText = document.getElementById("jTextInput").value.trim();
  if (state.jobTab === "pdf" && !state.jobFile) {
    showError("Please upload a job description PDF or switch to 'Paste Text'."); return;
  }
  if (state.jobTab === "text" && !jobText) {
    showError("Please paste the job description."); return;
  }

  btn.disabled = true;
  startLoading();

  try {
    let response;

    // Both PDF
    if ((state.resumeTab === "pdf" && state.resumeFile) || (state.jobTab === "pdf" && state.jobFile)) {
      const form = new FormData();
      if (state.resumeFile) form.append("resume_pdf", state.resumeFile);
      else form.append("resume_text", resumeText);
      if (state.jobFile) form.append("job_pdf", state.jobFile);
      else form.append("job_text", jobText);
      form.append("user_id", "anonymous");

      response = await fetch(`${API}/analyze-pdf`, { method: "POST", body: form });
    } else {
      response = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: resumeText, job_description: jobText })
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${response.status}`);
    }

    state.analysisData = await response.json();
    stopLoading();

    setTimeout(() => {
      showResults(state.analysisData);
    }, 500);

  } catch (err) {
    stopLoading();
    showError(err.message || "Failed to connect. Make sure the backend is running on localhost:8000.");
  } finally {
    btn.disabled = false;
  }
}

// ── Page navigation ──────────────────────────────────────────────
function showResults(data) {
  renderResults(data);
  document.getElementById("page-input").style.display = "none";
  document.getElementById("page-results").style.display = "flex";
  document.getElementById("rBody").classList.add("fade-in");
  window.scrollTo(0, 0);
}

function goBack() {
  document.getElementById("page-results").style.display = "none";
  document.getElementById("page-input").style.display = "flex";
  window.scrollTo(0, 0);
}

// ── Download Report ──────────────────────────────────────────────
function downloadReport() {
  if (!state.analysisData) return;
  const d = state.analysisData;
  const m = d.match_result || {};
  const l = d.learning_path || {};
  const j = d.job_analysis || {};

  const lines = [
    "ELEVAREYOU — CAREER ANALYSIS REPORT",
    "=====================================",
    `Date: ${new Date().toLocaleDateString("en-GB", {year:"numeric",month:"long",day:"numeric"})}`,
    `Role: ${j.role_title || "N/A"}`,
    "",
    "MATCH SCORE",
    "-----------",
    `Overall: ${m.match_score || 0}/100`,
    `Recommendation: ${m.recommendation || "N/A"}`,
    "",
    "SCORE BREAKDOWN",
    "---------------",
    `Skills Match: ${m.score_breakdown?.skills_match || 0}/40`,
    `Experience: ${m.score_breakdown?.experience_match || 0}/25`,
    `Technologies: ${m.score_breakdown?.technology_match || 0}/20`,
    `Seniority Fit: ${m.score_breakdown?.seniority_match || 0}/15`,
    "",
    "AI SUMMARY",
    "----------",
    m.summary || "",
    "",
    "WHY THIS SCORE",
    "--------------",
    m.explanation?.why_score || "",
    "",
    "BIGGEST STRENGTH",
    "----------------",
    m.explanation?.biggest_strength || "",
    "",
    "TOP CONCERN",
    "-----------",
    m.explanation?.top_concern || "",
    "",
    "STRONG MATCHES",
    "--------------",
    ...(m.strong_matches || []).map(s => `• ${s}`),
    "",
    "MISSING SKILLS",
    "--------------",
    ...(m.missing_skills || []).map(s =>
      typeof s === "object"
        ? `• [${s.criticality?.toUpperCase()}] ${s.skill} — ${s.reason}`
        : `• ${s}`
    ),
    "",
    "RISK AREAS",
    "----------",
    ...(m.risk_areas || []).map(r => `• ${r}`),
    "",
    "TRANSFERABLE SKILLS",
    "-------------------",
    ...(m.transferable_skills || []).map(s => `• ${s}`),
    "",
    "IMMEDIATE ACTIONS",
    "-----------------",
    ...(l.immediate_actions || []).map((a,i) => `${i+1}. ${a.action} (${a.time_estimate || ""})\n   ${a.reason || ""}`),
    "",
    "LEARNING PHASES",
    "---------------",
    ...(l.learning_phases || []).map(p =>
      `Phase ${p.phase}: ${p.title} [${p.level}] — ${p.duration}\n  Skills: ${(p.skills_to_learn||[]).join(", ")}\n  Milestone: ${p.milestone || ""}`
    ),
    "",
    "PORTFOLIO PROJECTS",
    "------------------",
    ...(l.portfolio_projects || []).map(p =>
      `• ${p.project_title}\n  ${p.description}\n  Impact: ${p.impact || ""}`
    ),
    "",
    "TIMELINE TO JOB-READY",
    "---------------------",
    l.timeline_to_job_ready || "N/A",
    "",
    "---",
    "Generated by ElevareYou — Career Intelligence Platform",
    "Powered by Groq AI · elevareyou.app"
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ElevareYou_Report_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Render results ───────────────────────────────────────────────
function renderResults(data) {
  const m = data.match_result || {};
  const l = data.learning_path || {};
  const j = data.job_analysis || {};

  renderScore(m, j);
  renderBreakdown(m.score_breakdown || {});
  renderSummary(m);
  renderStrong(m.strong_matches || []);
  renderMissing(m.missing_skills || []);
  renderRisks(m.risk_areas || []);
  renderTransfer(m.transferable_skills || []);
  renderRoadmap(l);
  renderInterview(l.interview_prep || []);
}

function renderScore(m, j) {
  const score = m.match_score || 0;
  const numEl = document.getElementById("rShNumber");
  const ringNum = document.getElementById("rshRingNum");
  const fill = document.getElementById("rsrFill");
  const badge = document.getElementById("rShBadge");

  // Animate counter
  let cur = 0;
  const iv = setInterval(() => {
    cur = Math.min(cur + 2, score);
    numEl.textContent = cur;
    ringNum.textContent = cur;
    if (cur >= score) clearInterval(iv);
  }, 18);

  // Ring: circumference = 2π*66 = 414.69
  const circ = 414.69;
  const offset = circ - (score / 100) * circ;
  setTimeout(() => {
    fill.style.strokeDashoffset = offset;
    if (score >= 75) fill.style.stroke = "#16a34a";
    else if (score >= 50) fill.style.stroke = "#d97706";
    else fill.style.stroke = "#dc2626";
  }, 100);

  // Badge
  const recMap = {
    "apply-confidently": ["Apply Confidently ✓", "green"],
    "apply-with-preparation": ["Apply With Prep 📋", "amber"],
    "significant-gaps": ["Significant Gaps ⚠️", "red"],
    "not-recommended": ["Not Recommended ✗", "red"],
  };
  const [label, cls] = recMap[m.recommendation] || [m.recommendation || "—", "blue"];
  badge.textContent = label;
  badge.className = `rsh-badge ${cls}`;

  const roleEl = document.getElementById("rShRole");
  if (j.role_title) roleEl.textContent = `vs. ${j.role_title}`;
}

function renderBreakdown(bd) {
  const el = document.getElementById("rBreakdown");
  const items = [
    { label: "Skills Match", key: "skills_match", max: 40 },
    { label: "Experience", key: "experience_match", max: 25 },
    { label: "Technologies", key: "technology_match", max: 20 },
    { label: "Seniority Fit", key: "seniority_match", max: 15 },
  ];
  el.innerHTML = items.map(it => {
    const val = bd[it.key] || 0;
    const pct = Math.round((val / it.max) * 100);
    return `<div class="bd-item">
      <div class="bd-label">${it.label}</div>
      <div class="bd-track"><div class="bd-fill" data-pct="${pct}"></div></div>
      <div class="bd-score">${val}/${it.max}</div>
    </div>`;
  }).join("");
  setTimeout(() => {
    el.querySelectorAll(".bd-fill").forEach(f => { f.style.width = f.dataset.pct + "%"; });
  }, 100);
}

function renderSummary(m) {
  document.getElementById("rSummaryText").textContent = m.summary || "";
  const exp = m.explanation || {};
  const el = document.getElementById("rExplain");
  el.innerHTML = [
    { label: "Why This Score", text: exp.why_score },
    { label: "Biggest Strength", text: exp.biggest_strength },
    { label: "Top Concern", text: exp.top_concern }
  ].filter(x => x.text).map(x => `
    <div class="re-item">
      <div class="re-label">${x.label}</div>
      <div class="re-text">${esc(x.text)}</div>
    </div>`).join("");
}

function renderStrong(skills) {
  document.getElementById("rStrong").innerHTML = skills.length
    ? skills.map(s => `<span class="r-tag green">${esc(s)}</span>`).join("")
    : '<span class="r-tag">None identified</span>';
}

function renderMissing(skills) {
  const el = document.getElementById("rMissing");
  if (!skills.length) { el.innerHTML = '<p style="color:var(--ink-4);font-size:13px;padding:8px 0;">No critical missing skills identified.</p>'; return; }
  el.innerHTML = skills.map(s => {
    const name = typeof s === "string" ? s : s.skill;
    const crit = typeof s === "object" ? s.criticality : "important";
    const reason = typeof s === "object" ? s.reason : "";
    return `<div class="r-skill-item">
      <span class="r-skill-badge badge-${crit}">${crit}</span>
      <div>
        <div class="r-skill-name">${esc(name)}</div>
        ${reason ? `<div class="r-skill-reason">${esc(reason)}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

function renderRisks(risks) {
  const el = document.getElementById("rRisks");
  el.innerHTML = risks.length
    ? risks.map(r => `<li>${esc(r)}</li>`).join("")
    : '<li style="color:var(--ink-4)">No major risk areas identified.</li>';
}

function renderTransfer(skills) {
  document.getElementById("rTransfer").innerHTML = skills.length
    ? skills.map(s => `<span class="r-tag blue">${esc(s)}</span>`).join("")
    : '<span class="r-tag">None identified</span>';
}

function renderRoadmap(l) {
  // Immediate actions
  const actions = l.immediate_actions || [];
  const imm = document.getElementById("rImmediate");
  if (actions.length) {
    imm.innerHTML = `<div class="r-imm-title">This Week — Take Action Now</div>
    <div class="r-imm-grid">${actions.map((a, i) => `
      <div class="r-imm-item">
        <div class="r-imm-num">${i+1}</div>
        <div>
          <div class="r-imm-action">${esc(a.action)}</div>
          <div class="r-imm-reason">${esc(a.reason || "")}</div>
          ${a.time_estimate ? `<div class="r-imm-time">⏱ ${esc(a.time_estimate)}</div>` : ""}
        </div>
      </div>`).join("")}
    </div>`;
  }

  // Phases
  const phases = l.learning_phases || [];
  const ph = document.getElementById("rPhases");
  if (phases.length) {
    ph.innerHTML = `<div class="r-phases-title">Learning Phases</div>${phases.map(p => {
      const levelCls = `level-${(p.level||"beginner").toLowerCase()}`;
      const resources = (p.resources||[]).map(r => `
        <div class="r-resource">
          <span class="r-res-type">${esc(r.type||"")}</span>
          <div>
            <div class="r-res-title">${esc(r.title||"")}</div>
            <div class="r-res-why">${esc(r.why||"")}</div>
          </div>
        </div>`).join("");
      return `<div class="r-phase">
        <div class="r-phase-hdr">
          <div class="r-phase-num">${p.phase}</div>
          <div>
            <div class="r-phase-title">${esc(p.title||"")}</div>
            <div class="r-phase-meta">
              <span class="r-level-badge ${levelCls}">${p.level||""}</span>
              <span class="r-phase-dur">📅 ${esc(p.duration||"")}</span>
            </div>
          </div>
        </div>
        <div class="r-phase-skills">${(p.skills_to_learn||[]).map(s=>`<span class="r-tag purple">${esc(s)}</span>`).join("")}</div>
        ${resources}
        ${p.milestone ? `<div class="r-milestone">${esc(p.milestone)}</div>` : ""}
      </div>`;
    }).join("")}`;
  }

  // Portfolio
  const projects = l.portfolio_projects || [];
  const port = document.getElementById("rPortfolio");
  if (projects.length) {
    port.innerHTML = `<div class="r-portfolio-title">Portfolio Projects</div>
    <div class="r-portfolio-grid">${projects.map(p => `
      <div class="r-portfolio-item">
        <div class="r-port-title">${esc(p.project_title||"")}</div>
        <div class="r-port-desc">${esc(p.description||"")}</div>
        <div class="r-phase-skills">${(p.skills_demonstrated||[]).map(s=>`<span class="r-tag">${esc(s)}</span>`).join("")}</div>
        ${p.impact ? `<div class="r-port-impact">${esc(p.impact)}</div>` : ""}
      </div>`).join("")}
    </div>`;
  }

  // Timeline
  const tl = document.getElementById("rTimeline");
  if (l.timeline_to_job_ready) {
    tl.innerHTML = `
      <div class="r-timeline-icon">🗓</div>
      <div>
        <div class="r-timeline-label">Estimated Time to Job-Ready</div>
        <div class="r-timeline-value">${esc(l.timeline_to_job_ready)}</div>
      </div>`;
  }
}

function renderInterview(tips) {
  const block = document.getElementById("rInterviewBlock");
  const list = document.getElementById("rInterview");
  if (!tips || !tips.length) { block.style.display = "none"; return; }
  block.style.display = "block";
  list.innerHTML = tips.map(t => `<li>${esc(t)}</li>`).join("");
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
