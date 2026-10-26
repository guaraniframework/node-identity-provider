/**
 * Sanitizes an Html string replacing the characteres used to perform XSS Attacks.
 *
 * @param html Html string to be sanitized.
 * @returns Sanitized Html string.
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
