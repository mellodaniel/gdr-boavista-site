import type { GdrbMatch, GdrbNews, GdrbSponsor, GdrbTournament } from '../types/database';
import { getLisbonDate, selectRecentResults, selectUpcomingMatches, selectUpcomingTournaments } from './homeAgenda.ts';
export type TvSponsor = Pick<GdrbSponsor, 'id'|'name'|'description'|'logo_url'|'website_url'> & { tv_message?: string|null; tv_contact?: string|null };
export type TvFeed = { sponsors: TvSponsor[]; news: Pick<GdrbNews,'id'|'title'|'summary'|'image_url'|'published_at'>[]; matches: GdrbMatch[]; tournaments: GdrbTournament[]; updated_at: string };
export type TvSlide =
 | { id:string; kind:'welcome'|'community'; seconds:number }
 | { id:string; kind:'sponsor'; sponsor:TvSponsor; seconds:number }
 | { id:string; kind:'news'; news:TvFeed['news'][number]; seconds:number }
 | { id:string; kind:'results'|'matches'; matches:GdrbMatch[]; seconds:number }
 | { id:string; kind:'tournaments'; tournaments:GdrbTournament[]; seconds:number };
export function plainText(value: string|null|undefined, max=240) {
 const text=(value || '').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
 return text.length>max ? text.slice(0,max-1).replace(/\s+\S*$/,'')+'…' : text;
}
export function safeImage(value:string|null|undefined) {
 try { const url=new URL(value || ''); return url.protocol==='https:' ? url.href : undefined; } catch { return undefined; }
}
export function contactWebsite(value:string|null|undefined) {
 try { const url=new URL(value || ''); if (!['http:','https:'].includes(url.protocol)) return ''; return (url.hostname.replace(/^www\./,'')+(url.hostname.includes('facebook.com') ? url.pathname : '')).slice(0,80); } catch { return ''; }
}
export function buildTvPlaylist(feed:TvFeed, now=new Date()):TvSlide[] {
 const today=getLisbonDate(now);
 const lisbonTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
 const content:TvSlide[]=[];
 const groups=(items:GdrbMatch[],kind:'results'|'matches')=>{ for(let i=0;i<items.length;i+=3) content.push({id:`${kind}-${items.slice(i,i+3).map(m=>m.id).join('-')}`,kind,matches:items.slice(i,i+3),seconds:20}); };
 groups(selectRecentResults(feed.matches,today),'results');
 groups(selectUpcomingMatches(feed.matches,today).filter(m => m.match_date>today || !m.match_time || minutes(m.match_time)>minutes(lisbonTime)-120).slice(0,15),'matches');
 // An explicit date is shown on every news item; unpublished/future news is filtered by the server.
 for(const news of feed.news.slice(0,5)) content.push({id:`news-${news.id}`,kind:'news',news,seconds:22});
 const tournaments=selectUpcomingTournaments(feed.tournaments,today).slice(0,6);
 for(let i=0;i<tournaments.length;i+=3) content.push({id:`tournaments-${i}`,kind:'tournaments',tournaments:tournaments.slice(i,i+3),seconds:20});
 content.push({id:'community',kind:'community',seconds:14});
 const sponsors=feed.sponsors.map(sponsor=>({id:`partner-${sponsor.id}`,kind:'sponsor' as const,sponsor,seconds:18}));
 const playlist:TvSlide[]=[{id:'welcome',kind:'welcome',seconds:12}];
 for(let i=0;i<Math.max(content.length,sponsors.length);i++) {
   if(content[i]) playlist.push(content[i]);
   if(sponsors[i]) playlist.push(sponsors[i]);
 }
 return playlist;
}
