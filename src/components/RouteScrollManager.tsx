import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function forceScrollToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function RouteScrollManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    // Uma nova rota deve começar sempre no topo. Repetimos o reset depois
    // do primeiro paint para neutralizar restaurações tardias do browser.
    forceScrollToTop();

    const frameId = window.requestAnimationFrame(() => {
      forceScrollToTop();
    });

    const timeoutId = window.setTimeout(() => {
      forceScrollToTop();
    }, 0);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search]);

  return null;
}
