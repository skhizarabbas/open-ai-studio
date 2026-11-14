import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';

interface CodeEditorProps {
  filePath: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filePath,
  value,
  onChange,
  onSave,
}) => {
  const extensions = useMemo<Extension[]>(() => {
    const extList: Extension[] = [];
    const lower = filePath.toLowerCase();

    if (lower.endsWith('.tsx')) {
      extList.push(javascript({ jsx: true, typescript: true }));
    } else if (lower.endsWith('.ts')) {
      extList.push(javascript({ typescript: true }));
    } else if (lower.endsWith('.jsx')) {
      extList.push(javascript({ jsx: true }));
    } else if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
      extList.push(javascript());
    } else if (lower.endsWith('.css')) {
      extList.push(css());
    } else if (lower.endsWith('.json')) {
      extList.push(json());
    } else if (lower.endsWith('.html')) {
      extList.push(html());
    }

    if (onSave) {
      extList.push(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              onSave();
              return true;
            },
          },
        ])
      );
    }

    return extList;
  }, [filePath, onSave]);

  return (
    <div className="flex-1 min-w-0 h-full overflow-hidden bg-zinc-950">
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-editor]:bg-zinc-950 [&_.cm-gutters]:bg-zinc-950 [&_.cm-gutters]:border-r [&_.cm-gutters]:border-zinc-800 [&_.cm-scroller]:font-mono"
      />
    </div>
  );
};