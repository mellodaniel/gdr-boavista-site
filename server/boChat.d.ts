import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TrainingSchedule } from '../src/lib/trainingSchedules.js';
export function createChatHandler(options: { env?: Record<string,string|undefined>; fetcher?: typeof fetch; knowledge: { schedules: TrainingSchedule[]; season: string; birthGroup: (year:string,currentYear:number)=>unknown } }): (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => Promise<void>;
