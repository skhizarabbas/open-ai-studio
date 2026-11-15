import { FileSystemTree, WebContainer, WebContainerProcess } from '@webcontainer/api';

export type ProjectFileContent = string | Uint8Array;

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let projectServerProcess: WebContainerProcess | null = null;

function normalizeProjectPath(filePath: string): string {
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = cleanPath.split('/');
  if (!cleanPath || cleanPath.includes('\0') || parts.some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
    throw new Error('Invalid project file path.');
  }
  return parts.join('/');
}

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance;
  if (bootPromise) return bootPromise;

  bootPromise = WebContainer.boot().then((instance) => {
    webcontainerInstance = instance;
    return instance;
  });

  return bootPromise;
}

export async function mountFiles(tree: FileSystemTree): Promise<void> {
  const wc = await getWebContainer();
  await wc.mount(tree);
}

export async function resetProjectFiles(): Promise<void> {
  const wc = await getWebContainer();
  const entries = await wc.fs.readdir('.', { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    await wc.fs.rm(entry.name, { recursive: true, force: true });
  }
}

export async function writeFile(filePath: string, content: ProjectFileContent): Promise<void> {
  const wc = await getWebContainer();
  const cleanPath = normalizeProjectPath(filePath);
  const parts = cleanPath.split('/');
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/');
    await wc.fs.mkdir(dir, { recursive: true });
  }
  await wc.fs.writeFile(cleanPath, content);
}

export async function readFile(filePath: string): Promise<string> {
  const wc = await getWebContainer();
  const cleanPath = normalizeProjectPath(filePath);
  return await wc.fs.readFile(cleanPath, 'utf-8');
}

export async function listProjectFiles(dir = ''): Promise<string[]> {
  const wc = await getWebContainer();
  const entries = await wc.fs.readdir(dir || '.', { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const subFiles = await listProjectFiles(fullPath);
      results.push(...subFiles);
    } else {
      results.push(fullPath);
    }
  }

  return results.sort();
}

export async function captureProjectSnapshot(): Promise<Record<string, ProjectFileContent>> {
  const paths = await listProjectFiles();
  const snapshot: Record<string, ProjectFileContent> = {};
  for (const p of paths) {
    const bytes = await (await getWebContainer()).fs.readFile(p);
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      snapshot[p] = text.includes('\0') ? bytes : text;
    } catch {
      snapshot[p] = bytes;
    }
  }
  return snapshot;
}

export async function restoreProjectSnapshot(snapshot: Record<string, ProjectFileContent>): Promise<void> {
  await resetProjectFiles();
  for (const [filePath, content] of Object.entries(snapshot)) {
    await writeFile(filePath, content);
  }
}

export async function startProjectServer(
  command: string,
  onOutput?: (data: string) => void
): Promise<void> {
  await stopProjectServer();
  const wc = await getWebContainer();
  const process = await wc.spawn('jsh', ['-c', command]);
  projectServerProcess = process;
  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput?.(data);
      },
    })
  ).catch(() => undefined);
  void process.exit.then(() => {
    if (projectServerProcess === process) projectServerProcess = null;
  });
}

export async function stopProjectServer(): Promise<void> {
  const process = projectServerProcess;
  projectServerProcess = null;
  if (!process) return;
  process.kill();
  await process.exit.catch(() => undefined);
}

export async function runShellCommand(
  command: string,
  onOutput?: (data: string) => void
): Promise<{ exitCode: number; output: string }> {
  const wc = await getWebContainer();
  const process = await wc.spawn('jsh', ['-c', command]);
  let output = '';

  process.output.pipeTo(
    new WritableStream({
      write(data) {
        output += data;
        onOutput?.(data);
      },
    })
  );

  const exitCode = await process.exit;
  return { exitCode, output };
}

export async function onServerReady(callback: (port: number, url: string) => void): Promise<void> {
  const wc = await getWebContainer();
  wc.on('server-ready', (port, url) => {
    callback(port, url);
  });
}