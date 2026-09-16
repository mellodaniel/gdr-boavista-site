const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('src/lib/vercel-analytics.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const sandbox = { exports: {}, URL };
vm.runInNewContext(code, sandbox);
const page = sandbox.exports.publicAnalyticsPage;
assert.equal(page('https://gdrboavista.pt/galeria?email=private@example.com#token').url, 'https://gdrboavista.pt/galeria');
assert.equal(page('https://www.gdrboavista.pt/clube/').path, '/clube');
assert.equal(page('https://gdrboavista.pt/galeria/123-ab').route, '/galeria/:albumId');
assert.equal(page('https://gdrboavista.pt/noticias/123-ab').route, '/noticias/:id');
assert.equal(page('https://gdrboavista.pt/torneios/torneio-2026').route, '/torneios/:slug');
for (const path of ['/admin', '/admin/login', '/admin/galeria', '/newsletter/cancelar/private-token', '/equipas/seniores/plantel-2026-gdrb-7f4k', '/unknown']) {
  assert.equal(page(`https://gdrboavista.pt${path}`), null, path);
}
for (const url of ['http://localhost:5173/', 'https://preview.vercel.app/', 'http://gdrboavista.pt/', 'https://gdrboavista.pt.evil.test/', 'https://gdrboavista.pt:9999/', 'invalid']) {
  assert.equal(page(url), null, url);
}
console.log('Passed: public routes, SPA grouping, URL redaction, private routes and preview/local exclusion.');
