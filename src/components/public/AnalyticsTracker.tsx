import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnalyticsConsent, loadGoogleAnalytics, trackPageView } from '../../lib/analytics';

export function AnalyticsTracker() {
  const location = useLocation();
  const [consent, setConsent] = useState(getAnalyticsConsent());

  useEffect(() => {
    function handleConsentChange(event: Event) {
      const customEvent = event as CustomEvent<'accepted' | 'rejected'>;
      setConsent(customEvent.detail);
    }

    window.addEventListener('gdrb:analytics-consent-changed', handleConsentChange);

    return () => {
      window.removeEventListener(
        'gdrb:analytics-consent-changed',
        handleConsentChange,
      );
    };
  }, []);

  useEffect(() => {
    if (consent !== 'accepted') {
      return;
    }

    loadGoogleAnalytics();

    const timeoutId = window.setTimeout(() => {
      trackPageView(`${location.pathname}${location.search}`, document.title);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [consent, location.pathname, location.search]);

  return null;
}
