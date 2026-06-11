const BASE_URL = "https://ai-integration-app.vercel.app";

let selectedSubject = "Economics";
let selectedMode = "socratic";

// Subject buttons
document.querySelectorAll(".subject-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".subject-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSubject = btn.dataset.subject;
  });
});

// Mode buttons
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMode = btn.dataset.mode;
  });
});

// Capture selected text from page
document.getElementById("capture-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: () => window.getSelection().toString(),
      },
      (results) => {
        const text = results?.[0]?.result?.trim();
        if (text) {
          document.getElementById("answer").value = text;
        }
      }
    );
  });
});

function setLoading(show, text = "Processing...") {
  document.getElementById("loading").style.display = show ? "block" : "none";
  document.getElementById("loading").textContent = text;
}

function setError(msg) {
  const el = document.getElementById("error");
  el.style.display = msg ? "block" : "none";
  el.textContent = msg;
}

function scoreColor(s) {
  return s >= 4 ? "green" : s >= 3 ? "yellow" : "red";
}

// Study Mode
document.getElementById("study-btn").addEventListener("click", async () => {
  const question = document.getElementById("question").value.trim();
  if (!question) { setError("Please enter a question first."); return; }
  setError("");
  setLoading(true, "Thinking...");

  try {
    const res = await fetch(`${BASE_URL}/api/study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, subject: selectedSubject, mode: selectedMode }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.text) {
      document.getElementById("study-text").textContent = data.text;
      document.getElementById("study-result").style.display = "block";
    } else {
      setError(data.error || "Study mode failed.");
    }
  } catch {
    setLoading(false);
    setError("Request failed.");
  }
});

// Trust Check
document.getElementById("trust-btn").addEventListener("click", async () => {
  const question = document.getElementById("question").value.trim();
  const answer = document.getElementById("answer").value.trim();
  if (!answer) { setError("Please enter an answer first."); return; }
  setError("");
  setLoading(true, "Analyzing trust...");

  try {
    const res = await fetch(`${BASE_URL}/api/trust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, subject: selectedSubject }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.reliabilityScore !== undefined) {
      const output = document.getElementById("output");
      output.style.display = "block";
      output.innerHTML = `
        <div class="score-row">
          <div class="score-card">
            <div class="val green">${data.reliabilityScore}%</div>
            <div class="lbl">Reliability</div>
          </div>
          <div class="score-card">
            <div class="val red">${data.hallucinationRisk}%</div>
            <div class="lbl">Hallucination</div>
          </div>
          <div class="score-card">
            <div class="val yellow">${data.trustLabel}</div>
            <div class="lbl">Trust</div>
          </div>
        </div>
        <div class="result-box">${data.summary}</div>
      `;
    } else {
      setError(data.error || "Trust check failed.");
    }
  } catch {
    setLoading(false);
    setError("Request failed.");
  }
});

// Evaluate
document.getElementById("evaluate-btn").addEventListener("click", async () => {
  const question = document.getElementById("question").value.trim();
  const answer = document.getElementById("answer").value.trim();
  if (!question || !answer) { setError("Please provide both question and answer."); return; }
  setError("");
  setLoading(true, "Evaluating with Examiner AI...");
  document.getElementById("output").style.display = "none";

  try {
    const res = await fetch(`${BASE_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        response1: answer,
        response2: "",
        evaluator: "Gemini",
        subject: selectedSubject,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.estimatedScore) {
      const output = document.getElementById("output");
      output.style.display = "block";

      const breakdown = data.breakdown;
      const improvements = (data.improvements || []).slice(0, 2);
      const annotations = (data.annotations || []).slice(0, 2);

      output.innerHTML = `
        <div style="margin-bottom: 10px;">
          <span class="tag tag-blue">${data.subject}</span>
          <span class="tag tag-green">${data.estimatedScore}</span>
        </div>
        <div class="score-row">
          ${["knowledge", "application", "analysis", "evaluation"].map(k => `
            <div class="score-card">
              <div class="val ${scoreColor(breakdown[k].score)}">${breakdown[k].score}/5</div>
              <div class="lbl">${k.slice(0,4)}</div>
            </div>
          `).join("")}
        </div>
        <div class="result-box" style="margin-bottom: 8px;">${data.overallCritique}</div>
        ${annotations.length ? `
          <div style="margin-bottom: 6px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Annotations</div>
          ${annotations.map(a => `
            <div style="background:#111; border:1px solid #422006; border-radius:8px; padding:8px; margin-bottom:6px;">
              <div style="color:#fbbf24; font-size:11px; margin-bottom:3px;">"${a.keyword}"</div>
              <div style="color:#ccc; font-size:11px;">💡 ${a.suggestion}</div>
            </div>
          `).join("")}
        ` : ""}
        ${improvements.length ? `
          <div style="margin-bottom: 6px; font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Improvements</div>
          ${improvements.map(imp => `
            <div style="background:#111; border:1px solid #1e3a5f; border-radius:8px; padding:8px; margin-bottom:6px;">
              <div style="color:#60a5fa; font-size:10px; text-transform:uppercase; margin-bottom:3px;">${imp.category}</div>
              <div style="color:#fca5a5; font-size:11px; margin-bottom:3px;">⚠ ${imp.defect}</div>
              <div style="color:#86efac; font-size:11px;">✓ ${imp.fix}</div>
            </div>
          `).join("")}
        ` : ""}
        <div style="margin-top: 8px;">
          <a href="${BASE_URL}" target="_blank" style="color: #3b82f6; font-size: 11px;">Open full app →</a>
        </div>
      `;
    } else {
      setError(data.error || "Evaluation failed.");
    }
  } catch {
    setLoading(false);
    setError("Request failed.");
  }
});