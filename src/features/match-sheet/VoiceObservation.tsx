import { useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { appendObservation, encodeWav, MAX_RECORDING_SECONDS } from './dictation.js';

type Props={accessKey:string;value:string;maxLength:number;disabled?:boolean;onAdd:(text:string)=>void};
type State='idle'|'permission'|'recording'|'transcribing'|'review';
export function VoiceObservation({accessKey,value,maxLength,disabled=false,onAdd}:Props){
  const [state,setState]=useState<State>('idle'),[seconds,setSeconds]=useState(0),[text,setText]=useState(''),[error,setError]=useState('');
  const generation=useRef(0),cleanup=useRef<()=>void>(()=>{}),stop=useRef<()=>void>(()=>{}),request=useRef<AbortController|null>(null),busy=useRef(false);
  function cancel(){generation.current++;cleanup.current();request.current?.abort();busy.current=false;setState('idle');setText('');setError('');}
  useEffect(()=>()=>{generation.current++;cleanup.current();request.current?.abort();},[]);
  useEffect(()=>{if(disabled)cancel();},[disabled]);
  useEffect(()=>{const hide=()=>{if(document.hidden&&(state==='recording'||state==='permission')){cancel();setError('Gravação cancelada ao sair da página.');}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[state]);
  async function transcribe(bytes:ArrayBuffer,id:number){
    if(id!==generation.current)return;
    setState('transcribing');const controller=new AbortController();request.current=controller;
    const timeout=window.setTimeout(()=>controller.abort(),45000);
    try{
      const parts=[];const buffer=new Uint8Array(bytes);for(let i=0;i<buffer.length;i+=8192)parts.push(String.fromCharCode(...buffer.subarray(i,i+8192)));
      const response=await fetch('/api/match-sheet-transcribe',{method:'POST',headers:{'Content-Type':'application/json','X-Match-Sheet-Key':accessKey},body:JSON.stringify({audio:btoa(parts.join(''))}),cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
      const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Não foi possível transcrever.');
      if(id!==generation.current)return;
      if(typeof result.text!=='string'||!result.text.trim())throw new Error('Não foi reconhecida fala. Tenta novamente.');
      setText(result.text.trim());setState('review');
    }catch(e){if(id===generation.current){setError(e instanceof Error&&e.name!=='AbortError'?e.message:'A ligação falhou ou demorou demasiado. Tenta novamente.');setState('idle');busy.current=false;}}
    finally{window.clearTimeout(timeout);}
  }
  async function start(){
    if(busy.current||disabled)return;
    if(!navigator.onLine){setError('Precisas de ligação à internet para transcrever. Podes continuar a escrever.');return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext){setError('Este navegador não permite gravar aqui. Usa o ditado do teclado ou escreve a observação.');return;}
    busy.current=true;const id=++generation.current;setError('');setText('');setSeconds(0);setState('permission');
    let stream:MediaStream|null=null,context:AudioContext|null=null,processor:ScriptProcessorNode|null=null,source:MediaStreamAudioSourceNode|null=null,gain:GainNode|null=null,timer=0,limit=0;
    const release=()=>{window.clearInterval(timer);window.clearTimeout(limit);if(processor){processor.onaudioprocess=null;processor.disconnect();}source?.disconnect();gain?.disconnect();stream?.getTracks().forEach(track=>track.stop());if(context&&context.state!=='closed')void context.close().catch(()=>{});};
    cleanup.current=release;
    try{
      context=new AudioContext();await context.resume();if(id!==generation.current){release();return;}
      stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if(id!==generation.current){release();return;}
      const sampleRate=context.sampleRate,chunks:Float32Array[]=[];let samples=0,finished=false;
      const finish=()=>{if(finished||id!==generation.current)return;finished=true;release();if(samples<sampleRate/2){setError('Grava pelo menos meio segundo.');setState('idle');busy.current=false;return;}void transcribe(encodeWav(chunks,sampleRate),id);};
      stop.current=finish;
      source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);gain=context.createGain();gain.gain.value=0;
      processor.onaudioprocess=e=>{if(finished)return;const input=e.inputBuffer.getChannelData(0),remaining=sampleRate*MAX_RECORDING_SECONDS-samples;const chunk=input.slice(0,Math.min(input.length,remaining));chunks.push(chunk);samples+=chunk.length;if(samples>=sampleRate*MAX_RECORDING_SECONDS)finish();};
      source.connect(processor);processor.connect(gain);gain.connect(context.destination);
      stream.getAudioTracks().forEach(track=>track.addEventListener('ended',()=>{if(!finished&&id===generation.current){cancel();setError('O microfone foi desligado. Grava novamente.');}},{once:true}));
      const began=Date.now();timer=window.setInterval(()=>setSeconds(Math.min(60,Math.floor((Date.now()-began)/1000))),250);limit=window.setTimeout(finish,60000);setState('recording');
    }catch(e){release();if(id===generation.current){setState('idle');busy.current=false;setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Permite o acesso ao microfone nas definições do navegador.':'Não foi possível iniciar o microfone. Podes continuar a escrever.');}}
  }
  function add(){try{onAdd(appendObservation(value,text,maxLength));cancel();}catch(e){setError(e instanceof Error?e.message:'Não foi possível adicionar.');}}
  return <div className="ms-voice">
    {state==='idle'&&<button type="button" disabled={disabled} onClick={()=>void start()}><Mic size={17}/>Ditar observação</button>}
    {state==='permission'&&<p role="status">A aguardar autorização do microfone…</p>}
    {state==='recording'&&<div className="ms-voice-recording"><span role="status">● A gravar · {seconds===60?'01:00':`00:${String(seconds).padStart(2,'0')}`} / 01:00</span><button type="button" onClick={()=>stop.current()}><Square size={16}/>Parar</button></div>}
    {state==='transcribing'&&<p role="status">A transcrever…</p>}
    {state==='review'&&<div><label>Rever transcrição<textarea rows={3} value={text} onChange={e=>setText(e.target.value)}/></label><p className="ms-small">Revê o texto. Será acrescentado numa nova linha, sem apagar as observações.</p><button type="button" className="ms-primary" disabled={disabled||!text.trim()} onClick={add}>Adicionar às observações</button></div>}
    {state!=='idle'&&<button type="button" onClick={cancel}><X size={16}/>Cancelar</button>}
    {state==='idle'&&!disabled&&<p className="ms-small">Até 60 segundos. O áudio é enviado à OpenAI para transcrição; só o texto confirmado é guardado na ficha.</p>}
    {error&&<p className="ms-error" role="alert">{error}</p>}
  </div>;
}
