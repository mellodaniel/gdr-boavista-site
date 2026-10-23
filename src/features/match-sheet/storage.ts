import { MatchSheetRepository } from './repository.js';
import { supabase } from '../../lib/supabase';
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
  constructor(userId:string){
    super(userId,{
      read:()=>localRead<StoredSheet[]>(userId+':sheets'),
      write:records=>localWrite(userId+':sheets',records),
      online:()=>navigator.onLine,
      user:async()=>{const {data:{session}}=await supabase.auth.getSession();return session?.user.id;},
      list:async()=>{const {data,error}=await supabase.from('gdrb_match_sheets').select('*').order('updated_at',{ascending:false}).limit(200);if(error)throw new Error('Não foi possível carregar as fichas. Confirma a ligação e a ativação do módulo.');return data as SheetRow[];},
      get:async id=>{const {data,error}=await supabase.from('gdrb_match_sheets').select('*').eq('id',id).single();if(error)throw new Error('Não foi possível obter a versão do servidor.');return data as SheetRow;},
      upload:async record=>{const {data,error}=await supabase.rpc('gdrb_save_match_sheet',{p_document:record.document,p_revision:record.revision});return error?{error}:{revision:Number(data)};},
    });
  }
}
