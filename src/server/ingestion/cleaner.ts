/**
 * Safe technical cleanup utility.
 * Cleans web chrome, script tags, style tags, and excess whitespace
 * without paraphrasing or modifying authentic religious source text.
 */
export function cleanHtmlText(html: string): string {
  if (!html) return '';

  const withoutTags = html
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Remove scripts, styles, noscript, svg, head, header, footer, nav
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    // Convert break tags and paragraph ends to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    // Strip all remaining HTML tags (including multiline tags)
    .replace(/<[\s\S]*?>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Normalize whitespace while preserving paragraphs
    .replace(/[ \t]+/g, ' ');

  // Filter out stray UI/JS framework artifacts lines
  const cleanedLines = withoutTags
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      if (
        line.includes('x-cloak') ||
        line.includes('classList.toggle') ||
        line.includes('window.dispatchEvent') ||
        line.includes('CustomEvent') ||
        line.includes('data-fragment-base') ||
        line.includes('aria-labelledby')
      ) {
        return false;
      }
      return true;
    });

  return cleanedLines.join('\n\n').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}

/**
 * Normalizes text for deterministic content hashing.
 */
export function normalizeForHash(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
