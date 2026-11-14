import { FileSystemTree } from '@webcontainer/api';

export interface StarterAppTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  entryFile: string;
  startCommand: string;
  suggestedPrompts: string[];
  tree: FileSystemTree;
}

const BASE_CONFIG_FILES: FileSystemTree = {
  'tailwind.config.js': {
    file: {
      contents: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,
    },
  },
  'postcss.config.js': {
    file: {
      contents: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    },
  },
  'index.html': {
    file: {
      contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  },
};

const BASE_SRC_BOOTSTRAP = {
  'index.css': {
    file: {
      contents: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    },
  },
  'main.tsx': {
    file: {
      contents: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
  },
};

export const STARTER_TEMPLATE: FileSystemTree = {
  'package.json': {
    file: {
      contents: JSON.stringify(
        {
          name: 'generated-app',
          private: true,
          version: '0.0.0',
          type: 'module',
          scripts: {
            dev: 'vite --host',
            build: 'vite build',
          },
          dependencies: {
            'lucide-react': '^0.460.0',
            react: '^18.3.1',
            'react-dom': '^18.3.1',
          },
          devDependencies: {
            '@types/react': '^18.3.12',
            '@types/react-dom': '^18.3.1',
            '@vitejs/plugin-react': '^4.3.3',
            autoprefixer: '^10.4.20',
            postcss: '^8.4.49',
            tailwindcss: '^3.4.15',
            typescript: '^5.6.3',
            vite: '^5.4.11',
          },
        },
        null,
        2
      ),
    },
  },
  'vite.config.ts': {
    file: {
      contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    },
  },
  ...BASE_CONFIG_FILES,
  src: {
    directory: {
      ...BASE_SRC_BOOTSTRAP,
      'App.tsx': {
        file: {
          contents: `import React from 'react';
import { Sparkles } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Ready to Build</h1>
        <p className="text-slate-400 text-sm">
          Describe the full-stack application you want to create in the chat panel, or pick a starter from the Gallery.
        </p>
      </div>
    </div>
  );
}
`,
        },
      },
    },
  },
};

export const STARTER_GALLERY: StarterAppTemplate[] = [
  {
    id: 'blank-react',
    name: 'Blank React + Tailwind',
    badge: 'Frontend',
    description: 'Clean Vite + React 18 + Tailwind CSS v3 + Lucide icons canvas ready for any prompt.',
    entryFile: 'src/App.tsx',
    startCommand: 'npm run dev',
    suggestedPrompts: [
      'Build a Kanban task board with status columns, priority badges, and localStorage persistence.',
      'Create a Markdown editor with live split preview, word count, and one-click HTML copy.',
    ],
    tree: STARTER_TEMPLATE,
  },
  {
    id: 'saas-dashboard',
    name: 'SaaS Metrics & Billing UI',
    badge: 'UI Kit',
    description: 'Interactive dark-mode SaaS dashboard with KPI cards, filterable revenue table, and CSV export.',
    entryFile: 'src/App.tsx',
    startCommand: 'npm run dev',
    suggestedPrompts: [
      'Add an interactive date-range filter and a modal to invite new team members.',
      'Add a subscription plan switcher comparing Starter, Pro, and Enterprise tiers.',
    ],
    tree: {
      ...STARTER_TEMPLATE,
      src: {
        directory: {
          ...BASE_SRC_BOOTSTRAP,
          'App.tsx': {
            file: {
              contents: `import React, { useState } from 'react';
import { ArrowUpRight, CreditCard, DollarSign, Search, Users } from 'lucide-react';

const TRANSACTIONS = [
  { id: 'INV-104', customer: 'Acme Robotics', plan: 'Pro', amount: '$49.00', status: 'Paid', date: '2026-11-12' },
  { id: 'INV-103', customer: 'Northstar Labs', plan: 'Enterprise', amount: '$299.00', status: 'Paid', date: '2026-11-11' },
  { id: 'INV-102', customer: 'Kite Studio', plan: 'Starter', amount: '$19.00', status: 'Pending', date: '2026-11-10' },
  { id: 'INV-101', customer: 'Veloce Cloud', plan: 'Pro', amount: '$49.00', status: 'Paid', date: '2026-11-09' },
];

export default function App() {
  const [query, setQuery] = useState('');
  const filtered = TRANSACTIONS.filter(
    (t) =>
      t.customer.toLowerCase().includes(query.toLowerCase()) ||
      t.plan.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revenue Overview</h1>
            <p className="text-sm text-slate-400">Real-time subscription metrics and recent invoices</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter customer or plan..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Monthly Recurring', value: '$14,820', delta: '+12.4%', icon: DollarSign },
            { label: 'Active Workspaces', value: '342', delta: '+8.1%', icon: Users },
            { label: 'Net Retention', value: '108.5%', delta: '+2.3%', icon: CreditCard },
          ].map((stat) => (
            <div key={stat.label} className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>{stat.label}</span>
                <stat.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="inline-flex items-center text-xs text-emerald-400">
                  {stat.delta} <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.id}</td>
                  <td className="px-4 py-3 font-medium">{row.customer}</td>
                  <td className="px-4 py-3 text-slate-300">{row.plan}</td>
                  <td className="px-4 py-3">{row.amount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={\`px-2 py-0.5 rounded-full text-xs \${
                        row.status === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }\`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`,
            },
          },
        },
      },
    },
  },
  {
    id: 'fullstack-express',
    name: 'Full-Stack Express + REST API',
    badge: 'Full-Stack',
    description: 'Node.js Express backend (port 3001) proxied by Vite (port 5173) with live CRUD endpoints.',
    entryFile: 'server/index.js',
    startCommand: 'npm run dev',
    suggestedPrompts: [
      'Add PUT /api/notes/:id to toggle completed status and a search filter on the frontend.',
      'Extend the Express API with tag categories and priority sorting.',
    ],
    tree: {
      'package.json': {
        file: {
          contents: JSON.stringify(
            {
              name: 'fullstack-express-app',
              private: true,
              version: '0.0.0',
              type: 'module',
              scripts: {
                dev: 'node server/index.js & vite --host',
                build: 'vite build',
              },
              dependencies: {
                cors: '^2.8.5',
                express: '^4.21.1',
                'lucide-react': '^0.460.0',
                react: '^18.3.1',
                'react-dom': '^18.3.1',
              },
              devDependencies: {
                '@types/react': '^18.3.12',
                '@types/react-dom': '^18.3.1',
                '@vitejs/plugin-react': '^4.3.3',
                autoprefixer: '^10.4.20',
                postcss: '^8.4.49',
                tailwindcss: '^3.4.15',
                typescript: '^5.6.3',
                vite: '^5.4.11',
              },
            },
            null,
            2
          ),
        },
      },
      'vite.config.ts': {
        file: {
          contents: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
`,
        },
      },
      ...BASE_CONFIG_FILES,
      server: {
        directory: {
          'index.js': {
            file: {
              contents: `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let notes = [
  { id: 1, title: 'Express server is live inside WebContainer', createdAt: new Date().toISOString() },
];

app.get('/api/notes', (_req, res) => {
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const item = { id: Date.now(), title, createdAt: new Date().toISOString() };
  notes = [item, ...notes];
  res.status(201).json(item);
});

app.delete('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  notes = notes.filter((n) => n.id !== id);
  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log('Express API listening on http://localhost:3001');
});
`,
            },
          },
        },
      },
      src: {
        directory: {
          ...BASE_SRC_BOOTSTRAP,
          'App.tsx': {
            file: {
              contents: `import React, { useEffect, useState } from 'react';
import { Plus, Server, Trash2 } from 'lucide-react';

interface Note {
  id: number;
  title: string;
  createdAt: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');

  const loadNotes = async () => {
    const res = await fetch('/api/notes');
    if (res.ok) setNotes(await res.json());
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setTitle('');
    loadNotes();
  };

  const handleDelete = async (id: number) => {
    await fetch(\`/api/notes/\${id}\`, { method: 'DELETE' });
    loadNotes();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-2.5">
          <Server className="w-5 h-5 text-indigo-400" />
          <h1 className="text-xl font-bold">Full-Stack Express + React Notes</h1>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Write a note to POST to /api/notes..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>

        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800"
            >
              <span className="text-sm">{note.title}</span>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-slate-500 hover:text-red-400 p-1"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`,
            },
          },
        },
      },
    },
  },
  {
    id: 'ai-chat-app',
    name: 'BYOK AI Chat Wrapper',
    badge: 'AI App',
    description: 'Ready-to-customize AI chat interface with system prompt selector and streaming message list.',
    entryFile: 'src/App.tsx',
    startCommand: 'npm run dev',
    suggestedPrompts: [
      'Connect this chat UI to OpenRouter streaming API with an inline API key input and markdown rendering.',
      'Add a persona switcher (Code Reviewer, SQL Expert, Copywriter) and chat export button.',
    ],
    tree: {
      ...STARTER_TEMPLATE,
      src: {
        directory: {
          ...BASE_SRC_BOOTSTRAP,
          'App.tsx': {
            file: {
              contents: `import React, { useState } from 'react';
import { Bot, Send, User } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! Ask me to connect an OpenAI-compatible API endpoint or customize this chat app.' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: userText },
      { role: 'assistant', text: \`Echo prototype: "\${userText}". Ask Open AI Studio to wire up live streaming!\` },
    ]);
    setInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-3.5 flex items-center gap-2">
        <Bot className="w-5 h-5 text-indigo-400" />
        <span className="font-semibold text-sm">AI Assistant Starter</span>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 space-y-4 overflow-y-auto">
        {messages.map((m, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              {m.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-indigo-400" />
              ) : (
                <User className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm leading-relaxed">
              {m.text}
            </div>
          </div>
        ))}
      </main>

      <form onSubmit={handleSend} className="border-t border-slate-800 p-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </form>
    </div>
  );
}
`,
            },
          },
        },
      },
    },
  },
];