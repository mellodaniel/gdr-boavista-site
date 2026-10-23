import { readFile,writeFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files=(await readdir('dist/assets')).filter(f=>/\.(js|css|woff2?)$/.test(f)).map(f=>'/assets/'+f);
const assets=['/ficha-de-jogo','/logo-gdr-boavista-clean-1024.png',...files];
const hash=createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0,12);
const template=await readFile('public/ficha-sw.js','utf8');
await writeFile('dist/ficha-sw.js',template.replace("'gdrb-match-shell-dev'",JSON.stringify('gdrb-match-shell-'+hash)).replace("['/ficha-de-jogo','/logo-gdr-boavista-clean-1024.png']",JSON.stringify(assets)));
console.log(`Ficha: ${files.length} recursos preparados para utilização sem rede.`);
