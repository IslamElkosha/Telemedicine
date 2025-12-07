import { User } from '../contexts/AuthContext';

export const ROLE_ROUTES = {
  patient: '/patient',
  doctor: '/doctor',
  technician: '/technician',
  admin: '/admin',
  hospital: '/hospital',
  'freelance-tech': '/freelance-tech'
} as const;

export const ROLE_NAMES = {
  patient: 'Patient',
  doctor: 'Doctor',
  technician: 'Technician',
  admin: 'Administrator',
  hospital: 'Hospital',
  'freelance-tech': 'Freelance Technician'
} as const;

export function getRoleDashboardRoute(role: User['role']): string {
  return ROLE_ROUTES[role] || `/${role}`;
}

export function getRoleName(role: User['role']): string {
  return ROLE_NAMES[role] || role;
}

export function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/login';
}

export function getRoleFromPath(pathname: string): User['role'] | null {
  if (pathname.startsWith('/patient')) return 'patient';
  if (pathname.startsWith('/doctor')) return 'doctor';
  if (pathname.startsWith('/technician')) return 'technician';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/hospital')) return 'hospital';
  if (pathname.startsWith('/freelance-tech')) return 'freelance-tech';
  return null;
}

export function canAccessRoute(userRole: User['role'], routePath: string): boolean {
  const requiredRole = getRoleFromPath(routePath);
  if (!requiredRole) return true;
  return userRole === requiredRole;
}
