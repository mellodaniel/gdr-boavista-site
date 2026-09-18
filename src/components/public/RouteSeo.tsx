import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { baseSeo, resolveSeo, type Seo } from '../../lib/publicSeo.js';
function apply(seo: Seo) {
  document.title=seo.title;
  document.head.querySelectorAll('meta[property^="og:image:"]').forEach(el=>el.remove());
  const meta=(attr:'name'|'property',key:string,value:string)=>{
    let el=document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) { el=document.createElement('meta');el.setAttribute(attr,key);document.head.append(el); }
    el.content=value;
  };
  meta('name','description',seo.description);meta('name','robots',seo.noindex?'noindex, nofollow':'index, follow');
  for (const [key,value] of Object.entries({'og:title':seo.title,'og:description':seo.description,'og:url':seo.canonical||'','og:image':seo.image,'og:type':seo.type})) meta('property',key,value);
  for (const [key,value] of Object.entries({'twitter:title':seo.title,'twitter:description':seo.description,'twitter:image':seo.image})) meta('name',key,value);
  let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (seo.canonical) { if (!canonical) {canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);} canonical.href=seo.canonical; }
  else canonical?.remove();
  document.getElementById('page-schema')?.remove();
  if (seo.schema) {const script=document.createElement('script');script.id='page-schema';script.type='application/ld+json';script.textContent=JSON.stringify(seo.schema);document.head.append(script);}
}
export function RouteSeo() {
  const {pathname}=useLocation();
  useEffect(()=>{
    let cancelled=false;
    apply(baseSeo(pathname));
    void resolveSeo(pathname,async(table,query)=>{
      const url=import.meta.env.VITE_SUPABASE_URL;
      const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
      const result=await fetch(`${url}/rest/v1/${table}?${query}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
      if (!result.ok) throw new Error('Metadata unavailable');
      return result.json();
    }).then(seo=>{if(!cancelled)apply(seo);}).catch(()=>{/* Keep route-specific metadata during transient failures. */});
    return ()=>{cancelled=true;};
  },[pathname]);
  return null;
}
