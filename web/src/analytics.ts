const CONSENT_KEY = 'rr.analytics-consent';
const PENDING_CONSENT_GRANT_KEY = 'rr.analytics-consent-pending';

type AnalyticsValue = string | number | boolean;
type AnalyticsData = Record<string, AnalyticsValue>;

type UmamiTracker = {
  track: (eventName: string, eventData?: AnalyticsData) => void;
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

export function hasAnalyticsConsent() {
  return window.localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export function trackEvent(eventName: string, eventData?: AnalyticsData) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.umami?.track(eventName, eventData);
}

export function markPendingConsentGrant() {
  window.localStorage.setItem(PENDING_CONSENT_GRANT_KEY, 'accepted');
}

export function flushPendingConsentGrant() {
  if (
    window.localStorage.getItem(PENDING_CONSENT_GRANT_KEY) !== 'accepted' ||
    !window.umami
  ) {
    return;
  }

  window.umami.track('analytics_enabled', { source: 'consent_banner' });
  window.localStorage.removeItem(PENDING_CONSENT_GRANT_KEY);
}
