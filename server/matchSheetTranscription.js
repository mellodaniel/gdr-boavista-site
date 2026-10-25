import { sharedSheetAccess } from './matchSheetAccess.js';
const MAX_BYTES=44+16000*2*60;
export function validateRecording(audio) {
  if(typeof audio!=='string'||audio.length>Math.ceil(MAX_BYTES/3)*4||!audio.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(audio))throw new Error('Gravação inválida ou demasiado longa.');
  const wav=Buffer.from(audio,'base64');
  if(wav.length<44+16000||wav.length>MAX_BYTES||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,16)!=='WAVEfmt '||wav.readUInt32LE(4)!==wav.length-8||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==16000||wav.readUInt32LE(28)!==32000||wav.readUInt16LE(32)!==2||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44||(wav.length-44)%2)throw new Error('Usa uma gravação entre meio segundo e 60 segundos.');
  let energy=0;for(let i=44;i<wav.length;i+=2)energy+=(wav.readInt16LE(i)/32768)**2;
  if(Math.sqrt(energy/((wav.length-44)/2))<0.002)throw new Error('Não foi detetado áudio suficiente. Aproxima o microfone e tenta novamente.');
  return wav;
}
export function createTranscriptionHandler({env=process.env,fetcher=fetch,now=Date.now}={}) {
  // Best-effort per-instance burst protection; shared-link auth and file limits are enforced on every request.
  const requests=new Map();
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
    const fail=(status,error)=>res.status(status).json({error});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'Método não permitido.');}
    try {if(!sharedSheetAccess(req,env))return fail(401,'Abre a ficha através do link de acesso.');}catch(e){return fail(e.status||401,e.message);}
    if(!env.OPENAI_API_KEY)return fail(503,'O serviço de transcrição ainda não está configurado.');
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return fail(415,'Formato inválido.');
    let wav;
    try {
      let body=req.body;
      if(typeof body==='string'){if(body.length>2600000)return fail(413,'Gravação demasiado grande.');body=JSON.parse(body);}
      wav=validateRecording(body?.audio);
    }catch(e){return fail(400,e.message||'Gravação inválida.');}
    const time=now();for(const [key,entry] of requests)if(time-entry.start>=60000)requests.delete(key);
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').slice(0,200);
    const entry=requests.get(ip)||{start:time,count:0};
    if(entry.count>=10||requests.size>2000)return fail(429,'Demasiados pedidos. Aguarda um minuto e tenta novamente.');
    entry.count++;requests.set(ip,entry);
    const form=new FormData();form.append('file',new Blob([wav],{type:'audio/wav'}),'observacao.wav');form.append('model','gpt-4o-mini-transcribe');form.append('language','pt');form.append('response_format','json');
    try {
      const response=await fetcher('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},body:form,signal:AbortSignal.timeout(40000)});
      if(!response.ok)return fail(response.status===429?429:502,'Não foi possível transcrever. Tenta novamente mais tarde ou escreve a observação.');
      const data=await response.json();const text=typeof data.text==='string'?data.text.trim():'';
      if(!text)return fail(422,'Não foi reconhecida fala. Tenta gravar novamente.');
      if(text.length>8000)return fail(422,'A transcrição ficou demasiado longa. Grava um comentário mais curto.');
      return res.status(200).json({text});
    }catch{return fail(504,'A transcrição demorou demasiado ou a ligação falhou. Podes tentar gravar novamente.');}
  };
}
