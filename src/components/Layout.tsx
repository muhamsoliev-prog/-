import { Sidebar } from './Sidebar'
import Topbar from './Topbar'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => (
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
