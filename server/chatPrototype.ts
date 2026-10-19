import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { createChatHandler } from './boChat.js';
import { formationSchedules, footballElevenSchedules, TRAINING_SEASON } from '../src/lib/trainingSchedules';
import { findTrainingGroup } from '../src/lib/trainingEligibility';
export function chatPrototype(): Plugin {
 return { name:'bo-local-server', configureServer(server) {
  const env={...loadEnv('production',server.config.root,''),...loadEnv(server.config.mode,server.config.root,''),NODE_ENV:'development'};
  const handler=createChatHandler({env,knowledge:{schedules:[...formationSchedules,...footballElevenSchedules],season:TRAINING_SEASON,birthGroup:findTrainingGroup}});
  server.middlewares.use(async(req,res,next)=>{
   const path=new URL(req.url||'/','http://localhost').pathname;
   if(path.includes('.chat-private')||path.startsWith('/server/')){res.statusCode=403;res.end();return;}
   if(path==='/api/chat')return handler(req,res);
   return next();
  });
 }};
}
