export const FEEDBACK_DURATION_MS=6000;
export function isTransientFeedback(value){return Boolean(value)&&!(typeof value==='object'&&value.type==='error');}
// Each notification owns its timer/listeners; cleanup prevents an older action hiding a newer result.
export function watchFeedback(value,dismiss,target=globalThis.document){
 if(!isTransientFeedback(value))return ()=>{};
 const timer=setTimeout(dismiss,FEEDBACK_DURATION_MS);
 const contextChanged=event=>{
  const element=event.target;
  if(element?.closest?.('[data-feedback]'))return;
  if(event.type==='popstate'||event.type==='hashchange'||element?.closest?.('a,button,input,select,textarea,[role="tab"],[role="button"]'))dismiss();
 };
 for(const name of ['click','input','change'])target?.addEventListener(name,contextChanged,true);
 const windowTarget=target?.defaultView;
 for(const name of ['popstate','hashchange'])windowTarget?.addEventListener(name,contextChanged);
 return ()=>{clearTimeout(timer);for(const name of ['click','input','change'])target?.removeEventListener(name,contextChanged,true);for(const name of ['popstate','hashchange'])windowTarget?.removeEventListener(name,contextChanged);};
}
