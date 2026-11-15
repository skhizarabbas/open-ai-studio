import { captureProjectSnapshot } from './webcontainer';

const GITHUB_TOKEN_KEY = 'open_ai_studio_github_token';

export function getStoredGithubToken(): string {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

export function saveGithubToken(token: string): void {
  localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
}

const MAX_PROJECT_BYTES = 100 * 1024 * 1024;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_COUNT = 5000;

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function isEnvironmentFile(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase() || '';
  return /^\.env(?:\.|$)/.test(name) && name !== '.env.example';
}

export interface ImportedGithubProject {
  owner: string;
  repo: string;
  ref: string;
  repoUrl: string;
  files: Record<string, Uint8Array>;
}

function parseGithubRepositoryUrl(value: string): { owner: string; repo: string; ref?: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid public GitHub repository URL.');
  }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password) {
    throw new Error('Only HTTPS URLs on github.com are supported.');
  }

  let parts: string[];
  try {
    parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    throw new Error('The GitHub URL contains invalid path encoding.');
  }

  const owner = parts[0] || '';
  const repo = (parts[1] || '').replace(/\.git$/i, '');
  if (!/^[\w.-]{1,100}$/.test(owner) || !/^[\w.-]{1,100}$/.test(repo) || owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new Error('The URL must point to a GitHub repository, for example https://github.com/owner/repo.');
  }

  let ref = url.searchParams.get('ref') || undefined;
  if (parts.length > 2) {
    if (parts[2] !== 'tree' || parts.length !== 4 || ref) {
      throw new Error('Use a repository URL or a branch URL like https://github.com/owner/repo/tree/main.');
    }
    ref = parts[3];
  }
  if (ref && (ref.length > 250 || ref.startsWith('-') || ref.includes('\0'))) {
    throw new Error('The branch or tag name is invalid.');
  }

  return { owner, repo, ref };
}

interface GithubTreeEntry {
  path: string;
  type: string;
  size?: number;
}

function getImportableRepositoryPath(path: string): string | null {
  if (!path || path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
    throw new Error('The repository tree contains an unsafe file path.');
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
    throw new Error('The repository tree contains an unsafe file path.');
  }
  if (parts.some((part) => part === '.git' || part === 'node_modules')) return null;
  return isEnvironmentFile(path) ? null : path;
}

async function importGithubTreeFiles(
  owner: string,
  repo: string,
  ref: string,
  signal?: AbortSignal,
  onProgress?: (message: string) => void
): Promise<Record<string, Uint8Array>> {
  const treeResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: { Accept: 'application/vnd.github+json' }, signal }
  );
  if (!treeResponse.ok) {
    throw new Error(treeResponse.status === 404
      ? `Branch or tag "${ref}" was not found.`
      : `GitHub could not read the repository tree (${treeResponse.status}).`);
  }
  const treeData = await treeResponse.json();
  if (treeData.truncated) throw new Error('This repository tree is too large to import in one browser session.');

  const entries = (treeData.tree as GithubTreeEntry[])
    .filter((entry) => entry.type === 'blob')
    .map((entry) => ({ entry, path: getImportableRepositoryPath(entry.path) }))
    .filter((item): item is { entry: GithubTreeEntry; path: string } => item.path !== null);
  if (entries.length === 0) throw new Error('The repository contains no importable files.');
  if (entries.length > MAX_FILE_COUNT) throw new Error('This repository contains more than 5,000 importable files.');

  const declaredBytes = entries.reduce((sum, item) => sum + (item.entry.size || 0), 0);
  if (entries.some((item) => (item.entry.size || 0) > MAX_FILE_BYTES) || declaredBytes > MAX_PROJECT_BYTES) {
    throw new Error('The repository exceeds the configured file or total size limits.');
  }

  const files: Record<string, Uint8Array> = {};
  let cursor = 0;
  let fetchedBytes = 0;
  let completed = 0;
  let failure: Error | null = null;
  const encodedRef = ref.split('/').map(encodeURIComponent).join('/');

  const worker = async () => {
    while (!failure) {
      const item = entries[cursor++];
      if (!item) return;
      const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodedRef}/${encodedPath}`,
          { signal }
        );
        if (!response.ok) throw new Error(`Could not download ${item.path} (${response.status}).`);
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_FILE_BYTES) throw new Error(`${item.path} exceeds the 20 MB file limit.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_FILE_BYTES) throw new Error(`${item.path} exceeds the 20 MB file limit.`);
        fetchedBytes += bytes.byteLength;
        if (fetchedBytes > MAX_PROJECT_BYTES) throw new Error('The repository exceeds the 100 MB total download limit.');
        files[item.path] = bytes;
        completed += 1;
        if (completed === entries.length || completed % 10 === 0) {
          onProgress?.(`Downloading files (${completed}/${entries.length})...`);
        }
      } catch (error) {
        failure ||= error instanceof Error ? error : new Error(String(error));
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, () => worker()));
  if (failure) throw failure;
  return files;
}

