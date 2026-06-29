This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# AI-integration-app

# 🎓 iStudy — Your AI-Powered Academic Coach on the Blockchain

> **"Stop searching for answers. Start building understanding."**
> 
> An agentic learning platform that reads your work, identifies your weaknesses, and guides you to mastery — powered by AI, secured by Sui.

[![Built on Sui](https://img.shields.io/badge/Built%20on-Sui%20Overflow%202026-4CA3DD?style=for-the-badge&logo=sui)](https://overflow.sui.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Walrus](https://img.shields.io/badge/Storage-Walrus%2FSui-6FDDFF?style=for-the-badge)](https://walrus.xyz/)

---

## 📌 Table of Contents

1. [The Problem](#-the-problem)
2. [The Solution & Core Features](#-the-solution--core-features)
3. [System Architecture & Tech Stack](#-system-architecture--tech-stack)
4. [Future Vision & Scalability](#-future-vision--scalability)
5. [How to Run Locally](#-how-to-run-locally)
6. [Team](#-team)

---

## 🚨 The Problem

### The Silent Crisis in Education

Modern students face a paradox: **they have never had more access to information, yet they understand less deeply than ever before.**

#### 🧠 Cognitive Overload & Surface-Level Learning

The traditional study workflow — copy notes, Google the answer, paste into ChatGPT — creates an illusion of understanding. Students get the *output* without building the *mental model*. When exam day arrives, the gap is brutal.

> Research in cognitive science shows that **passive retrieval of answers suppresses long-term memory consolidation** (Roediger & Butler, 2011). Students who habitually rely on AI-generated answers score significantly lower on transfer tasks than peers who struggled through problems independently.

#### 😰 Psychological Friction in Exam Preparation

A-Level and high-stakes exam students don't just struggle academically — they struggle **emotionally**:

- **Exam anxiety** distorts self-assessment. Students over-prepare safe topics and avoid genuine weaknesses.
- **Peer comparison pressure** creates a performance culture where admitting confusion feels like failure.
- **Cognitive dissonance** — students *feel* prepared because they can recognize the right answer, but cannot *produce* one under pressure.

#### 🔍 The Feedback Gap

Traditional tutoring is expensive, scarce, and asynchronous. AI tools like ChatGPT give answers instantly — but they do not:

- Identify *why* a student made a specific mistake
- Track whether that weakness was resolved over time
- Adapt their teaching style to the student's cognitive profile
- Provide exam-board-specific, mark-scheme-aligned feedback

**The result:** Students finish their study sessions feeling productive but remain fundamentally underprepared.

---

## 💡 The Solution & Core Features

iStudy is not another AI chatbot. It is an **Agentic Learning Coach** — a system that observes, evaluates, guides, and remembers, so that every study session builds on the last.

---

### 📸 1. OCR & Intelligent Subject Detection

Upload a photo of your handwritten work, a screenshot of an exam question, or a typed response. iStudy's vision pipeline:

```
Upload image / text
        ↓
   OCR extraction
        ↓
Subject auto-detection (Economics, Business, Psychology, Math, ...)
        ↓
Rubric & mark scheme selection
```

No manual setup. The AI knows what subject you're working on and evaluates accordingly.

---

### 🧠 2. Multi-Mode Learning System

The core of iStudy is its **three-mode pedagogy engine**, designed around how humans actually learn:

#### 🔵 Socratic Mode
The AI **never gives the answer**. Instead:
```
Student submits response
        ↓
AI asks probing questions
        ↓
Student refines their thinking
        ↓
Understanding is built, not given
```
Ideal for building genuine exam readiness.

#### 🟡 Scaffold Mode
For new content, the AI breaks concepts into digestible layers:
```
Core concept → Underlying logic → Real-world application
```
Removes cognitive overload. Builds from the ground up.

#### 🔴 Exam Drill Mode
The AI becomes an examiner. It focuses on:
- Mark scheme alignment
- Keywords and command word interpretation
- Exam technique (e.g., "evaluate" vs. "explain" vs. "discuss")

Maximizes marks. Simulates the real exam environment.

---

### 📊 3. AI Evaluation Engine

After each submission, iStudy runs a structured analysis:

| Dimension | What It Measures |
|---|---|
| **Strengths** | Well-argued points, correct use of terminology |
| **Weaknesses** | Knowledge gaps, missing evaluation depth |
| **Reliability** | Confidence score, evidence quality |
| **Trust Check** | Hallucination risk detection, missing support flags |

The evaluation is aligned to Cambridge, AQA, and Edexcel marking frameworks.

---

### 📝 4. Intelligent Annotation System

iStudy highlights your actual work — inline:

```
"The market failure occurs because..."
         ↑
    [keyword: market failure]
    Tooltip: "Good identification — but where is
              your evaluation of welfare loss?"
```

Every highlight is interactive. Hover to see the AI's reasoning. Click to expand suggestions.

---

### 📚 5. Synthesized Best-Practice Answer

After evaluation, iStudy generates an improved version of *your* answer — not a generic model answer. It shows you what your response could have looked like if you had applied all feedback correctly.

---

### 📈 6. Learning Analytics Dashboard

iStudy tracks your performance across sessions:

- **Overall Profile:** `Strong analytical thinker. Limited evaluation depth. Prefers structured reasoning.`
- **Recommended Study Methods:** Flashcards · Mind Maps · Timed Essays · Retrieval Practice
- **Weak Topic Heatmap:** Visual breakdown of recurring knowledge gaps

---

### ⛓️ 7. Web3 Learning Passport (Sui + Walrus)

Every evaluation, session, and milestone is stored on **Walrus** — Sui's decentralized storage layer:

- **Portable:** Your learning record belongs to you, not a platform
- **Persistent:** Data survives platform shutdowns
- **Tamper-resistant:** No institution can alter your academic history
- **zkLogin:** Sign in with Google. A Sui wallet is created automatically. No crypto knowledge required.

---

## 🏗️ System Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      iStudy Frontend                     │
│              Next.js 14 · TypeScript · Tailwind CSS      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐    ┌────────▼────────────┐
│   AI Layer        │    │   Storage Layer      │
│                   │    │                      │
│  OpenAI GPT-4o   │    │  Vercel KV (Redis)   │
│  Google Gemini   │    │  Walrus / Sui        │
│  Vision OCR      │    │  (Learning Records)  │
└───────────────────┘    └──────────────────────┘
                     │
        ┌────────────┴────────────┐
        │    Auth Layer            │
        │    Sui zkLogin           │
        │    (Google → Wallet)     │
        └──────────────────────────┘
```

**Full Tech Stack:**

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, React Markdown, Recharts
- **AI Models:** OpenAI SDK (GPT-4o vision + text), Google Gemini (`@google/genai`)
- **Blockchain / Storage:** Walrus (`@mysten/walrus`), Sui zkLogin
- **Session Storage:** Vercel KV (Redis)
- **Deployment:** Vercel

---

## 🚀 Future Vision & Scalability

iStudy is currently a powerful proof-of-concept. The roadmap ahead is ambitious.

---

### Phase 1 — Deepen the Agent (Q3 2026)

> *From evaluator to autonomous companion.*

- **Persistent Memory Agent:** The AI remembers every session, every mistake, every breakthrough — and references them proactively in new sessions.
- **Spaced Repetition Engine:** Weak topics are automatically scheduled for re-testing based on forgetting curve models (Ebbinghaus).
- **Voice Mode:** Students can speak their answers. The AI responds verbally — simulating a real oral examination.

---

### Phase 2 — Institutional Integration (Q4 2026)

> *From individual tool to classroom infrastructure.*

- **Teacher Dashboard:** Educators can monitor anonymized class-wide performance heatmaps. Identify which topics the entire cohort is struggling with — before the exam.
- **School Licensing Model:** iStudy becomes a SaaS product for schools, with per-student or institutional pricing.
- **Curriculum API:** Plug in any syllabus (Cambridge, IB, AP) and iStudy automatically reconfigures its rubrics and evaluation framework.

---

### Phase 3 — Verifiable Academic Records on Sui (Q1 2027)

> *From learning records to sovereign academic identity.*

- **Soul-Bound Tokens (SBTs):** Mint non-transferable achievement certificates on Sui. Verified by the AI. Owned by the student. Accepted by universities.
- **Academic Passport:** A portable, cryptographically verifiable record of a student's entire learning history — shareable with admissions offices, scholarship committees, and employers.
- **Research Data Layer:** With student consent, anonymized learning pathway data is made available to educational researchers — creating one of the world's most detailed datasets on how students actually learn.

---

### Phase 4 — Ecosystem & Decentralization (2027+)

> *From platform to protocol.*

- **Open Tutor Marketplace:** Expert educators can publish their own mark schemes, rubrics, and feedback templates as on-chain assets. Students purchase access. Educators earn revenue.
- **DAO Governance:** The iStudy community votes on curriculum priorities, feature development, and platform policies.
- **Cross-Chain Portability:** Expand beyond Sui to support academic records across multiple chains, enabling truly universal academic identity.

---

## 💻 How to Run Locally

### Prerequisites

- Node.js `>= 18.0.0`
- npm or yarn
- A `.env.local` file with the required API keys (see below)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/nguyenhuyhai1562009-hub/istudy_project_2026.git
cd istudy_project_2026

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your keys (see Environment Variables section)

# 4. Run the development server
npm run dev

# 5. Open in browser
# http://localhost:3000
```

### Environment Variables

```env
# AI
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Storage
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_vercel_kv_rest_url
KV_REST_API_TOKEN=your_vercel_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_read_only_token

# Sui / Walrus
SUI_NETWORK=mainnet
WALRUS_PUBLISHER_URL=your_walrus_publisher_url
WALRUS_AGGREGATOR_URL=your_walrus_aggregator_url
```

### Build for Production

```bash
npm run build
npm start
```

---

## 👤 Team

| Role | Name |
|---|---|
| Full-Stack Engineer & Product | [Your Name] |

**Submitted to:** [Sui Overflow 2026](https://overflow.sui.io/) — Walrus Track

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with 🧠 for students who want to actually understand, not just pass.**

[🌐 Live Demo](#) · [📹 Demo Video](#) · [📊 Pitch Deck](#)

</div>
