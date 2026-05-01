export const ROUTES = {
  HOME: '/',
  DEMO: '/demo',
  CLIENT_LOGIN: '/client-login',
  CLIENT_DASHBOARD: '/clients/dashboard',
  ADMIN_DASHBOARD: '/dashboard',
} as const;

export const NAV_ITEMS = [
  { label: 'Home', href: ROUTES.HOME },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
] as const;
