# AGENTS.md — Contributor & AI Coding Guidelines

## Project Overview
Open AI Studio is a 100% browser-based, zero-backend full-stack AI app generator powered by WebContainers (`@webcontainer/api`) and BYOK (Bring Your Own Key) free cloud open-source coding models.

## Architectural Rules
1. **Zero Paid Backend:** Keep all LLM streaming, WebContainer execution, and storage 100% client-side in the browser.
2. **Unified OpenAI-Compatible Provider Interface:** All providers in `src/providers/models.ts` use standard OpenAI-compatible `chat/completions` SSE streaming (`src/providers/client.ts`).
3. **Token-Saving Diffs:** Always preserve `<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE` patching (`src/engine/diff.ts`) to stay well within free-tier rate limits.
4. **WebContainer Runtime Safety:** Never introduce native C++ dependencies (`better-sqlite3`, `bcrypt`, `sharp`, Tailwind v4) into generated starter templates—always use pure JS/Wasm packages and Tailwind CSS v3.

## Folder Structure
- `src/providers/` — Free cloud provider endpoints, model lists, and SSE streaming client.
- `src/engine/` — WebContainer singleton, streaming XML action parser, diff patcher, and ZIP exporter.
- `src/prompts/` — System prompt builder and starter project template.
- `src/components/` — Chat pane, API key modal, and xterm.js terminal.