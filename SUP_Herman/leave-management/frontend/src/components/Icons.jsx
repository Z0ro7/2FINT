const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const FirIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#0B3D2E" />
    <path d="M32 10 L44 28 H38 L48 42 H40 L46 52 H18 L24 42 H16 L26 28 H20 Z" fill="#D7B98E" />
    <rect x="29" y="52" width="6" height="8" fill="#8C6529" />
  </svg>
);

export const IconDashboard = (p) => <svg {...common} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
export const IconList = (p) => <svg {...common} {...p}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" /></svg>;
export const IconPlus = (p) => <svg {...common} {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
export const IconClipboard = (p) => <svg {...common} {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="15" y2="15" /></svg>;
export const IconCalendar = (p) => <svg {...common} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>;
export const IconUsers = (p) => <svg {...common} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15.5 14.2c2.6.3 4.7 2.5 4.7 5.3" /></svg>;
export const IconUser = (p) => <svg {...common} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" /></svg>;
export const IconX = (p) => <svg {...common} {...p}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>;
export const IconCheck = (p) => <svg {...common} {...p}><polyline points="4 12 9 18 20 6" /></svg>;
export const IconMenu = (p) => <svg {...common} {...p}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>;
export const IconUpload = (p) => <svg {...common} {...p}><path d="M12 16V4M12 4l-4 4M12 4l4 4" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>;
