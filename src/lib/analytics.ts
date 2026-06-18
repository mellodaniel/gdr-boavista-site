import { supabase } from './supabase';

const GA_MEASUREMENT_ID = 'G-OKQVJWQ387';
const CONSENT_STORAGE_KEY = 'gdrb_analytics_consent';
const VISITOR_STORAGE_KEY = 'gdrb_analytics_visitor_id';
const SESSION_STORAGE_KEY = 'gdrb_analytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type AnalyticsConsent = 'accepted' | 'rejected';

type SessionData = {
  id: string;
  expiresAt: number;
};

export type AnalyticsEventPayload = {
  eventName: string;
  pagePath?: string;
  pageTitle?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function createId() {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (!isBrowser()) {
    return null;
  }

  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);

  if (value === 'accepted' || value === 'rejected') {
    return value;
  }

  return null;
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === 'accepted';
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(
    new CustomEvent('gdrb:analytics-consent-changed', { detail: value }),
  );

  if (value === 'accepted') {
    loadGoogleAnalytics();
  }
}

function getVisitorId() {
  if (!isBrowser()) {
    return 'server';
  }

  const existingVisitorId = window.localStorage.getItem(VISITOR_STORAGE_KEY);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = createId();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);

  return visitorId;
}

function getSessionId() {
  if (!isBrowser()) {
    return 'server';
  }

  const now = Date.now();
  const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (storedSession) {
    try {
      const parsedSession = JSON.parse(storedSession) as SessionData;

      if (parsedSession.id && parsedSession.expiresAt > now) {
        const refreshedSession = {
          id: parsedSession.id,
          expiresAt: now + SESSION_TIMEOUT_MS,
        };

        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(refreshedSession),
        );

        return parsedSession.id;
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  const newSession = {
    id: createId(),
    expiresAt: now + SESSION_TIMEOUT_MS,
  };

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));

  return newSession.id;
}

function getDeviceType() {
  if (!isBrowser()) {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/tablet|ipad/.test(userAgent)) {
    return 'tablet';
  }

  if (/mobile|iphone|android/.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
}

function getBrowser() {
  if (!isBrowser()) {
    return 'unknown';
  }

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';

  return 'Outro';
}

function getOperatingSystem() {
  if (!isBrowser()) {
    return 'unknown';
  }

  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Mac OS X/.test(userAgent)) return 'macOS';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Linux/.test(userAgent)) return 'Linux';

  return 'Outro';
}

function getUtmParam(name: string) {
  if (!isBrowser()) {
    return null;
  }

  return new URLSearchParams(window.location.search).get(name);
}

export function loadGoogleAnalytics() {
  if (!isBrowser() || !hasAnalyticsConsent()) {
    return;
  }

  if (document.querySelector(`script[src*="${GA_MEASUREMENT_ID}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
}

export async function trackAnalyticsEvent(payload: AnalyticsEventPayload) {
  if (!isBrowser() || !hasAnalyticsConsent()) {
    return;
  }

  const pagePath = payload.pagePath ?? `${window.location.pathname}${window.location.search}`;
  const pageTitle = payload.pageTitle ?? document.title;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  loadGoogleAnalytics();

  window.gtag?.('event', payload.eventName, {
    page_path: pagePath,
    page_title: pageTitle,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    entity_name: payload.entityName,
    ...payload.metadata,
  });

  const { error } = await supabase.from('gdrb_analytics_events').insert({
    event_name: payload.eventName,
    page_path: pagePath,
    page_title: pageTitle,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
    entity_name: payload.entityName ?? null,
    visitor_id: visitorId,
    session_id: sessionId,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOperatingSystem(),
    referrer: document.referrer || null,
    utm_source: getUtmParam('utm_source'),
    utm_medium: getUtmParam('utm_medium'),
    utm_campaign: getUtmParam('utm_campaign'),
    metadata: payload.metadata ?? null,
  });

  if (error) {
    console.error('Erro ao registar evento de analytics:', error);
  }
}

export function trackPageView(pagePath?: string, pageTitle?: string) {
  return trackAnalyticsEvent({
    eventName: 'page_view',
    pagePath,
    pageTitle,
  });
}
