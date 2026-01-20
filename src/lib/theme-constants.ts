// Theme-related constants shared across the application

export const THEME_STORAGE_KEY = 'dashboardTheme';

// Logo position options
export type LogoPosition = 'left' | 'center' | 'right';
export type LogoLayout = 'horizontal' | 'stacked';

// Default theme settings - used for initialization and reset
// Using vibrant custom color scheme: Primary #ff0f77, Secondary #64022c, Accent #00b0c7
export const defaultThemeSettings = {
  primaryColor: '#ff0f77',
  secondaryColor: '#64022c',
  accentColor: '#00b0c7',
  primaryColorHSL: '331 100% 53%',
  secondaryColorHSL: '342 97% 20%',
  accentColorHSL: '187 100% 39%',
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
  // Sidebar colors - Bright pink scheme for all users by default
  // Background: white, Text: bright pink (#f20262), Accent: lighter pink, Border: light gray
  sidebarBackground: '0 0% 100%',
  sidebarForeground: '337 98% 47%', // Bright pink #f20262
  sidebarAccent: '337 98% 95%', // Light pink background for active/hover
  sidebarAccentForeground: '337 98% 47%', // Bright pink text on hover
  sidebarBorder: '220 13% 91%', // Light gray border
  // Font colors
  headingColor: '337 98% 47%', // Bright pink #f20262 for headings
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
  // Dashboard card styling
  dashboardCardBackground: '0 0% 100%', // White
  dashboardCardTitleColor: '0 0% 0%', // Black
  dashboardCardIconBackground: '331 100% 53%', // Bright pink (#ff0f77)
  dashboardCardIconSize: 20, // Icon size in pixels (20-64) - smaller for compact layout
};

export type ThemeSettings = typeof defaultThemeSettings;
