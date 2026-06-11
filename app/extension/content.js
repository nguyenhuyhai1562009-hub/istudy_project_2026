const BASE_URL = "https://ai-integration-app.vercel.app";
let selectedText = "";

// Create and inject the Sidebar Panel into the document body
const sidebar = document.createElement("div");
sidebar.className = "istudy-sidebar-panel";
sidebar.innerHTML = `
  <div style="padding: 16px; border-bottom: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: center;">
    <h3 style="margin:0; font-size:16px; color:#fff;">iStudy AI Grader</h3>
    <button id="istudy-close-sidebar" style="background:none; border:none; color:#666; cursor:pointer; font-size:16px;">✕</button>
  </div>
  <div style="padding: 16px; flex: 1; overflow-y: auto;">
    <label style="display:block; font-size:11px; color:#666; margin-bottom:6px; text-transform:uppercase;">Selected Answer</label>
    <div id="istudy-preview-text" style="background:#111; padding:10px; border-radius:8px; font-size:12px; margin-bottom:16px; border:1px solid #222; max-height:100px; overflow-y:auto;"></div>
    
    <label style="display:block; font-size:11px; color:#666; margin-bottom:6px; text-transform:uppercase;">Exam Question</label>
    <textarea id="istudy-question-input" style="width:100%; background:#111; color:#fff; border:1px solid #222; border-radius:8px; padding:10px; font-size:12px; margin-bottom:16px; resize:none;" rows="3" placeholder="Paste the exam question here..."></textarea>
    
    <button id="istudy-submit-btn" style="width:100%; background:#2563eb; color:white; border:none; padding:10px; border-radius:8px; font-weight:500; cursor:pointer;">Get Examiner Feedback</button>
    
    <div id="istudy-loading" style="display:none; color:#666; margin-top:12px; font-size:12px;">Evaluating essay...</div>
    <div id="istudy-result-container" style="margin-top:16px; display:none;"></div>
  </div>
`;
document.body.appendChild(sidebar);

// Create the floating bubble element (but don't add to DOM yet)
const bubble = document.createElement("button");
bubble.className = "istudy-floating-bubble";
bubble.innerHTML = "🎓"; // Clean graduation cap icon representation

// Event: Listen for text selection on the webpage
document.addEventListener("mouseup", (e) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // If text is highlighted, display the bubble near the cursor position
  if (text && text.length > 5) {
    selectedText = text;
    
    // Get positioning metrics based on the highlighted boundary bounding box
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    bubble.style.top = `${rect.bottom + window.scrollY + 6}px`;
    bubble.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(bubble);
  } else {
    // Remove bubble if clicked elsewhere without selecting text
    if (e.target !== bubble && !sidebar.contains(e.target)) {
      removeBubble();
    }
  }
});

// Event: Clicking the bubble opens the sidebar panel
bubble.addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("istudy-preview-text").textContent = selectedText;
  sidebar.classList.add("open");
  removeBubble();
});

// Event: Close sidebar panel
document.getElementById("istudy-close-sidebar").addEventListener("click", () => {
  sidebar.classList.remove("open");
});

function removeBubble() {
  if (bubble.parentNode) {
    bubble.parentNode.removeChild(bubble);
  }
}

// Event: Triggering API Evaluation inside the injected sidebar
document.getElementById("istudy-submit-btn").addEventListener("click", async () => {
  const question = document.getElementById("istudy-question-input").value.trim();
  if (!question) { alert("Please input the exam question first."); return; }

  const loadingEl = document.getElementById("istudy-loading");
  const resultContainer = document.getElementById("istudy-result-container");
  
  loadingEl.style.display = "block";
  resultContainer.style.display = "none";

  try {
    const res = await fetch(`${BASE_URL}/api/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        response1: selectedText,
        subject: "Economics" // You can later add a dropdown in the sidebar to change this dynamically
      }),
    });
    const data = await res.json();
    loadingEl.style.display = "none";

    if (data.estimatedScore) {
      resultContainer.style.display = "block";
      resultContainer.innerHTML = `
        <div style="background:#111; border:1px solid #222; padding:12px; border-radius:8px; font-size:12px;">
          <div style="font-weight:bold; color:#4ade80; font-size:14px; margin-bottom:8px;">Score: ${data.estimatedScore}</div>
          <div style="color:#ccc; line-height:1.5; margin-bottom:10px;">${data.overallCritique}</div>
          <div style="color:#60a5fa; font-size:11px; font-weight:bold; text-transform:uppercase;">Next Steps:</div>
          <div style="color:#fca5a5; margin-top:4px;">⚠ ${data.improvements?.[0]?.defect || "See Web App"}</div>
          <div style="color:#86efac; margin-top:2px;">✓ ${data.improvements?.[0]?.fix || ""}</div>
        </div>
      `;
    } else {
      loadingEl.textContent = "Evaluation processing error.";
    }
  } catch (err) {
    loadingEl.style.display = "none";
    alert("Could not reach evaluation server.");
  }
});