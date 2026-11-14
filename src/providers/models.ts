export interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  requiresKey: boolean;
  keyPlaceholder: string;
  freeTierNote: string;
  extraHeaders?: Record<string, string>;
  models: ModelOption[];
}

export const FREE_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (Free Tier)',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    freeTierNote: 'Free :free models (50 req/day, or 1,000 req/day with $10 balance)',
    extraHeaders: {
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Open AI Studio',
    },
    models: [
      { id: 'openrouter/free', name: 'OpenRouter Auto Free Router', contextWindow: 128000 },
      { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (Free)', contextWindow: 131072 },
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B IT (Free)', contextWindow: 131072 },
      { id: 'nvidia/nemotron-3-ultra:free', name: 'Nemotron 3 Ultra (Free)', contextWindow: 131072 },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras Cloud',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresKey: true,
    keyPlaceholder: 'csk-...',
    freeTierNote: 'Ultra-fast inference (~1M free tokens/day per model)',
    models: [
      { id: 'qwen-3-32b', name: 'Qwen 3 32B', contextWindow: 32768 },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', contextWindow: 65536 },
    ],
  },
  {
    id: 'groq',
    name: 'GroqCloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    freeTierNote: 'Free tier with high-speed inference (rate-limited per minute/day)',
    models: [
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', contextWindow: 131072 },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 128000 },
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', contextWindow: 131072 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI (La Plateforme)',
    baseUrl: 'https://api.mistral.ai/v1',
    requiresKey: true,
    keyPlaceholder: 'Mistral API Key...',
    freeTierNote: 'Free Experiment plan (no credit card required)',
    models: [
      { id: 'devstral-small-latest', name: 'Devstral Small (Agentic Coding)', contextWindow: 128000 },
      { id: 'codestral-latest', name: 'Codestral', contextWindow: 256000 },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresKey: true,
    keyPlaceholder: 'nvapi-...',
    freeTierNote: 'Free developer prototyping credits via NVIDIA Build',
    models: [
      { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen3 Coder 480B', contextWindow: 131072 },
      { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek V3.1', contextWindow: 128000 },
    ],
  },
  {
    id: 'google',
    name: 'Google AI Studio (OpenAI Endpoint)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
    freeTierNote: 'Permanent free tier via Google AI Studio',
    models: [
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B (Open Weights)', contextWindow: 131072 },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000 },
    ],
  },
  {
    id: 'ollama',
    name: 'Local Ollama (Zero Cloud)',
    baseUrl: 'http://localhost:11434/v1',
    requiresKey: false,
    keyPlaceholder: 'ollama (no key needed)',
    freeTierNote: 'Unlimited local inference (set OLLAMA_ORIGINS="*" when running Ollama)',
    models: [
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B (Local)', contextWindow: 32768 },
      { id: 'deepseek-coder-v2:16b', name: 'DeepSeek Coder V2 16B (Local)', contextWindow: 32768 },
    ],
  },
];