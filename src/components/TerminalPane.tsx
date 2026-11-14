import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

interface TerminalPaneProps {
  onTerminalReady: (writeFn: (data: string) => void) => void;
}

export function TerminalPane({ onTerminalReady }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
      },
      rows: 10,
    });

    term.open(containerRef.current);
    term.writeln('\x1b[36m[Open AI Studio]\x1b[0m Booting WebContainer...');

    onTerminalReady((data: string) => {
      term.write(data);
    });

    return () => {
      term.dispose();
    };
  }, [onTerminalReady]);

  return <div ref={containerRef} className="w-full h-44 bg-zinc-950 border-t border-zinc-800 p-2 overflow-hidden" />;
}