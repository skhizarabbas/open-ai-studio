# Contributing to Open AI Studio

We welcome contributions from developers using **free cloud open-source coding models** (OpenRouter `:free`, Cerebras, Groq, Mistral, NVIDIA NIM, Google AI Studio, or local Ollama)!

## Good First Contributions
1. **Add New Free Cloud Providers or Models:** Update `src/providers/models.ts` with new free inference endpoints or open-weights coding models.
2. **Add Starter Templates:** Expand `src/prompts/templates.ts` with full-stack Express + SQL.js, Hono, or multi-page React templates.
3. **Enhance the Editor & Workbench:** Add multi-tab editing, syntax highlighting (CodeMirror 6), or one-click GitHub repository push via Octokit.

## Workflow
1. Fork the repo and create a feature branch (`git checkout -b feat/your-feature`).
2. Read `AGENTS.md` (or let your AI coding assistant read it automatically).
3. Test locally with `npm run dev` and verify `npm run build` passes with zero TypeScript errors.
4. Open a Pull Request describing your changes and which coding model you used!