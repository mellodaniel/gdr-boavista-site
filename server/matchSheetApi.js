import { matchPresentation } from '../src/features/match-sheet/model.js';
import { makeMatchSheetPdf } from './matchSheetPdf.js';
import { sharedSheetAccess, serviceHeaders } from './matchSheetAccess.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createMatchSheetHandler({fetcher=fetch,env=process.env,pdf=makeMatchSheetPdf}={}){
  return async function handler(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
    const fail=(status,message)=>res.status(status).json({error:message});
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(405,'Método não permitido.');}
    let shared;try{shared=sharedSheetAccess(req,env);}catch(e){return fail(e.status,e.message);}
    const auth=req.headers.authorization;
    if(!shared&&(typeof auth!=='string'||!/^Bearer [A-Za-z0-9._-]+$/.test(auth)))return fail(401,'Abre o link completo partilhado pelo clube.');
    const base=(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key=env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
    if(!base||!key)return fail(503,'O módulo ainda não está configurado.');
    try {
      const headers=shared?serviceHeaders(env):{apikey:key,Authorization:auth,'Content-Type':'application/json'};
      let user={id:null};
      if(!shared){const authResponse=await fetcher(`${base}/auth/v1/user`,{headers,signal:AbortSignal.timeout(8000)});
      if(!authResponse.ok)return fail(401,'A sessão expirou. Entra novamente.');user=await authResponse.json();}
      let input=req.method==='POST'?req.body:req.query;
      if(typeof input==='string'){if(input.length>8000)return fail(413,'Pedido demasiado grande.');try{input=JSON.parse(input);}catch{return fail(400,'Pedido inválido.');}}
      if(!input||!uuid.test(input.id)||!Number.isSafeInteger(Number(input.revision))||Number(input.revision)<1)return fail(400,'Ficha ou versão inválida.');
      const response=await fetcher(`${base}/rest/v1/gdrb_match_sheets?id=eq.${input.id}&select=*`,{headers,signal:AbortSignal.timeout(8000)});
      if(!response.ok)return fail(503,'Não foi possível obter a ficha.');const rows=await response.json();const sheet=rows[0];
      // RLS evaluates the caller's JWT; a guessed ID never grants access.
      if(!sheet)return fail(404,'Ficha não encontrada ou sem acesso.');
      if(sheet.deleted_at)return fail(409,'Restaura a ficha do lixo antes de continuar.');
      if(sheet.revision!==Number(input.revision))return fail(409,'A ficha mudou. Atualiza-a antes de continuar.');
      if(req.method==='GET'){
        const file=await pdf(sheet.document,sheet.revision);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="GDRBoavista-Ficha-${sheet.document.date.replace(/[^0-9-]/g,'')}-v${sheet.revision}.pdf"`);return res.status(200).send(file);
      }
      if(!shared&&sheet.recorder_id!==user.id)return fail(403,'Só o responsável pela ficha pode enviá-la.');
      if(sheet.archived_at)return fail(409,'Retira a ficha do arquivo antes de enviar.');
      if(sheet.document.status!=='finished')return fail(409,'Finaliza a ficha antes de enviar.');
      const recipients=Array.isArray(input.recipients)?[...new Set(input.recipients.map(v=>typeof v==='string'?v.trim().toLowerCase():''))]:[];
      if(!uuid.test(input.requestId)||recipients.length<1||recipients.length>5||recipients.some(v=>v.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(v)||/[\r\n<>;,]/.test(v)))return fail(400,'Indica entre 1 e 5 endereços de email válidos.');
      const from=env.MATCH_SHEET_FROM||env.CONTACT_NOTIFICATION_FROM||env.NEWSLETTER_FROM;
      if(!env.RESEND_API_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||!from)return fail(503,'O envio por email ainda não está configurado pelo administrador.');
      const reserved=await fetcher(`${base}/rest/v1/rpc/gdrb_sheet_reserve_email`,{method:'POST',headers,body:JSON.stringify({p_id:input.requestId,p_sheet:sheet.id,p_revision:sheet.revision,p_recipients:recipients}),signal:AbortSignal.timeout(8000)});
      if(!reserved.ok){const problem=await reserved.json().catch(()=>({}));return fail(problem.code==='42501'?403:409,problem.code==='42501'?'Sem permissão para enviar esta ficha.':problem.message||'Não foi possível preparar o envio.');}
      const reservedData=await reserved.json();const delivery=Array.isArray(reservedData)?reservedData[0]:reservedData;if(delivery.status==='sent')return res.status(200).json({status:'sent',id:delivery.id});
      if(Date.now()-Date.parse(delivery.created_at)>23*60*60*1000)return fail(409,'Este envio antigo ficou por confirmar. Verifica o histórico antes de iniciar um novo envio.');
      const file=await pdf(sheet.document,sheet.revision);
      const sent=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`match-sheet/${input.requestId}`},body:JSON.stringify({from,to:recipients,subject:`Ficha de jogo | ${sheet.document.ageGroup} | ${matchPresentation(sheet.document,'Boavista').title} | v${sheet.revision}`.replace(/[\r\n]/g,' ').slice(0,240),text:`Segue em anexo a ficha interna de jogo do GDR Boavista.\nEscalão: ${sheet.document.ageGroup}\nAdversário: ${sheet.document.opponent}\nData: ${sheet.document.date}\nVersão: ${sheet.revision}\nResponsável: ${sheet.document.recorder}\n\nDocumento interno de acompanhamento.`,attachments:[{filename:`GDRBoavista-Ficha-v${sheet.revision}.pdf`,content:file.toString('base64')}] }),signal:AbortSignal.timeout(12000)});
      if(!sent.ok)return fail(502,'O serviço de email não confirmou o envio. Tenta novamente com os mesmos destinatários.');
      const result=await sent.json();
      const logged=await fetcher(`${base}/rest/v1/gdrb_match_sheet_deliveries?id=eq.${input.requestId}&user_id=${shared?'is.null':`eq.${user.id}`}`,{method:'PATCH',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({status:'sent',provider_id:result.id,sent_at:new Date().toISOString()}),signal:AbortSignal.timeout(5000)});
      if(!logged.ok)return fail(502,'O serviço aceitou o email, mas falta confirmar o histórico. Repete o envio com os mesmos destinatários para concluir sem duplicar.');
      return res.status(200).json({status:'sent',id:input.requestId});
    }catch{return fail(503,'A operação ficou por confirmar. Verifica a ligação e tenta novamente.');}
  };
}
