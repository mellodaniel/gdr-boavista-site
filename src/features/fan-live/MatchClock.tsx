import {useEffect,useState} from 'react';
import type {FanMatch} from './types';
import {fanClockReading} from './clock-reading.js';

export function MatchClock({match,unavailable}:{match:FanMatch;unavailable:boolean}) {
  const [mountedAt]=useState(()=>performance.now());
  const receivedAt=match.receivedAtMs??mountedAt;
  const [now,setNow]=useState(mountedAt);
  useEffect(()=>{
    const tick=()=>setNow(performance.now());
    tick();
    const timer=window.setInterval(tick,1000);
    document.addEventListener('visibilitychange',tick);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
  },[receivedAt]);
  const reading=fanClockReading(match,now-receivedAt,unavailable);
  return <div className={`fl-match-clock${reading.stale?' is-stale':''}`} aria-label="Cronómetro do jogo">
    <span className="fl-match-clock-phase">{match.clock.period}.ª parte</span>
    <strong role="timer" aria-live="off" aria-label={`Tempo de jogo: ${reading.text}`}>{reading.text}</strong>
    <span className="fl-match-clock-status"><i className={reading.running?'is-running':''} aria-hidden="true"/>{reading.label}</span>
  </div>;
}
