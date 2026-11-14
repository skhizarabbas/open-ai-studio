import { FREE_PROVIDERS, ProviderConfig } from './models';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  providerId: string;
  modelId: string;
  customModelId?: string;
  messages: ChatMessage[];
  onToken: (token: string, fullText: string) => void;
  signal?: AbortSignal;
}

const KEYS_STORAGE_KEY = 'open_ai_studio_api_keys';

export function getStoredApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveApiKey(providerId: string, apiKey: string): void {
  const keys = getStoredApiKeys();
  keys[providerId] = apiKey.trim();
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export function getProviderById(providerId: string): ProviderConfig {
  return FREE_PROVIDERS.find((p) => p.id === providerId) || FREE_PROVIDERS[0];
}

export async function streamChatCompletion({
  providerId,
  modelId,
  customModelId,
  messages,
  onToken,
  signal,
}: StreamOptions): Promise<string> {
  const provider = getProviderById(providerId);
  const apiKey = getStoredApiKeys()[providerId] || 'ollama';

  if (provider.requiresKey && (!apiKey || apiKey === 'ollama')) {
    throw new Error(`Missing API key for ${provider.name}. Please add your free key in Settings.`);
  }

  const targetModel = customModelId?.trim() ? customModelId.trim() : modelId;

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider.extraHeaders || {}),
    },
    body: JSON.stringify({
      model: targetModel,
      messages,
      stream: true,
      temperature: 0.2,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${provider.name} API Error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onToken(delta, fullText);
        }
      } catch {
        // Ignore partial JSON chunks until next line arrives
      }
    }
  }

  return fullText;
}