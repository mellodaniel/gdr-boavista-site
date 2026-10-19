import { createChatHandler } from '../server/boChat.js';
import { formationSchedules, footballElevenSchedules, TRAINING_SEASON } from '../src/lib/trainingSchedules.js';
import { findTrainingGroup } from '../src/lib/trainingEligibility.js';
export default createChatHandler({ knowledge: { schedules: [...formationSchedules, ...footballElevenSchedules], season: TRAINING_SEASON, birthGroup: findTrainingGroup } });
