const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SAFE_URL = /^(https?:\/\/|mailto:|\/|#)/i;

function inline(text: string) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
      SAFE_URL.test(url) ? `<a href="${url}">${label}</a>` : match,
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(?!\s)([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

/**
 * Renders the small Markdown subset allowed in plain-text CMS fields
 * (**bold**, *italic*, [links](url), blank-line paragraphs) to escaped HTML.
 */
export function inlineMarkdownToHtml(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => inline(paragraph.trim()))
    .filter(Boolean);
}
