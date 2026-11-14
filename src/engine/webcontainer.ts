import { FileSystemTree, WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

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

export async function writeFile(filePath: string, content: string): Promise<void> {
  const wc = await getWebContainer();
  const cleanPath = filePath.replace(/^\/+/, '');
  const parts = cleanPath.split('/');
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/');
    await wc.fs.mkdir(dir, { recursive: true });
  }
  await wc.fs.writeFile(cleanPath, content);
}

export async function readFile(filePath: string): Promise<string> {
  const wc = await getWebContainer();
  const cleanPath = filePath.replace(/^\/+/, '');
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