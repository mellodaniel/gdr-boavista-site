export const MAX_RECORDING_SECONDS=60;
export const AUDIO_RATE=16000;
export function appendObservation(previous,comment,maxLength) {
  const clean=comment.trim();
  if(!clean)throw new Error('A transcrição está vazia.');
  const result=previous+(previous?(previous.endsWith('\n')?'':'\n'):'')+clean;
  if(result.length>maxLength)throw new Error(`O texto ultrapassa o limite de ${maxLength} caracteres. Encurta o comentário antes de adicionar.`);
  return result;
}
export function encodeWav(chunks,sampleRate) {
  const count=chunks.reduce((sum,chunk)=>sum+chunk.length,0);
  const samples=new Float32Array(count);let offset=0;
  for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length;}
  const length=Math.min(AUDIO_RATE*MAX_RECORDING_SECONDS,Math.floor(count*AUDIO_RATE/sampleRate));
  const bytes=new ArrayBuffer(44+length*2),view=new DataView(bytes);
  const label=(at,text)=>{for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));};
  label(0,'RIFF');view.setUint32(4,36+length*2,true);label(8,'WAVE');label(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,AUDIO_RATE,true);view.setUint32(28,AUDIO_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);label(36,'data');view.setUint32(40,length*2,true);
  for(let i=0;i<length;i++){
    const start=Math.floor(i*sampleRate/AUDIO_RATE),end=Math.max(start+1,Math.floor((i+1)*sampleRate/AUDIO_RATE));
    let sum=0;for(let j=start;j<Math.min(end,count);j++)sum+=samples[j];
    const value=Math.max(-1,Math.min(1,sum/(Math.min(end,count)-start)));
    view.setInt16(44+i*2,value<0?value*32768:value*32767,true);
  }
  return bytes;
}
