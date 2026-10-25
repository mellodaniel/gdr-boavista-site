// Isolated UI fixture: synthetic audio only; never uses a microphone or paid service.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {VoiceObservation} from '../../src/features/match-sheet/VoiceObservation';
import '../../src/features/match-sheet/match-sheet.css';
let processor,deadline,active=0,calls=0;
const realTimeout=window.setTimeout.bind(window);
window.setTimeout=(fn,ms,...args)=>ms===60000?(deadline=fn,0):realTimeout(fn,ms,...args);
const update=()=>document.getElementById('metrics').textContent=`Microfones ativos: ${active} · Pedidos: ${calls}`;
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{active++;update();const track={stop:()=>{if(active){active--;update();}},addEventListener:()=>{}};return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}});
class FakeAudioContext{sampleRate=16000;state='running';resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}createMediaStreamSource(){return{connect(){},disconnect(){}};}createScriptProcessor(){processor={connect(){},disconnect(){},onaudioprocess:null};return processor;}createGain(){return{gain:{value:1},connect(){},disconnect(){}};}destination={};}
window.AudioContext=FakeAudioContext;
const realFetch=window.fetch.bind(window);
window.fetch=async(url,...args)=>{if(url!=='/api/match-sheet-transcribe')return realFetch(url,...args);calls++;update();return Response.json({text:'Boa pressão pelo corredor direito.'});};
function App(){const[value,setValue]=useState('Observação anterior.');return <main className="ms-app"><section className="ms-panel" style={{maxWidth:600,margin:'20px auto'}}><h1>Teste de ditado</h1><label>Observações<textarea value={value} onChange={e=>setValue(e.target.value)}/></label><VoiceObservation value={value} maxLength={4000} accessKey={'a'.repeat(48)} onAdd={setValue}/><p id="metrics">Microfones ativos: 0 · Pedidos: 0</p><button onClick={()=>processor?.onaudioprocess?.({inputBuffer:{getChannelData:()=>new Float32Array(16000).fill(.2)}})}>Simular um segundo</button><button onClick={()=>deadline?.()}>Simular limite de 60 segundos</button></section></main>}
createRoot(document.getElementById('root')).render(<App/>);
