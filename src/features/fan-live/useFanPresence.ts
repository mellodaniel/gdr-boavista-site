import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';

// Presence is scoped to the shared spectator link. No names or personal data are sent.
export function useFanPresence(token:string){
 const [onlineCount,setOnlineCount]=useState<number|null|undefined>(undefined);
 useEffect(()=>{
  setOnlineCount(undefined);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)){setOnlineCount(null);return;}
  let active=true;
  let channel:ReturnType<typeof supabase.channel>|null=null;
  async function connect(){
   try{
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    if(!active)return;
    const room=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    channel=supabase.channel(`fan-viewers:${room}`);
    let tracked=false;
    const count=()=>{
     if(!active||!tracked||!channel)return;
     const state=channel.presenceState();
     setOnlineCount(Object.values(state).reduce((total,connections)=>total+connections.length,0));
    };
    channel.on('presence',{event:'sync'},count).subscribe(async status=>{
     if(!active)return;
     if(status==='SUBSCRIBED'){
      tracked=(await channel?.track({viewing:true}))==='ok';
      count();
     }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
      tracked=false;
      setOnlineCount(null);
     }
    });
   }catch{
    if(active)setOnlineCount(null);
   }
  }
  void connect();
  return()=>{active=false;if(channel)void supabase.removeChannel(channel);};
 },[token]);
 return onlineCount;
}
