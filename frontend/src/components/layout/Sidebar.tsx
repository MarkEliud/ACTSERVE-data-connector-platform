'use client';

import { Nav } from 'react-bootstrap';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaTachometerAlt, 
  FaDatabase, 
  FaFileExport, 
  FaHistory, 
  FaCloudUploadAlt,
  FaCog 
} from 'react-icons/fa';

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
    { href: '/connections', icon: FaDatabase, label: 'Connections' },
    { href: '/extraction', icon: FaFileExport, label: 'New Extraction' },
    { href: '/extraction/history', icon: FaHistory, label: 'Extraction History' },
    { href: '/storage/files', icon: FaCloudUploadAlt, label: 'Storage' },
    { href: '/settings', icon: FaCog, label: 'Settings' },
  ];

  return (
    <div className={`sidebar bg-dark text-white vh-100 ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header p-3 border-bottom border-secondary">
        <h5 className="mb-0 text-center">Menu</h5>
      </div>
      <Nav className="flex-column p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          return (
            <Nav.Link
              key={item.href}
              as={Link}
              href={item.href}
              className={`text-white mb-1 ${isActive ? 'active bg-primary' : ''}`}
              style={{ borderRadius: '8px' }}
            >
              <Icon className="me-2" />
              {!collapsed && <span>{item.label}</span>}
            </Nav.Link>
          );
        })}
      </Nav>
    </div>
  );
}