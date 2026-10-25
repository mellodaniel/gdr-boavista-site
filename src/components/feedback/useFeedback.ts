import {useCallback,useEffect,useRef,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {watchFeedback} from './lifecycle.js';
export function useFeedback<T>(initial:T):[T,Dispatch<SetStateAction<T>>]{
 const empty=useRef(initial);
 const [state,setState]=useState({value:initial,revision:0});
 const setValue=useCallback<Dispatch<SetStateAction<T>>>(next=>setState(previous=>({value:typeof next==='function'?(next as (value:T)=>T)(previous.value):next,revision:previous.revision+1})),[]);
 const dismiss=useCallback(()=>setValue(empty.current),[setValue]);
 useEffect(()=>watchFeedback(state.value,dismiss),[state,dismiss]);
 return [state.value,setValue];
}
