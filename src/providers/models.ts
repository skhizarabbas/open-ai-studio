export interface ModelOption {
  id: string;
  name: string;
  contextWindow: number;
  supportsVision?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  requiresKey: boolean;
  keyPlaceholder: string;
  signupUrl: string;
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
    signupUrl: 'https://openrouter.ai/keys',
    extraHeaders: {
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'Open AI Studio',
    },
    models: [
      { id: 'openrouter/free', name: 'OpenRouter Auto Free Router', contextWindow: 128000, supportsVision: true },
      { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B Vision (Free)', contextWindow: 131072, supportsVision: true },
      { id: 'nvidia/nemotron-3-ultra:free', name: 'Nemotron 3 Ultra (Free)', contextWindow: 131072 },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', contextWindow: 131072 },
    ],
  },
  {
    id: 'google',
    name: 'Google AI Studio (Free)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
    signupUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Free)', contextWindow: 1048576, supportsVision: true },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B (Free)', contextWindow: 131072, supportsVision: true },
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras Cloud (Free)',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresKey: true,
    keyPlaceholder: 'csk-...',
    signupUrl: 'https://cloud.cerebras.ai/',
    models: [
      { id: 'qwen-3-32b', name: 'Qwen 3 32B (Ultra-Fast)', contextWindow: 65536 },
      { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', contextWindow: 65536 },
    ],
  },
  {
    id: 'groq',
    name: 'GroqCloud (Free)',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    signupUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 128000 },
      { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', contextWindow: 131072 },
      { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', contextWindow: 128000 },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI (Free)',
    baseUrl: 'https://api.mistral.ai/v1',
    requiresKey: true,
    keyPlaceholder: 'Mistral API Key...',
    signupUrl: 'https://console.mistral.ai/api-keys',
    models: [
      { id: 'devstral-small-latest', name: 'Devstral Small (Coding)', contextWindow: 128000 },
      { id: 'codestral-latest', name: 'Codestral Latest', contextWindow: 256000 },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM (Free)',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    requiresKey: true,
    keyPlaceholder: 'nvapi-...',
    signupUrl: 'https://build.nvidia.com/',
    models: [
      { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen3 Coder 480B', contextWindow: 262144 },
      { id: 'deepseek-ai/deepseek-v3.1', name: 'DeepSeek V3.1', contextWindow: 128000 },
    ],
  },
  {
    id: 'ollama',
    name: 'Local Ollama (No Key)',
    baseUrl: 'http://localhost:11434/v1',
    requiresKey: false,
    keyPlaceholder: 'Not required (ollama)',
    signupUrl: 'https://ollama.com/',
    models: [
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B (Local)', contextWindow: 32768 },
      { id: 'deepseek-coder-v2:16b', name: 'DeepSeek Coder V2 16B (Local)', contextWindow: 32768 },
    ],
  },
];