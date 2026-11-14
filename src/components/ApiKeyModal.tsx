import React, { useState } from 'react';
import { Key, X, Check } from 'lucide-react';
import { FREE_PROVIDERS } from '../providers/models';
import { getStoredApiKeys, saveApiKey } from '../providers/client';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [keys, setKeys] = useState<Record<string, string>>(() => getStoredApiKeys());
  const [savedId, setSavedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (providerId: string) => {
    saveApiKey(providerId, keys[providerId] || '');
    setSavedId(providerId);
    setTimeout(() => setSavedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-zinc-100">Free Cloud API Keys (Stored Locally)</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-zinc-400">
            Keys are saved strictly in your browser&apos;s <code>localStorage</code> and sent directly to each provider&apos;s API.
          </p>

          {FREE_PROVIDERS.filter((p) => p.requiresKey).map((provider) => (
            <div key={provider.id} className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{provider.name}</span>
                <span className="text-[11px] text-zinc-400">{provider.freeTierNote}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keys[provider.id] || ''}
                  onChange={(e) => setKeys({ ...keys, [provider.id]: e.target.value })}
                  placeholder={provider.keyPlaceholder}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleSave(provider.id)}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1"
                >
                  {savedId === provider.id ? <Check className="w-3.5 h-3.5" /> : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}