export const MAX_RECORDING_SECONDS:60;
export const AUDIO_RATE:16000;
export function appendObservation(previous:string,comment:string,maxLength:number):string;
export function encodeWav(chunks:Float32Array[],sampleRate:number):ArrayBuffer;
