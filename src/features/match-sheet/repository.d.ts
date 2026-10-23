import type {MatchSheet,StoredSheet,SheetRow,SheetAction} from './types';
type IO={read:()=>Promise<StoredSheet[]|undefined>;write:(records:StoredSheet[])=>Promise<void>;list:()=>Promise<SheetRow[]>;get:(id:string)=>Promise<SheetRow>;upload:(record:StoredSheet)=>Promise<{revision?:number;error?:{code:string;message?:string}}>;manage:(id:string,revision:number,action:SheetAction)=>Promise<SheetRow>;user:()=>Promise<string|undefined>;online:()=>boolean;schedule?:boolean};
export class MatchSheetRepository {
 constructor(userId:string,io:IO);readonly userId:string;records:StoredSheet[];
 subscribe(listener:()=>void):()=>void;
 load():Promise<void>;refresh():Promise<void>;save(document:MatchSheet):Promise<void>;sync():Promise<void>;replaceFromServer(id:string):Promise<MatchSheet>;stop():void;
 manage(id:string,action:SheetAction):Promise<MatchSheet>;
}
