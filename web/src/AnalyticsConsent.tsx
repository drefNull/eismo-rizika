import { useEffect, useState } from 'react';
import {
  flushPendingConsentGrant,
  markPendingConsentGrant,
  trackEvent,
} from './analytics';

const WEBSITE_ID = '69faf31a-65a3-40a6-b838-19ab1844c86d';
const HOSTNAME = 'eismorizika.balionidas.xyz';

type Consent = 'accepted' | 'rejected';

function readConsent(): Consent | null {
  const value = window.localStorage.getItem('rr.analytics-consent');
  return value === 'accepted' || value === 'rejected' ? value : null;
}

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent | null>(() => readConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isOpen = consent === null || settingsOpen;

  useEffect(() => {
    if (consent !== 'accepted' || document.getElementById('umami-script')) {
      flushPendingConsentGrant();
      return;
    }

    const script = document.createElement('script');
    script.id = 'umami-script';
    script.defer = true;
    script.src = 'https://cloud.umami.is/script.js';
    script.dataset.websiteId = WEBSITE_ID;
    script.dataset.domains = HOSTNAME;
    script.dataset.doNotTrack = 'true';
    script.dataset.excludeSearch = 'true';
    script.dataset.excludeHash = 'true';
    script.onload = () => flushPendingConsentGrant();

    document.head.appendChild(script);
  }, [consent]);

  const saveConsent = (value: Consent) => {
    const reload = consent === 'accepted' && value === 'rejected';

    if (consent !== 'accepted' && value === 'accepted') {
      markPendingConsentGrant();
    }

    window.localStorage.setItem('rr.analytics-consent', value);
    setConsent(value);
    setSettingsOpen(false);

    if (reload) {
      window.location.reload();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="privacy-settings-btn"
          onClick={() => {
            trackEvent('privacy_settings_open', { source: 'floating_button' });
            setSettingsOpen(true);
          }}
        >
          Privatumo nustatymai
        </button>
      )}

      {isOpen && (
        <section className="consent-banner" aria-live="polite">
          <div className="consent-banner-head">
            <div>
              <h2>{consent ? 'Privatumo nustatymai' : 'Analitikos sutikimas'}</h2>
            </div>
            {consent && (
              <button
                type="button"
                className="consent-banner-close"
                onClick={() => {
                  trackEvent('privacy_settings_close', { source: 'close_button' });
                  setSettingsOpen(false);
                }}
                aria-label="Uždaryti privatumo nustatymus"
              >
                ✕
              </button>
            )}
          </div>

          <p className="consent-banner-text">
            Jei sutinkate, įjungsime puslapių peržiūrų ir naudojimo analitiką,
            kad galėtume gerinti svetainę, pavyzdžiui matyti, kuriuos mygtukus
            spaudžiate ar kuriuos sluoksnius pasirenkate.
          </p>

          <p className="consent-banner-note">
            Pasirinkimą galite pakeisti bet kada.
          </p>

          <div className="consent-banner-actions">
            <button
              type="button"
              className="consent-choice-btn"
              onClick={() => saveConsent('rejected')}
            >
              Tik būtini
            </button>
            <button
              type="button"
              className="consent-choice-btn"
              onClick={() => saveConsent('accepted')}
            >
              Leisti analitiką
            </button>
          </div>
        </section>
      )}
    </>
  );
}
