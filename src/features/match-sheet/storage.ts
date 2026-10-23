import { MatchSheetRepository } from './repository.js';
import { workspaceRequest, type SharedAccess } from './shared-access';
import type { SheetRow, StoredSheet } from './types';

let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('gdrb-match-sheets',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('records');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{database=undefined;reject(request.error);};
  });
}
export async function localRead<T>(key:string):Promise<T|undefined> {
  const store=await db(); return new Promise((resolve,reject)=>{const r=store.transaction('records').objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function localWrite(key:string,value:unknown) {
  const store=await db();return new Promise<void>((resolve,reject)=>{const tx=store.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function localClear(userId:string) {
  const store=await db();return new Promise<void>((resolve,reject)=>{const tx=store.transaction('records','readwrite');const r=tx.objectStore('records').openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(String(c.key).startsWith(userId+':'))c.delete();c.continue();}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
export class SheetRepository extends MatchSheetRepository {
  constructor(access:SharedAccess){
    const userId=access.scope;
    const own=(row:SheetRow)=>({...row,recorder_id:userId});
    super(userId,{
      read:()=>localRead<StoredSheet[]>(userId+':sheets'),
      write:records=>localWrite(userId+':sheets',records),
      online:()=>navigator.onLine,
      user:async()=>access.scope,
      list:async()=>{const rows:SheetRow[]=[];for(let offset=0;;offset+=200){const page=await workspaceRequest<SheetRow[]>(access,{action:'list',offset});rows.push(...page.map(own));if(page.length<200)break;}return rows;},
      get:async id=>own(await workspaceRequest<SheetRow>(access,{action:'get',id})),
      upload:async record=>{try{return await workspaceRequest<{revision:number}>(access,{action:'save',document:record.document,revision:record.revision});}catch(error){return {error:{code:(error as {code?:string}).code||'NETWORK',message:(error as Error).message}};}},
      manage:async(id,revision,operation)=>own(await workspaceRequest<SheetRow>(access,{action:'manage',id,revision,operation})),
    });
  }
}
