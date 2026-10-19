import staticPages from './publicKnowledge.generated.json' with {type:'json'};

const SITE='https://gdrboavista.pt';
export const publicRoutes=['/clube','/noticias','/socios','/loja','/parceiros','/equipas','/galeria','/contactos','/app'];
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const plain = value => String(value??'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
// Explicit fields only, even if a table later gains private columns. No user-selected tables/SQL/URLs.
export const publicCollections=[
 {table:'gdrb_news',fields:'id,title,summary,content,published_at,is_published,status',filter:'is_published=eq.true&status=eq.published',order:'published_at.desc.nullslast,id.asc',route:'/noticias',title:'Notícias',valid:r=>r.is_published===true&&r.status==='published',name:r=>r.title,path:r=>uuid(r.id)?`/noticias/${r.id}`:'/noticias'},
 {table:'gdrb_shop_products',fields:'id,name,description,category,price,price_label,sizes,badge,stock_status,is_active',filter:'is_active=eq.true',route:'/loja',title:'Loja produtos preços tamanhos comprar equipamentos',valid:r=>r.is_active===true},
 {table:'gdrb_sponsors',fields:'id,name,description,website_url,sponsor_level,is_active',filter:'is_active=eq.true',route:'/parceiros',title:'Parceiros patrocinadores apoios',valid:r=>r.is_active===true},
 {table:'gdrb_teams',fields:'id,name,category,football_type,description,is_active',filter:'is_active=eq.true',route:'/equipas',title:'Equipas escalões formação',valid:r=>r.is_active===true},
 {table:'gdrb_roster_players',fields:'id,team_key,name,shirt_number,position,roster_group,height,birth_year,nationality,transfer_status,previous_club,is_active',filter:'is_active=eq.true&team_key=in.(senior,junior)',route:'/equipas',title:'Plantel jogadores equipa técnica treinador',valid:r=>r.is_active===true&&['senior','junior'].includes(r.team_key),path:r=>r.team_key==='junior'?'/equipas/juniores/plantel':'/equipas/seniores/plantel-2026-gdrb-7f4k'},
 {table:'gdrb_gallery_albums',fields:'id,title,description,event_date,category,is_published',filter:'is_published=eq.true',order:'event_date.desc.nullslast,id.asc',route:'/galeria',title:'Galeria álbuns fotografias fotos',valid:r=>r.is_published===true,name:r=>r.title,path:r=>uuid(r.id)?`/galeria/${r.id}`:'/galeria'},
 {table:'gdrb_tournaments',fields:'id,name,team_name,football_type,start_date,start_time,end_date,location,website_url,notes,tournament_type,is_visible,is_archived',filter:'is_visible=eq.true&is_archived=eq.false',order:'start_date.desc,id.asc',route:'/resultados',title:'Torneios calendário',valid:r=>r.is_visible===true&&r.is_archived===false},
 {table:'tournaments',fields:'id,name,slug,edition,age_group,birth_year,football_type,gender,location,address,description,contact_phone,contact_email,status,is_public',filter:'is_public=eq.true',route:'/resultados',title:'Torneios organização regulamento',valid:r=>r.is_public===true,path:r=>/^[a-z0-9-]+$/i.test(r.slug??'')?`/torneios/${r.slug}`:'/resultados'},
];

function termsFor(question,history) {
 const stop=new Set(['qual','quais','como','onde','quando','quem','para','pelo','pela','com','uma','uns','das','dos','que','tem','sao','esta','este','esse','isso','mais','sobre','quero','saber','boavista','clube']);
 const terms=normalize([question,...history.slice(-4).map(m=>m.text)].join(' ')).match(/[a-z0-9-]{3,}/g)||[];
 return [...new Set(terms.filter(t=>!stop.has(t)))].slice(0,60);
}
const score=(text,terms)=>terms.reduce((s,t)=>s+(normalize(text).includes(t)?1:0),0);
function excerpt(text,terms,max=4200) {
 if(text.length<=max)return {text,excerpt:false};
 const chunks=text.match(/[\s\S]{1,1100}/g)||[];
 const selected=chunks.map((text,index)=>({text,index,score:score(text,terms)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3).sort((a,b)=>a.index-b.index);
 return {text:selected.map(c=>c.text).join(' […] '),excerpt:true};
}

export async function loadPublicKnowledge({read,question,history=[],sourceId,maxBytes=24000}) {
 const terms=termsFor(question,history);
 const status=[];
 const docs=staticPages.map(p=>({title:p.title,path:p.path,text:p.text,category:p.title}));
 await Promise.all(publicCollections.map(async spec=>{
  let count=0,limited=false;
  const loaded=[];
  try {
   for(let offset=0;offset<600;offset+=200){
    const rows=await read(`${spec.table}?select=${spec.fields}&${spec.filter}&order=${spec.order||'id.asc'}&limit=200&offset=${offset}`);
    if(!Array.isArray(rows))throw Error('INVALID_PUBLIC_SOURCE');
    for(const row of rows.filter(spec.valid)) {
     // Project again: a mocked/misconfigured upstream must never smuggle extra columns.
     const safe=Object.fromEntries(spec.fields.split(',').filter(k=>k!=='id'&&!/^is_/.test(k)).map(k=>[k, row[k]??null]));
     loaded.push({title:plain(spec.name?spec.name(row):row.name),path:spec.path?spec.path(row):spec.route,category:spec.title,text:JSON.stringify(safe)});
    }
    count+=rows.length;
    if(rows.length<200)break;
    if(offset===400)limited=true;
   }
   docs.push(...loaded);
   status.push({category:spec.title,available:true,records:loaded.length,mayBeTruncated:limited});
  } catch { status.push({category:spec.title,available:false,records:null}); }
 }));
 const ranked=docs.map((doc,index)=>({...doc,index,rank:(doc.path==='/contactos'&&terms.some(t=>/morada|endereco|localiza|chegar|campo/.test(t))?100:0)+score(doc.title,terms)*5+score(doc.category,terms)*2+score(doc.text,terms)})).sort((a,b)=>b.rank-a.rank||a.index-b.index);
 const selected=[];
 let bytes=2;
 for(const doc of ranked) {
  const part=excerpt(doc.text,terms);
  const item={title:doc.title,...part};
  const size=Buffer.byteLength(JSON.stringify(item))+160;
  if(selected.length>=12||bytes+size>maxBytes)continue;
  selected.push({...item,sourceId:sourceId(doc.title,SITE+doc.path)});
  bytes+=size;
 }
 return {documents:selected,collections:status,selectionIsPartial:selected.length<docs.length,
  policy:'Só conteúdo público. Seleção por relevância; não é uma lista exaustiva. Se faltar um detalhe, indica a página correspondente. A galeria fornece descrições, não análise das imagens. Os torneios fornecem apresentação e ligação; consultar a página para jogos internos, regulamento, grupos e classificação. Nunca deduzir estatísticas de torneios a partir da apresentação.'};
}
