import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  BarChart2,
  Calculator, 
  FileText, 
  Settings, 
  Bell,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Truck,
  Store
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

// Типы для навигации
export type NavItemType = 'nav' | 'settings';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  badgeType?: 'danger' | 'warning' | 'success';
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Дашборд',        href: '/' },
  { icon: Package,         label: 'Товары',          href: '/products' },
  { icon: Calculator,      label: 'Юнит-экономика',  href: '/cost-price' },
  { icon: BarChart2,       label: 'ABC-анализ',      href: '/abc-analysis' },
  { icon: Wallet,          label: 'Финансы',         href: '/finance' },
  { icon: Truck,           label: 'Поставки',        href: '/shipments' },
  { icon: FileText,        label: 'Отчёты',          href: '/reports' },
];

const bottomNavItems: NavItem[] = [
  { icon: Store, label: 'Магазины', href: '/stores' },
  { icon: Bell, label: 'Уведомления', href: '/notifications', badge: '5', badgeType: 'warning' },
  { icon: Settings, label: 'Настройки', href: '/settings' },
];

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const NavItemComponent = ({ item, index }: { item: NavItem; index: number }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Link
          to={item.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            transition: 'all 0.15s ease',
            position: 'relative',
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            backgroundColor: isActive ? 'rgba(0, 208, 132, 0.1)' : 'transparent',
            borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            paddingLeft: isActive ? '10px' : '12px',
            fontWeight: isActive ? '600' : '500',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-card)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          {!isCollapsed && (
            <span style={{ fontSize: '14px', fontWeight: isActive ? '600' : '500', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          )}
          {!isCollapsed && item.badge && (
            <span
              style={{
                marginLeft: 'auto',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '12px',
                backgroundColor:
                  item.badgeType === 'danger' ? 'rgba(255, 107, 107, 0.15)' :
                  item.badgeType === 'warning' ? 'rgba(255, 184, 48, 0.15)' :
                  'rgba(0, 208, 132, 0.15)',
                color:
                  item.badgeType === 'danger' ? '#FF6B6B' :
                  item.badgeType === 'warning' ? '#FFB830' :
                  'var(--accent)',
              }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      </motion.div>
    );
  };

  return (
    <motion.aside
      initial={{ width: 260 }}
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{
        height: '100vh',
        paddingTop: '38px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ЛОГОТИП */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--accent)',
              flexShrink: 0,
              fontWeight: '700',
              fontSize: '16px',
              color: '#000',
              boxShadow: '0 0 20px rgba(0, 208, 132, 0.25)',
            }}
          >
            W
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                OSINOT
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>
                Analytics
              </p>
            </motion.div>
          )}
        </Link>
      </div>

      {/* ГЛАВНОЕ МЕНЮ */}
      <nav
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navItems.map((item, index) => (
          <NavItemComponent key={item.href} item={item} index={index} />
        ))}
      </nav>

      {/* НИЖНЕЕ МЕНЮ */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {bottomNavItems.map((item, index) => (
          <NavItemComponent key={item.href} item={item} index={navItems.length + index} />
        ))}
      </div>

      {/* КНОПКА СВЕРНУТЬ */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '80px',
          width: '24px',
          height: '24px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'all 0.15s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(0, 208, 132, 0.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
      >
        {isCollapsed ? (
          <ChevronRight style={{ width: '12px', height: '12px' }} />
        ) : (
          <ChevronLeft style={{ width: '12px', height: '12px' }} />
        )}
      </button>
    </motion.aside>
  );
};

