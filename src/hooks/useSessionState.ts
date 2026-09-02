import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>): T {
  return typeof initialValue === 'function'
    ? (initialValue as () => T)()
    : initialValue;
}

function readSessionValue<T>(key: string, initialValue: InitialValue<T>): T {
  if (typeof window === 'undefined') {
    return resolveInitialValue(initialValue);
  }

  try {
    const storedValue = window.sessionStorage.getItem(key);
    if (storedValue !== null) {
      return JSON.parse(storedValue) as T;
    }
  } catch (error) {
    console.warn(`Não foi possível recuperar o estado temporário "${key}".`, error);
  }

  return resolveInitialValue(initialValue);
}

function writeSessionValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Não foi possível guardar o estado temporário "${key}".`, error);
  }
}

export function useSessionState<T>(
  key: string,
  initialValue: InitialValue<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readSessionValue(key, initialValue));

  // A persistência é feita no mesmo momento em que o estado é alterado.
  // Assim, se o utilizador navegar imediatamente para outra rota, os dados
  // já estão no sessionStorage antes de o componente ser desmontado.
  const setSessionState = useCallback<Dispatch<SetStateAction<T>>>(
    (nextState) => {
      setState((currentState) => {
        const resolvedState =
          typeof nextState === 'function'
            ? (nextState as (previousState: T) => T)(currentState)
            : nextState;

        writeSessionValue(key, resolvedState);
        return resolvedState;
      });
    },
    [key],
  );

  return [state, setSessionState];
}
