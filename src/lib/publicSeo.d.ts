export type Seo = { path:string; title:string; description:string; canonical:string|null; image:string; type:string; noindex:boolean; status:number; paragraphs:string[]; schema:Record<string,unknown>|null };
export const SITE: string;
export const pages: Record<string,[string,string]>;
export function cleanPath(path:string):string;
export function plainText(value:unknown):string;
export function imageUrl(value:unknown):string|null;
export function baseSeo(path:string):Seo;
export function resolveSeo(path:string, read:(table:string, query:URLSearchParams)=>Promise<Record<string,unknown>[]>):Promise<Seo>;
