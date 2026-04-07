import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { trackEvent } from './analytics';
import AnalyticsConsent from './AnalyticsConsent';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import './global.css';

export default function App() {
  const [kofiOpen, setKofiOpen] = useState(false);

  function openKofi() {
    trackEvent('donation_modal_open', { source: 'header_button' });
    setKofiOpen(true);
  }

  function closeKofi(source: 'overlay' | 'close_button') {
    trackEvent('donation_modal_close', { source });
    setKofiOpen(false);
  }

  return (
    <BrowserRouter>
      <nav className="top-nav">
        <Link
          to="/"
          className="nav-brand"
          onClick={() => trackEvent('nav_click', { target: 'map', source: 'brand' })}
        >
          <img src="/eismo_rizika.svg" alt="" className="nav-brand-logo" />
          <span className="nav-brand-name">
            <span className="nav-brand-ink">Eismo</span>
            <span>rizika</span>
          </span>
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <NavLink to="/" end onClick={() => trackEvent('nav_click', { target: 'map', source: 'top_nav' })}>
              Žemėlapis
            </NavLink>
            <NavLink
              to="/dashboard"
              onClick={() => trackEvent('nav_click', { target: 'dashboard', source: 'top_nav' })}
            >
              Statistika
            </NavLink>
          </div>
          <button className="kofi-btn" onClick={openKofi}>
            Paremkite projektą
          </button>
        </div>
      </nav>

      {kofiOpen && (
        <div className="kofi-overlay" onClick={() => closeKofi('overlay')}>
          <div className="kofi-modal" onClick={e => e.stopPropagation()}>
            <button className="kofi-modal-close" onClick={() => closeKofi('close_button')}>✕</button>
            <iframe
              id="kofiframe"
              src="https://ko-fi.com/visvaldas/?hidefeed=true&widget=true&embed=true&preview=true"
              style={{ border: 'none', width: '100%', padding: '4px', background: '#f9f9f9' }}
              height="712"
              title="visvaldas"
            />
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>

      <AnalyticsConsent />
    </BrowserRouter>
  );
}
