import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Sidebar } from './components/Sidebar'
import Topbar from './components/Topbar'
import LoginPage from './pages/LoginPage'

// Страницы из src/pages/
import Dashboard  from './pages/Dashboard'
import Products   from './pages/Products'
import ABCAnalysis from './pages/ABCAnalysis'
import Finance    from './pages/Finance'
import Settings   from './pages/Settings'

// Старые компоненты (пока оставляем до замены)
import { CostPrice }  from './components/CostPrice'
import { Deductions } from './components/Deductions'
import { Payouts }    from './components/Payouts'

import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider }    from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import './styles/design-system.css'
import './styles/Sidebar.css'
import './styles/Settings.css'
import './styles/Products.css'
import './App.css'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0A0A0B', color: '#F0F0F5', fontSize: 14 }}>
      Загрузка...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A0B' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', paddingTop: '38px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

const Placeholder = ({ title }: { title: string }) => (
  <div style={{ padding: 32, color: '#F0F0F5' }}>
    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{title}</h2>
    <p style={{ color: '#8B8B9A', marginTop: 8 }}>Раздел в разработке</p>
  </div>
)

function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <PrivateRoute>
            <PrivateLayout>
              <Routes>
                <Route path="/"            element={<Dashboard />} />
                <Route path="/products"    element={<Products />} />
                <Route path="/abc-analysis" element={<ABCAnalysis />} />
                <Route path="/finance"     element={<Finance />} />
                <Route path="/settings"    element={<Settings />} />
                <Route path="/cost-price"  element={<CostPrice />} />
                <Route path="/deductions"  element={<Deductions />} />
                <Route path="/payouts"     element={<Payouts />} />
                <Route path="/shipments"   element={<Placeholder title="Поставки" />} />
                <Route path="/reports"     element={<Placeholder title="Отчёты" />} />
                <Route path="/stores"      element={<Placeholder title="Магазины" />} />
                <Route path="/notifications" element={<Placeholder title="Уведомления" />} />
              </Routes>
            </PrivateLayout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Toaster position="bottom-right" toastOptions={{
            style: {
              background: '#111113', color: '#F0F0F5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, fontSize: 13,
            },
            success: { iconTheme: { primary: '#00D084', secondary: '#111113' } },
            error:   { iconTheme: { primary: '#FF6B6B', secondary: '#111113' } },
          }} />
          <AppRoutes />
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
