import { applySearchReplaceDiff } from './diff';
import { readFile, runShellCommand, writeFile } from './webcontainer';

export type ActionType = 'file' | 'diff' | 'shell';

export interface ParsedAction {
  type: ActionType;
  filePath?: string;
  content: string;
}

export interface ExecutionLog {
  action: ParsedAction;
  status: 'success' | 'error';
  message: string;
}

/**
 * Extracts completed <studioAction ...>...</studioAction> blocks from model output.
 */
export function parseStudioActions(llmOutput: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const actionRegex = /<studioAction\s+([^>]+)>([\s\S]*?)<\/studioAction>/g;
  let match: RegExpExecArray | null;

  while ((match = actionRegex.exec(llmOutput)) !== null) {
    const attrString = match[1];
    const body = match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, '');

    const typeMatch = attrString.match(/type=["'](file|diff|shell)["']/);
    const pathMatch = attrString.match(/filePath=["']([^"']+)["']/);

    if (typeMatch) {
      actions.push({
        type: typeMatch[1] as ActionType,
        filePath: pathMatch?.[1],
        content: body,
      });
    }
  }

  return actions;
}

/**
 * Executes parsed actions sequentially in WebContainer.
 */
export async function executeStudioActions(
  actions: ParsedAction[],
  onTerminalOutput?: (data: string) => void,
  onFileChanged?: (filePath: string) => void,
  onShellApproval?: (command: string) => boolean | Promise<boolean>
): Promise<ExecutionLog[]> {
  const logs: ExecutionLog[] = [];

  for (const action of actions) {
    try {
      if (action.type === 'file' && action.filePath) {
        await writeFile(action.filePath, action.content);
        onFileChanged?.(action.filePath);
        logs.push({
          action,
          status: 'success',
          message: `Wrote ${action.filePath}`,
        });
      } else if (action.type === 'diff' && action.filePath) {
        const existing = await readFile(action.filePath);
        const patched = applySearchReplaceDiff(existing, action.content);
        await writeFile(action.filePath, patched);
        onFileChanged?.(action.filePath);
        logs.push({
          action,
          status: 'success',
          message: `Patched ${action.filePath}`,
        });
      } else if (action.type === 'shell') {
        const approved = await onShellApproval?.(action.content);
        if (!approved) {
          throw new Error('Shell command was not approved.');
        }
        onTerminalOutput?.(`\r\n$ ${action.content}\r\n`);
        const { exitCode, output } = await runShellCommand(action.content, onTerminalOutput);
        if (exitCode !== 0) {
          throw new Error(`Command exited with code ${exitCode}:\n${output.slice(-600)}`);
        }
        logs.push({
          action,
          status: 'success',
          message: `Ran: ${action.content}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push({
        action,
        status: 'error',
        message: msg,
      });
      // Stop remaining actions if a build/install step fails so the self-healing loop can fix it
      break;
    }
  }

  return logs;
}