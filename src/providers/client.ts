import { FREE_PROVIDERS, ProviderConfig } from './models';

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

export interface StreamOptions {
  providerId: string;
  modelId: string;
  customModelId?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  onToken: (token: string, fullText: string) => void;
  signal?: AbortSignal;
}

const KEYS_STORAGE_KEY = 'open_ai_studio_api_keys';
const CONNECT_TIMEOUT_MS = 25000;
const STREAM_IDLE_TIMEOUT_MS = 20000;

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

function combineSignals(userSignal?: AbortSignal, timeoutMs = CONNECT_TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('CONNECT_TIMEOUT')), timeoutMs);

  const onUserAbort = () => controller.abort(userSignal?.reason);
  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timer);
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener('abort', onUserAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      userSignal?.removeEventListener('abort', onUserAbort);
    },
  };
}

export async function streamChatCompletion({
  providerId,
  modelId,
  customModelId,
  messages,
  temperature = 0.2,
  maxTokens = 16384,
  topP = 0.95,
  onToken,
  signal,
}: StreamOptions): Promise<string> {
  const provider = getProviderById(providerId);
  const apiKey = getStoredApiKeys()[providerId] || '';

  if (provider.requiresKey && !apiKey) {
    throw new Error(`Missing API key for ${provider.name}. Please add your free key in API Keys.`);
  }

  const targetModel = customModelId?.trim() ? customModelId.trim() : modelId;

  const makeRequest = async (chosenModel: string): Promise<Response> => {
    const { signal: reqSignal, cleanup } = combineSignals(signal, CONNECT_TIMEOUT_MS);
    try {
      const payload: Record<string, unknown> = {
        model: chosenModel,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      };

      // Keep thinking overhead low so code tokens start streaming immediately
      if (providerId === 'google' || providerId === 'openrouter') {
        payload.reasoning_effort = 'low';
      }

      return await fetch(provider.chatCompletionsUrl || `${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(provider.extraHeaders || {}),
        },
        body: JSON.stringify(payload),
        signal: reqSignal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new Error('CONNECT_TIMEOUT');
    } finally {
      cleanup();
    }
  };

  let response: Response;
  try {
    response = await makeRequest(targetModel);
  } catch (err) {
    if (signal?.aborted) throw err;
    // If Gemini 3.8 Flash stalls on initial connection, automatically retry with faster Gemini 3.5 Flash-Lite
    if (providerId === 'google' && !customModelId?.trim() && targetModel !== 'gemini-3.5-flash-lite') {
      onToken('', 'Primary model timed out — retrying with Gemini 3.5 Flash-Lite...\n');
      response = await makeRequest('gemini-3.5-flash-lite');
    } else {
      throw new Error(
        `${provider.name} did not respond within 25 seconds. Please click Stop and try "Gemini 3.5 Flash-Lite (Fast)" or Groq/Cerebras.`
      );
    }
  }

  // Automatic fallback to openrouter/free if a specific :free slug is deprecated (404) or rate-limited (429)
  if (
    !response.ok &&
    providerId === 'openrouter' &&
    !customModelId?.trim() &&
    targetModel !== 'openrouter/free' &&
    (response.status === 404 || response.status === 429)
  ) {
    response = await makeRequest('openrouter/free');
  }

  // Automatic fallback on Google AI Studio if a model is overloaded (503) or rate-limited (429)
  if (
    !response.ok &&
    providerId === 'google' &&
    !customModelId?.trim() &&
    targetModel !== 'gemini-3.5-flash-lite' &&
    (response.status === 429 || response.status === 503 || response.status === 504)
  ) {
    onToken('', 'Model busy — switching to Gemini 3.5 Flash-Lite...\n');
    response = await makeRequest('gemini-3.5-flash-lite');
  }

  if (providerId === 'pollinations' && response.status === 402) {
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(
      `The anonymous GPT-OSS service is at its shared per-IP limit.${retryAfter ? ` Try again in about ${retryAfter} seconds.` : ' Wait a little and try again.'} You can also switch to a provider with your own API key.`
    );
  }

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
  let reasoningChars = 0;
  let buffer = '';

  const readWithTimeout = async () => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reader.cancel().catch(() => {});
            reject(new Error('STREAM_STALLED'));
          }, STREAM_IDLE_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const processSseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) return;

    try {
      const json = JSON.parse(trimmed.slice(6));
      if (json.error?.message) {
        throw new Error(`${provider.name} Stream Error: ${json.error.message}`);
      }
      const choice = json.choices?.[0];
      const content = choice?.delta?.content ?? choice?.message?.content;
      const reasoning = choice?.delta?.reasoning || choice?.delta?.reasoning_content;

      if (typeof content === 'string' && content) {
        fullText += content;
        onToken(content, fullText);
      } else if (reasoning && !fullText) {
        reasoningChars += String(reasoning).length;
        onToken('', `Thinking... (${reasoningChars} chars)`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Stream Error:')) throw err;
    }
  };

  while (true) {
    let chunkResult: ReadableStreamReadResult<Uint8Array>;
    try {
      chunkResult = await readWithTimeout();
    } catch (err) {
      if (err instanceof Error && err.message === 'STREAM_STALLED') {
        if (fullText.trim()) {
          break;
        }
        throw new Error(
          `${provider.name} stream stalled for 20s before sending code. Try selecting "Gemini 3.5 Flash-Lite (Fast)" in the dropdown.`
        );
      }
      throw err;
    }

    const { done, value } = chunkResult;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) processSseLine(line);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) processSseLine(line);
  }

  if (!fullText.trim()) {
    if (providerId === 'pollinations') {
      throw new Error(
        'The anonymous GPT-OSS service completed without a text answer. Retry once, or switch to a provider with your own API key or a local model.'
      );
    }
    throw new Error(`${provider.name} completed without returning a text answer. Try another model or provider.`);
  }

  return fullText;
}