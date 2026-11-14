# Open AI Studio

An open-source, zero-backend, browser-based AI full-stack app builder modeled after **Google AI Studio**—powered by **WebContainers** and **free cloud coding models** (BYOK) or local **Ollama**.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-indigo?style=for-the-badge&logo=vercel)](https://open-ai-studio.vercel.app)
[![Release](https://img.shields.io/github/v/release/skhizarabbas/open-ai-studio?style=for-the-badge&color=10b981)](https://github.com/skhizarabbas/open-ai-studio/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-zinc.svg?style=for-the-badge)](LICENSE)

## Why Open AI Studio?

Most AI app builders require paid cloud sandboxes, backend proxy servers, or expensive subscription credits. **Open AI Studio** runs Node.js, Vite, Express APIs, and `npm install` directly inside your browser tab via `@webcontainer/api` and connects straight from your browser to free-tier OpenAI-compatible inference providers.

- **$0 Infrastructure Cost:** Static frontend deployable anywhere (`COOP`/`COEP` headers preconfigured in `vercel.json`).
- **Bring Your Own Free Key (BYOK):** API keys stay strictly in your browser's `localStorage` and are never sent to any intermediate server.
- **Built for Free Cloud Coding Models:** Optimized diff-patching (`<studioAction>`) and token-efficient context injection so free daily rate limits go further.

---

## Features (`v0.2.0`)

- **In-Browser Node.js Runtime & Live Preview:** Boots a real Vite + React + Tailwind CSS v3 dev server (and full-stack Express backends) inside WebContainers with an integrated `xterm.js` terminal and one-click error self-healing.
- **Run Settings & Custom System Instructions Drawer:** Tune **Temperature**, **Max Output Tokens**, and **Top-P** in real time, and append persistent custom system instructions with one-click preset chips (*Strict Diffs*, *Modern Dark UI*, *Full-Stack API*).
- **Multimodal Image-to-App ("Screenshot / Sketch to Code"):** Paste (`Ctrl+V`), drag-and-drop, or attach UI mockups and wireframes directly in the chat prompt for vision-capable models (Gemma 4, Gemini 2.5 Flash, Qwen-VL, OpenRouter).
- **Starter App Gallery & Prompt Presets:** Launch ready-to-run templates (*Blank React + Tailwind*, *SaaS Metrics & Billing UI*, *Full-Stack Express + REST API*, *BYOK AI Chat Wrapper*) with curated follow-up prompts.
- **Version History & Snapshot Rollback:** Automatic virtual file-tree snapshots after every AI edit with one-click **Restore vN** rollback buttons on chat messages.
- **"Get Code" SDK Snippets & One-Click GitHub Push:** Export your active prompt, model, and run parameters as copy-pasteable **JavaScript (`fetch`)**, **Python (`openai`)**, or **cURL** snippets—or push the entire WebContainer project directly to a new GitHub repository, or download it as a `.zip`.

---

## Supported Free Providers & Models

| Provider | Free Tier Highlights | Preconfigured Models |
| :--- | :--- | :--- |
| **OpenRouter** | Free `:free` model routing | `openrouter/free`, `qwen/qwen3-coder:free`, `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-ultra:free` |
| **Google AI Studio** | Permanent free developer tier | `gemma-4-31b-it`, `gemini-2.5-flash` |
| **Cerebras Cloud** | Ultra-fast inference (~1M free tokens/day) | `qwen-3-32b`, `llama-3.3-70b` |
| **GroqCloud** | High-speed free tier | `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `qwen/qwen3-32b` |
| **Mistral AI** | Free Experiment plan (no card required) | `devstral-small-latest`, `codestral-latest` |
| **NVIDIA NIM** | Free developer prototyping credits | `qwen/qwen3-coder-480b-a35b-instruct`, `deepseek-ai/deepseek-v3.1` |
| **Local Ollama** | 100% offline, zero API key needed | `qwen2.5-coder:7b`, `deepseek-coder-v2:16b` |

---

## Local Development

### Prerequisites
- **Node.js** 18+
- A modern Chromium-based browser, Firefox, or Safari with `SharedArrayBuffer` support (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` are configured automatically in `vite.config.ts` and `vercel.json`).

### Quick Start

```bash
git clone [https://github.com/skhizarabbas/open-ai-studio.git](https://github.com/skhizarabbas/open-ai-studio.git)
cd open-ai-studio
npm install
npm run dev