import assert from 'node:assert/strict';
import { buildNewsletterHtml } from '../src/lib/newsletterTemplate.js';
const render = (images, emailTemplate) => buildNewsletterHtml({
  communication: { subject: 'Gala', body: 'Mensagem do clube', images },
  subscriber: { unsubscribe_token: 'test-only' }, emailTemplate,
});
for (const template of ['standard', 'season_opening_2026_27']) {
  const html = render([{ url: 'https://example.com/first.jpg', caption: 'Sandrina & Direção' }, { url: 'https://example.com/second.jpg', caption: '<script>alert(1)</script>' }], template);
  assert.ok(html.indexOf('Mensagem do clube') < html.indexOf('https://example.com/first.jpg'));
  assert.ok(html.indexOf('first.jpg') < html.indexOf('second.jpg'));
  assert.ok(html.includes('Sandrina &amp; Direção'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Cancelar subscrição'));
  assert.ok(!render([{ url: 'javascript:alert(1)' }, {url:'http://example.com/insecure.jpg'}, null], template).includes('insecure.jpg'));
  assert.ok(!render([{url:'https://user:password@example.com/secret.jpg'}],template).includes('secret.jpg'));
  assert.ok(!render(Array.from({length:11}, (_,i)=>({url:`https://example.com/photo-${i}.jpg`})),template).includes('photo-10.jpg'));
  assert.doesNotThrow(() => render(undefined, template));
}
console.log('Newsletter images: templates, order, legacy compatibility and HTML/URL safety passed.');
