import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

interface TerminalPaneProps {
  onTerminalReady: (writeFn: (data: string) => void) => void;
  isExpanded?: boolean;
}

export function TerminalPane({ onTerminalReady, isExpanded = false }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fontSize = 11;
    const term = new Terminal({
      convertEol: true,
      fontSize,
      cols: Math.max(20, Math.floor((container.clientWidth - 16) / (fontSize * 0.62))),
      rows: 51,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
      },
    });
    term.open(container);
    term.writeln('\x1b[36m[Open AI Studio]\x1b[0m Booting WebContainer...');

    onTerminalReady((data: string) => {
      term.write(data);
    });

    return () => {
      term.dispose();
    };
  }, [onTerminalReady]);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-zinc-950 border-t border-zinc-800 p-2 overflow-hidden ${
        isExpanded ? 'flex-1 min-h-0' : 'h-24 lg:h-32'
      }`}
    />
  );
}