export async function importPublicGithubRepository(
  input: string,
  options: { signal?: AbortSignal; onProgress?: (message: string) => void } = {}
): Promise<ImportedGithubProject> {
  const { owner, repo, ref: requestedRef } = parseGithubRepositoryUrl(input);
  const repositoryUrl = `https://github.com/${owner}/${repo}`;
  options.onProgress?.('Checking repository...');

  const metadataResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: options.signal,
  });
  if (!metadataResponse.ok) {
    throw new Error(metadataResponse.status === 404
      ? 'Repository not found or it is not public.'
      : `GitHub could not read repository metadata (${metadataResponse.status}).`);
  }
  const metadata = await metadataResponse.json();
  if (metadata.private || metadata.archived && !metadata.default_branch) {
    throw new Error('Only public repositories with an available branch can be imported.');
  }

  const ref = requestedRef || metadata.default_branch;
  if (typeof ref !== 'string' || !ref) throw new Error('GitHub did not report a default branch for this repository.');
  options.onProgress?.(`Reading ${owner}/${repo} (${ref})...`);
  const files = await importGithubTreeFiles(owner, repo, ref, options.signal, options.onProgress);
  return { owner, repo, ref, repoUrl: repositoryUrl, files };
}

export interface PushGithubOptions {
  token: string;
  repoName: string;
  description?: string;
  isPrivate: boolean;
}

export async function pushProjectToGithub({
  token,
  repoName,
  description = 'Generated with Open AI Studio',
  isPrivate,
}: PushGithubOptions): Promise<{ repoUrl: string }> {
  const cleanToken = token.trim();
  const cleanRepo = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  if (!cleanToken) throw new Error('GitHub Personal Access Token is required.');
  if (!cleanRepo) throw new Error('Repository name is required.');

  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // 1. Verify authenticated user
  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub authentication failed (${userRes.status}). Check your token permissions.`);
  }
  const user = await userRes.json();
  const owner: string = user.login;

  // 2. Create repository (auto_init: true creates an initial commit so Git Data API works immediately)
  const createRes = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: cleanRepo,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.json().catch(() => ({}));
    throw new Error(
      errBody?.errors?.[0]?.message ||
        errBody?.message ||
        `Failed to create repository (${createRes.status})`
    );
  }

  const repoData = await createRes.json();
  const defaultBranch: string = repoData.default_branch || 'main';

  // 3. Get base commit SHA on default branch
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/git/ref/heads/${defaultBranch}`,
    { headers }
  );
  if (!refRes.ok) {
    throw new Error('Could not read initial branch reference from GitHub.');
  }
  const refData = await refRes.json();
  const baseCommitSha: string = refData.object.sha;

  // 4. Create blobs for all WebContainer project files
  const files = await captureProjectSnapshot();
  const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

  for (const [path, content] of Object.entries(files)) {
    if (isEnvironmentFile(path)) continue;
    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/blobs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: encodeBase64(typeof content === 'string' ? new TextEncoder().encode(content) : content),
        encoding: 'base64',
      }),
    });
    if (!blobRes.ok) {
      throw new Error(`Failed to upload blob for ${path}`);
    }
    const blobData = await blobRes.json();
    treeItems.push({
      path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    });
  }

  // 5. Create new Git tree
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tree: treeItems,
    }),
  });
  if (!treeRes.ok) throw new Error('Failed to create Git tree on GitHub.');
  const treeData = await treeRes.json();

  // 6. Create commit pointing to the new tree
  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'feat: initial app generated by Open AI Studio',
      tree: treeData.sha,
      parents: [baseCommitSha],
    }),
  });
  if (!commitRes.ok) throw new Error('Failed to create commit on GitHub.');
  const commitData = await commitRes.json();

  // 7. Fast-forward branch ref to the new commit
  const updateRefRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/git/refs/heads/${defaultBranch}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: commitData.sha,
      }),
    }
  );
  if (!updateRefRes.ok) throw new Error('Failed to update branch pointer on GitHub.');

  return { repoUrl: repoData.html_url };
}