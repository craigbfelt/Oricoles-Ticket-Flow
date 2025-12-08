// Theme-related constants shared across the application

export const THEME_STORAGE_KEY = 'dashboardTheme';

// Logo position options
export type LogoPosition = 'left' | 'center' | 'right';
export type LogoLayout = 'horizontal' | 'stacked';

// Default theme settings - used for initialization and reset
export const defaultThemeSettings = {
  primaryColor: '#1e40af',
  secondaryColor: '#7c3aed',
  accentColor: '#f59e0b',
  primaryColorHSL: '212 85% 48%',
  secondaryColorHSL: '271 91% 65%',
  accentColorHSL: '38 92% 50%',
  colorTheme: 'custom' as const,
  fontFamily: 'system-ui',
  fontSize: 16,
  logoUrl: '/src/assets/oricol-logo.png',
  logoSize: 60,
  secondaryLogoUrl: '/src/assets/zerobitone-logo.png',
  secondaryLogoSize: 40,
  logoPosition: 'center' as LogoPosition,
  logoLayout: 'horizontal' as LogoLayout,
  showPrimaryLogo: true,
  showSecondaryLogo: false,
  layoutDensity: 'comfortable' as const,
  darkMode: false,
  // Sidebar colors (defaults from CSS)
  sidebarBackground: '215 28% 17%',
  sidebarForeground: '210 20% 98%',
  sidebarAccent: '217 32% 24%',
  sidebarAccentForeground: '210 20% 98%',
  sidebarBorder: '217 32% 24%',
  // Font colors
  headingColor: '215 25% 15%',
  textColor: '215 25% 15%',
  mutedTextColor: '215 16% 46%',
  linkColor: '212 85% 48%',
  // Navigation order
  navigationOrder: [] as string[],
  hiddenNavItems: [] as string[],
  // Ticket status colors (HSL format - matching CSS defaults)
  ticketStatusOpen: '212 85% 48%',
  ticketStatusInProgress: '45 93% 47%',
  ticketStatusPending: '38 92% 50%',
  ticketStatusResolved: '142 71% 45%',
  ticketStatusClosed: '215 16% 46%',
  // Ticket priority colors (HSL format - matching CSS defaults)
  ticketPriorityLow: '142 71% 45%',
  ticketPriorityMedium: '45 93% 47%',
  ticketPriorityHigh: '38 92% 50%',
  ticketPriorityUrgent: '0 72% 51%',
};

export type ThemeSettings = typeof defaultThemeSettings;
