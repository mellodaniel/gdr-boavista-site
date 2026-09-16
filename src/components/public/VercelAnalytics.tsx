import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';
import { publicAnalyticsPage } from '../../lib/vercel-analytics';

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const page = publicAnalyticsPage(event.url);
  return page ? { ...event, url: page.url } : null;
}

export function VercelAnalytics() {
  const { pathname } = useLocation();
  const page = import.meta.env.PROD
    ? publicAnalyticsPage(`${window.location.origin}${pathname}`)
    : null;

  if (!page) return null;

  // Explicit SPA routes disable automatic tracking, including subsequent admin navigation.
  return (
    <Analytics
      mode="production"
      configString={import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG}
      beforeSend={beforeSend}
      route={page.route}
      path={page.path}
    />
  );
}
