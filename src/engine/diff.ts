export function applySearchReplaceDiff(originalContent: string, diffBlock: string): string {
  const blockRegex = /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;
  let updatedContent = originalContent;
  let match: RegExpExecArray | null;
  let appliedCount = 0;

  while ((match = blockRegex.exec(diffBlock)) !== null) {
    const searchPart = match[1];
    const replacePart = match[2];

    if (updatedContent.includes(searchPart)) {
      updatedContent = updatedContent.replace(searchPart, replacePart);
      appliedCount++;
    } else {
      // Fallback: normalize line endings and trim trailing spaces per line
      const normalize = (s: string) =>
        s
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .join('\n');
      const normOriginal = normalize(updatedContent);
      const normSearch = normalize(searchPart);
      if (normOriginal.includes(normSearch)) {
        updatedContent = normOriginal.replace(normSearch, normalize(replacePart));
        appliedCount++;
      } else {
        throw new Error(`SEARCH block did not match target file content:\n${searchPart.slice(0, 120)}...`);
      }
    }
  }

  if (appliedCount === 0) {
    throw new Error('No valid SEARCH/REPLACE blocks found in diff payload.');
  }

  return updatedContent;
}