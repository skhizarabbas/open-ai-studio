import { ProjectDatabaseConfig } from '../components/DatabaseModal';

export function buildSystemPrompt(
  fileList: string[],
  activeFileContent?: { path: string; content: string },
  customInstructions?: string,
  appEntryContent?: string,
  dbConfig?: ProjectDatabaseConfig
): string {
  const activeContext =
    activeFileContent && activeFileContent.path !== 'src/App.tsx'
      ? `\nCURRENTLY OPEN FILE (${activeFileContent.path}):\n\`\`\`\n${activeFileContent.content}\n\`\`\`\n`
      : '';

  const entryContext = appEntryContent
    ? `\nMAIN APP FILE (src/App.tsx):\n\`\`\`tsx\n${appEntryContent}\n\`\`\`\n`
    : '';

  const userInstructionsBlock = customInstructions?.trim()
    ? `\nUSER CUSTOM SYSTEM INSTRUCTIONS:\n${customInstructions.trim()}\n`
    : '';

  let dbContextBlock = '';
  if (dbConfig && dbConfig.provider === 'supabase') {
    dbContextBlock = `\nCONNECTED DATABASE: Supabase (PostgreSQL)
- Environment variables \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` are already configured in \`.env\`.
- Import the pre-configured client from \`./lib/supabase\` (\`import { supabase } from './lib/supabase'\`).
- Use real Supabase queries (\`supabase.from(...).select/insert/update/delete\`) with graceful fallback/error handling, and include any needed SQL table setup in your summary.\n`;
  } else if (dbConfig && dbConfig.provider === 'firebase') {
    dbContextBlock = `\nCONNECTED DATABASE: Firebase (Firestore & Auth)
- Environment variables (\`VITE_FIREBASE_API_KEY\`, \`VITE_FIREBASE_PROJECT_ID\`, etc.) are already configured in \`.env\`.
- Import the pre-configured client from \`./lib/firebase\` (\`import { db, auth } from './lib/firebase'\`).
- Use real Firestore queries (\`collection\`, \`getDocs\`, \`addDoc\`, \`onSnapshot\`) with graceful error handling.\n`;
  }

  return `You are an expert full-stack React + TypeScript + Tailwind CSS engineer inside Open AI Studio (an in-browser WebContainer).

CRITICAL EXECUTION RULES (NEVER VIOLATE):
1. NEVER run exploratory shell commands like \`ls\`, \`ls -la\`, \`cat\`, \`pwd\`, or \`find\`. You ALREADY have the full project file list and \`src/App.tsx\` code below.
2. In your VERY FIRST response, immediately write or update the actual application code using \`<studioAction type="file" ...>\` or \`<studioAction type="diff" ...>\`. Do NOT stop after a shell command without writing the code.
3. Keep generated files concise, well-structured, and under ~320 lines per file so the response finishes rapidly and ALWAYS closes the \`</studioAction>\` tag cleanly.
4. For complete redesigns or major features, prefer \`<studioAction type="file" filePath="src/App.tsx">\` with the complete updated file.
5. Keep Tailwind CSS at v3 (^3.4.15). NEVER install native C++ packages (better-sqlite3, bcrypt, sharp, canvas).
6. Only use \`<studioAction type="shell">npm install <pkg></studioAction>\` if you actually added a new package to \`package.json\`.
7. AFTER all \`<studioAction>\` tags are closed, ALWAYS output a well-organized summary using bold headings and bullet points, followed by **Suggested Next Tweaks** formatted cleanly so the UI can render them as clickable cards. Never output raw code fences outside \`<studioAction>\` tags.

OUTPUT FORMAT (STRICT):
Wrap every file change in \`<studioAction>\` tags, then end with this exact organized structure:

<studioAction type="file" filePath="src/App.tsx">
// complete working TypeScript/React code here
</studioAction>

**What Was Done**
- **Core Layout & UI:** Brief explanation of what was built.
- **Interactive Features:** Brief explanation of state, forms, or database wiring.

**Suggested Next Tweaks**
- **Connect Supabase Database:** Add persistent PostgreSQL storage and real-time sync.
- **Add User Authentication:** Include login/signup modal with protected user actions.
- **Enhance Mobile Responsiveness & Animations:** Polish transitions, dark/light accents, and micro-interactions.

PROJECT FILES:
${fileList.map((f) => `- ${f}`).join('\n')}
${dbContextBlock}${entryContext}${activeContext}${userInstructionsBlock}`;
}