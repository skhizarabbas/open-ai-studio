import React, { useState } from 'react';
import { Check, Code, Copy, ExternalLink, GitBranch, Loader2, X } from 'lucide-react';
import { getProviderById, ChatMessage } from '../providers/client';
import { RunSettings } from './RunSettingsDrawer';
import {
  getStoredGithubToken,
  pushProjectToGithub,
  saveGithubToken,
} from '../engine/github';

interface ExportCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  modelId: string;
  customModelId: string;
  runSettings: RunSettings;
  messages: ChatMessage[];
}

export const ExportCodeModal: React.FC<ExportCodeModalProps> = ({
  isOpen,
  onClose,
  providerId,
  modelId,
  customModelId,
  runSettings,
  messages,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'github'>('code');
  const [lang, setLang] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [copied, setCopied] = useState(false);

  const [githubToken, setGithubToken] = useState(getStoredGithubToken);
  const [repoName, setRepoName] = useState('my-open-ai-studio-app');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushedUrl, setPushedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const provider = getProviderById(providerId);
  const targetModel = customModelId.trim() || modelId;

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const samplePrompt =
    typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
      ? lastUserMsg.content.find((p) => p.type === 'text')?.text || 'Build a full-stack React app'
      : 'Build a full-stack React app';

  const systemText =
    runSettings.customInstructions.trim() || 'You are an expert full-stack software engineer.';

  const getSnippet = () => {
    if (lang === 'python') {
      return `from openai import OpenAI

client = OpenAI(
    base_url="${provider.baseUrl}",
    api_key="YOUR_${provider.id.toUpperCase()}_API_KEY",
)

response = client.chat.completions.create(
    model="${targetModel}",
    temperature=${runSettings.temperature},
    max_tokens=${runSettings.maxTokens},
    top_p=${runSettings.topP},
    messages=[
        {"role": "system", "content": ${JSON.stringify(systemText)}},
        {"role": "user", "content": ${JSON.stringify(samplePrompt)}},
    ],
    stream=True,
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`;
    }

    if (lang === 'curl') {
      return `curl "${provider.baseUrl}/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '${JSON.stringify(
    {
      model: targetModel,
      temperature: runSettings.temperature,
      max_tokens: runSettings.maxTokens,
      top_p: runSettings.topP,
      stream: true,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: samplePrompt },
      ],
    },
    null,
    2
  )}'`;
    }

    return `const response = await fetch("${provider.baseUrl}/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": \`Bearer \${process.env.${provider.id.toUpperCase()}_API_KEY}\`,
  },
  body: JSON.stringify({
    model: "${targetModel}",
    temperature: ${runSettings.temperature},
    max_tokens: ${runSettings.maxTokens},
    top_p: ${runSettings.topP},
    stream: true,
    messages: [
      { role: "system", content: ${JSON.stringify(systemText)} },
      { role: "user", content: ${JSON.stringify(samplePrompt)} },
    ],
  }),
});

const data = await response.json();
console.log(data);`;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePushGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushError(null);
    setPushedUrl(null);
    setIsPushing(true);

    try {
      saveGithubToken(githubToken);
      const res = await pushProjectToGithub({
        token: githubToken,
        repoName,
        isPrivate,
      });
      setPushedUrl(res.repoUrl);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header & Tabs */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Get Code
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'github'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Push to GitHub
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {activeTab === 'code' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(['javascript', 'python', 'curl'] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setLang(item)}
                      className={`px-2.5 py-1 rounded text-xs capitalize ${
                        lang === item
                          ? 'bg-zinc-800 text-indigo-300 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {item === 'curl' ? 'cURL' : item}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                <code>{getSnippet()}</code>
              </pre>
            </div>
          ) : (
            <form onSubmit={handlePushGithub} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">
                  GitHub Personal Access Token (classic <code className="text-indigo-400">repo</code> scope or fine-grained Contents write)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_... or github_pat_..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  required
                />
                <p className="text-[11px] text-zinc-500">
                  Stored locally in your browser&apos;s localStorage. Never sent to any server except api.github.com.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-300">New Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-generated-app"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 accent-indigo-600"
                />
                Make repository private
              </label>

              {pushError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {pushError}
                </div>
              )}

              {pushedUrl && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-700/60 flex items-center justify-between text-xs text-emerald-200">
                  <span>Repository created and pushed!</span>
                  <a
                    href={pushedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline hover:text-white"
                  >
                    Open on GitHub <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isPushing}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white flex items-center justify-center gap-2"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Repository & Pushing Files...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    Create Repo & Push Project
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};