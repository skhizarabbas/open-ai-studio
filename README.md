# Open AI Studio

An open-source, browser-based full-stack AI app generator inspired by Bolt.new and Google AI Studio—engineered to run on **free cloud open-source coding models** with zero backend server costs.

Developed by **Syed Khizar Abbas Kazmi** at **ApmleTech**.

## Key Features

- **In-Browser Node.js Runtime:** Runs `npm install`, dev servers, and live app previews directly inside your browser tab via `@webcontainer/api`.
- **BYOK Free Cloud Model Registry:** Pre-configured for OpenRouter (`:free` models), Cerebras, Groq, Mistral (Devstral/Codestral), NVIDIA NIM, Google AI Studio (Gemma 4), and local Ollama.
- **Token-Efficient Diff Patching:** Applies `SEARCH/REPLACE` blocks to existing files to preserve free-tier API quotas.
- **Self-Healing Error Loop & ZIP Export:** Captures build and shell errors for one-click AI fixes and exports clean `.zip` archives.

## Local Development

~~~~bash
npm install
npm run dev
~~~~

Open `http://localhost:5173`, click **API Keys**, enter a free key from any supported provider, and start building.

## Contributing with Free Coding Models

1. Grab a free API key from OpenRouter, Groq, Cerebras, Mistral, NVIDIA NIM, or Google AI Studio (or run local Ollama).
2. Review `AGENTS.md` and `CONTRIBUTING.md` for architecture constraints and good first issues.
3. Fork the repository, build your feature or provider plugin, and submit a Pull Request.

## License

MIT License — Copyright (c) 2026 **Syed Khizar Abbas Kazmi** (**ApmleTech**)