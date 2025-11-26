import { useEffect } from 'react';
import { THEME_STORAGE_KEY, defaultThemeSettings } from '@/lib/theme-constants';

/**
 * Apply saved theme settings from localStorage to the document.
 * This ensures theme persists across page refreshes.
 */
const applyThemeFromStorage = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (!savedTheme) return;

  try {
    const theme = { ...defaultThemeSettings, ...JSON.parse(savedTheme) };
    const root = document.documentElement;

    // Apply colors using HSL values
    root.style.setProperty('--theme-primary', theme.primaryColorHSL);
    root.style.setProperty('--theme-secondary', theme.secondaryColorHSL);
    root.style.setProperty('--theme-accent', theme.accentColorHSL);

    // Also set the main primary/accent colors for actual component styling
    root.style.setProperty('--primary', theme.primaryColorHSL);
    root.style.setProperty('--accent', theme.accentColorHSL);

    // Apply sidebar colors
    root.style.setProperty('--sidebar-background', theme.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', theme.sidebarForeground);
    root.style.setProperty('--sidebar-accent', theme.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', theme.sidebarAccentForeground);
    root.style.setProperty('--sidebar-border', theme.sidebarBorder);

    // Apply font colors
    root.style.setProperty('--foreground', theme.textColor);
    root.style.setProperty('--muted-foreground', theme.mutedTextColor);
    root.style.setProperty('--card-foreground', theme.textColor);

    // Apply font
    root.style.setProperty('--theme-font-family', theme.fontFamily);
    root.style.setProperty('--theme-font-size', `${theme.fontSize}px`);

    // Apply layout density
    const spacing = theme.layoutDensity === 'compact' ? '0.75' : 
                   theme.layoutDensity === 'spacious' ? '1.25' : '1';
    root.style.setProperty('--theme-spacing', spacing);

    // Apply ticket status colors
    root.style.setProperty('--status-open', theme.ticketStatusOpen);
    root.style.setProperty('--status-in-progress', theme.ticketStatusInProgress);
    root.style.setProperty('--status-pending', theme.ticketStatusPending);
    root.style.setProperty('--status-resolved', theme.ticketStatusResolved);
    root.style.setProperty('--status-closed', theme.ticketStatusClosed);

    // Apply ticket priority colors
    root.style.setProperty('--priority-low', theme.ticketPriorityLow);
    root.style.setProperty('--priority-medium', theme.ticketPriorityMedium);
    root.style.setProperty('--priority-high', theme.ticketPriorityHigh);
    root.style.setProperty('--priority-urgent', theme.ticketPriorityUrgent);

    // Apply dark mode
    if (theme.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (error) {
    console.error('Error applying theme from storage:', error);
  }
};

/**
 * Hook to initialize theme from localStorage on app mount.
 * Should be called once at the app root level.
 */
export const useThemeInitializer = () => {
  useEffect(() => {
    applyThemeFromStorage();
  }, []);
};

// Also export a function that can be called immediately (before React mounts)
export { applyThemeFromStorage };
