export function publicReader(env?:Record<string,string|undefined>): (table:string,query:URLSearchParams)=>Promise<Record<string,unknown>[]>;
export function pageResponse(path:string, options?:{template?:string;read?:ReturnType<typeof publicReader>}):Promise<{status:number;html:string;cache:string}>;
export function sitemapXml(read?:ReturnType<typeof publicReader>):Promise<string>;
