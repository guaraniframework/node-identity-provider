import { sanitizeHtml } from './sanitize-html';

describe('sanitizeHtml()', () => {
  it('should sanitize the provided Html string.', () => {
    expect(sanitizeHtml('&<>"\'/hello')).toEqual('&amp;&lt;&gt;&quot;&#39;&#x2F;hello');
  });
});
