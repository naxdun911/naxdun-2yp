import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Information from './pages/Information';
import NotFound from './pages/NotFound';
import AppTailwind from './pages/kiosk/AppTailwind';

function AppContent() {
  const location = useLocation();
  const isKiosk = location.pathname.startsWith('/kiosk');

  return (
    <div className="App">
      {!isKiosk && <Navbar />}
      <main style={{ minHeight: 'calc(100vh - 140px)', paddingTop: !isKiosk ? '70px' : '0' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/information" element={<Information />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/kiosk" element={<AppTailwind />} />
        </Routes>
      </main>
      {!isKiosk && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;