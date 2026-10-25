import type { MatchSheet, SheetEvent, SheetTeam } from './types';
export const eventLabels: Record<SheetEvent['kind'],string>;
export function orderedEvents(sheet:MatchSheet):SheetEvent[];
export function eventMinute(event:SheetEvent):string;
export function clockAt(sheet:MatchSheet,now?:number):{period:number;minute:number;added:number;seconds:number;elapsedMs:number};
export function score(sheet:MatchSheet):{club:number;opponent:number};
export function lineup(sheet:MatchSheet):{onField:Set<string>;dismissed:Set<string>;used:Set<string>};
export function eventDescription(sheet:MatchSheet,event:SheetEvent):string;
export function validateSheet(sheet:MatchSheet):string|null;
export function newSheet(team:SheetTeam,recorder:string,now?:Date):MatchSheet;

export function matchPresentation(sheet:MatchSheet):{first:{name:string;goals:number};second:{name:string;goals:number};title:string;result:string};

export const MATCH_SHEET_CLUB_NAME: 'GDRBoavista';
