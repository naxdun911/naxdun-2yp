import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Information from './pages/Information';
import NotFound from './pages/NotFound';
import AppTailwind from './pages/kiosk/AppTailwind';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 140px)' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/information" element={<Information />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/kiosk" element={<AppTailwind />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;