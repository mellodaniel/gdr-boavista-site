export const CLUB_BADGE='/logo-gdr-boavista-clean-1024.png';
export function safeBadge(value){
 if(typeof value!=='string'||value.length>220000)return '';
 if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value;
 if(value.startsWith('/club-badges/')&&!value.includes('..')&&!/[?#]/.test(value))return value;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function opponentBadge(name,custom){
 const chosen=safeBadge(custom);if(chosen)return chosen;
 const n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 return ['adportomosense','portomosense','associacaodesportivaportomosense'].includes(n)?'/club-badges/ad-portomosense.png':'';
}
