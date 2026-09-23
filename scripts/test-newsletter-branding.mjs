import assert from 'node:assert/strict';
import {buildNewsletterHtml} from '../src/lib/newsletterTemplate.js';
for(const emailTemplate of ['standard','season_opening_2026_27']) {
const opts={communication:{subject:'Uma nova época, a mesma paixão',body:'A Boavista entra na época 2026/27 com ambição e espírito de equipa.\n\nAcompanha as notícias, os jogos e a formação da nossa comunidade.',newsletter_edition:1,newsletter_issued_at:'2026-09-23T12:00:00Z'},subscriber:{name:'Daniel',unsubscribe_token:'test&token'},emailTemplate};
const html=buildNewsletterHtml(opts);
assert.ok(html.includes('Edição n.º 1'));assert.ok(html.includes('23 de setembro de 2026'));
assert.equal((html.match(/A VOZ DA BOAVISTA/g)||[]).length,1);
assert.equal((html.match(/Cancelar subscrição/g)||[]).length,1);
assert.ok(html.includes('test%26token'));assert.ok(html.includes('/resultados'));
assert.ok(!html.includes('undefined'));
assert.ok(buildNewsletterHtml({...opts,communication:{}}).includes('Edição a atribuir no envio'));
}
console.log('Header, footer, edition/date, escaping and draft preview: passed.');
