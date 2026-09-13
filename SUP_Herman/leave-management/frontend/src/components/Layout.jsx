import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FirIcon, IconDashboard, IconList, IconPlus, IconClipboard, IconCalendar,
  IconUsers, IconUser, IconMenu
} from './Icons';

const PAGE_TITLES = {
  '/': 'Tableau de bord',
  '/mes-demandes': 'Mes demandes',
  '/nouvelle-demande': 'Nouvelle demande',
  '/gestion-demandes': 'Gestion des demandes',
  '/calendrier': 'Calendrier global',
  '/utilisateurs': 'Gestion des utilisateurs',
  '/profil': 'Mon profil'
};

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'SUP Herman';

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : '';
  const roleLabel = { employee: 'Employé', manager: 'Manager', rh: 'Ressources Humaines' }[user?.role] || '';

  const NavItem = ({ to, icon, label, end }) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setOpen(false)}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="app-shell">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <FirIcon size={30} />
          <div>
            <div className="brand-name">SUP Herman</div>
            <div className="brand-sub">Congés &amp; absences</div>
          </div>
        </div>

        <div className="nav-group">
          <NavItem to="/" end icon={<IconDashboard />} label="Tableau de bord" />
          <NavItem to="/mes-demandes" icon={<IconList />} label="Mes demandes" />
          <NavItem to="/nouvelle-demande" icon={<IconPlus />} label="Nouvelle demande" />
        </div>

        {(user?.role === 'manager' || user?.role === 'rh') && (
          <div className="nav-group">
            <div className="nav-label">Encadrement</div>
            <NavItem to="/gestion-demandes" icon={<IconClipboard />} label="Gestion des demandes" />
          </div>
        )}

        <div className="nav-group">
          <NavItem to="/calendrier" icon={<IconCalendar />} label="Calendrier global" />
          {user?.role === 'rh' && <NavItem to="/utilisateurs" icon={<IconUsers />} label="Utilisateurs" />}
          <NavItem to="/profil" icon={<IconUser />} label="Mon profil" />
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-outline btn-sm mobile-menu-btn"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <IconMenu size={16} />
            </button>
            <h1>{title}</h1>
          </div>
          {user?.role !== 'rh' && (
            <div className="stat-sub">Solde restant : <strong style={{ color: 'var(--sapin-800)' }}>{user?.leave_balance} j</strong></div>
          )}
        </div>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
