import { FileSystemTree } from '@webcontainer/api';

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
  src: {
    directory: {
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
          Describe the full-stack application you want to create in the chat panel.
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