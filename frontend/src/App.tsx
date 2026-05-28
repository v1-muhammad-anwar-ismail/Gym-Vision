import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/dashboard/EditProfile';
import AccountSettings from './pages/dashboard/AccountSettings';
import AnalysisHistory from './pages/dashboard/AnalysisHistory';
import StatsProgress from './pages/dashboard/StatsProgress';
import AiSettings from './pages/dashboard/AiSettings';
import AiConfigDetail from './pages/dashboard/AiConfigDetail';
import ManageUsers from './pages/dashboard/ManageUsers';
import Analysis from './pages/dashboard/Analysis';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ContactUs from './pages/ContactUs';
import './index.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <ScrollToTop />
        <div className="app-container">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth />} />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={<Dashboard />}>
                <Route path="profile" element={<EditProfile />} />
                <Route path="account" element={<AccountSettings />} />
                <Route path="history" element={<AnalysisHistory />} />
                <Route path="stats" element={<StatsProgress />} />
                <Route path="ai-configs" element={<AiSettings />} />
                <Route path="ai-configs/:id" element={<AiConfigDetail />} />
                <Route path="users" element={<ManageUsers />} />
              </Route>
              
              {/* Other Routes */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/analysis" element={
                <div style={{ paddingTop: '80px', minHeight: '100vh' }}>
                  <div className="container">
                    <Analysis />
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
