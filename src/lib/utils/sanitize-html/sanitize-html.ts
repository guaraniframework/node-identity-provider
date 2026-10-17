/**
 * Sanitizes an HTML string replacing the characteres used to perform XSS Attacks.
 *
 * @param html HTML string to be sanitized.
 * @returns Sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  const replacements: NodeJS.Dict<string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return html.replace(/[&<>"'/]/g, (substring) => replacements[substring]!);
}
