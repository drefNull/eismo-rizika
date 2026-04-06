import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import AnalyticsConsent from './AnalyticsConsent';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import './global.css';

export default function App() {
  const [kofiOpen, setKofiOpen] = useState(false);

  return (
    <BrowserRouter>
      <nav className="top-nav">
        <Link to="/" className="nav-brand">
          <img src="/eismo_rizika.svg" alt="" className="nav-brand-logo" />
          <span className="nav-brand-name">
            <span className="nav-brand-ink">Eismo</span>
            <span>rizika</span>
          </span>
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <NavLink to="/" end>Žemėlapis</NavLink>
            <NavLink to="/dashboard">Statistika</NavLink>
          </div>
          <button className="kofi-btn" onClick={() => setKofiOpen(true)}>
            Paremkite projektą
          </button>
        </div>
      </nav>

      {kofiOpen && (
        <div className="kofi-overlay" onClick={() => setKofiOpen(false)}>
          <div className="kofi-modal" onClick={e => e.stopPropagation()}>
            <button className="kofi-modal-close" onClick={() => setKofiOpen(false)}>✕</button>
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
