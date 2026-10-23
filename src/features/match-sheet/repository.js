import {validateSheet} from './model.js';
export class MatchSheetRepository {
  records=[];listeners=new Set();saving=Promise.resolve();syncing=false;stopped=false;timer;
  constructor(userId,io){this.userId=userId;this.io=io;}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(){this.listeners.forEach(fn=>fn());}
  enqueue(action){const next=this.saving.catch(()=>{}).then(action);this.saving=next;return next;}
  async commit(records){await this.io.write(records);this.records=records;this.emit();}
  schedule(){if(this.io.schedule===false)return;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.sync().catch(()=>{}),600);}
  load(){return this.enqueue(async()=>{this.records=await this.io.read()||[];this.emit();});}
  async refresh(){
    const remote=await this.io.list();
    return this.enqueue(async()=>{let records=[...this.records];for(const row of remote){const local=records.find(r=>r.document.id===row.id);if(!local||(!local.dirty&&row.revision>local.revision))records=records.filter(r=>r.document.id!==row.id).concat(this.fromRemote(row));}await this.commit(records);});
  }
  fromRemote(row){return {document:row.document,revision:row.revision,localVersion:0,dirty:false,owner:row.recorder_id,updatedAt:row.updated_at,archivedAt:row.archived_at||null,deletedAt:row.deleted_at||null};}
  save(document){
    const snapshot=structuredClone(document);
    return this.enqueue(async()=>{
      const old=this.records.find(r=>r.document.id===snapshot.id);
      if(old&&old.owner!==this.userId)throw new Error('Esta ficha está a ser registada por outro responsável.');
      if(old?.archivedAt||old?.deletedAt)throw new Error('Restaura a ficha antes de a editar.');
      const record={...old,document:snapshot,revision:old?.revision||0,localVersion:(old?.localVersion||0)+1,dirty:true,owner:this.userId,updatedAt:new Date().toISOString(),error:old?.error,conflict:old?.conflict};
      await this.commit(this.records.filter(r=>r.document.id!==snapshot.id).concat(record));this.schedule();
    });
  }
  async sync(){
    await this.saving.catch(()=>{});
    if(this.syncing||this.stopped||!this.io.online())return;
    this.syncing=true;
    try{
      if(await this.io.user()!==this.userId)return;
      for(const id of this.records.filter(r=>r.dirty&&!r.conflict&&!r.archivedAt&&!r.deletedAt&&r.owner===this.userId&&!validateSheet(r.document)).map(r=>r.document.id)){
        if(this.stopped)return;
        const attempt=structuredClone(this.records.find(r=>r.document.id===id));
        const result=await this.io.upload(attempt).catch(()=>({error:{code:'NETWORK'}}));
        await this.enqueue(async()=>{
          const current=this.records.find(r=>r.document.id===id);if(!current||this.stopped)return;
          const record={...current};
          if(result.error){record.conflict=result.error.code==='40001';record.error=record.conflict?'Esta ficha foi alterada noutro dispositivo. Guarda uma cópia antes de carregar a versão do servidor.':result.error.code==='42501'?'Sem permissão para sincronizar este escalão.':result.error.code==='23505'?'Já existe uma ficha para este jogo da agenda. Abre a ficha existente ou revê a associação ao jogo.':result.error.code==='P0001'&&result.error.message?result.error.message:'Guardado neste dispositivo. Não foi possível sincronizar; tenta novamente.';}
          else {record.revision=result.revision;record.dirty=current.localVersion!==attempt.localVersion;record.error=undefined;record.conflict=false;}
          await this.commit(this.records.map(r=>r.document.id===id?record:r));
        });
      }
    }finally{this.syncing=false;}
    if(this.records.some(r=>r.dirty&&!r.error&&!r.archivedAt&&!r.deletedAt&&!validateSheet(r.document)))this.schedule();
  }
  manage(id,action){
    return this.enqueue(async()=>{
      const record=this.records.find(r=>r.document.id===id);
      if(!record||record.owner!==this.userId)throw new Error('Ficha não encontrada.');
      if(!['archive','unarchive','trash','restore'].includes(action))throw new Error('Ação inválida.');
      if(this.syncing)throw new Error('Aguarda a sincronização em curso.');
      if(record.revision===0&&['trash','restore'].includes(action)){
        const next={...record,deletedAt:action==='trash'?new Date().toISOString():null};
        await this.commit(this.records.map(r=>r.document.id===id?next:r));
        if(action==='restore')this.schedule();return next.document;
      }
      if(!this.io.online())throw new Error('Liga-te à internet para gerir esta ficha.');
      if(record.dirty||record.conflict)throw new Error('Sincroniza ou resolve as alterações antes de gerir a ficha.');
      const row=await this.io.manage(id,record.revision,action);
      await this.commit(this.records.map(r=>r.document.id===id?this.fromRemote(row):r));return row.document;
    });
  }
  async replaceFromServer(id){
    await this.saving.catch(()=>{});if(this.syncing)throw new Error('Aguarda a sincronização em curso.');
    const row=await this.io.get(id);
    return this.enqueue(async()=>{await this.commit(this.records.filter(r=>r.document.id!==id).concat(this.fromRemote(row)));return row.document;});
  }
  stop(){this.stopped=true;clearTimeout(this.timer);this.listeners.clear();}
}
