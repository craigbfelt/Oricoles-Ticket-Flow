import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Image as ImageIcon, Upload, RotateCcw, Sun, Moon, PanelLeft, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Ticket, Trash2, AlignLeft, AlignCenter, AlignRight, LayoutGrid, Rows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { THEME_STORAGE_KEY, defaultThemeSettings, ThemeSettings, LogoPosition, LogoLayout } from "@/lib/theme-constants";

// Logo preview size constants
const MAX_LOGO_PREVIEW_HEIGHT = 100; // Maximum height in logo settings preview
const MAX_LIVE_PREVIEW_HEIGHT = 60; // Maximum height in live preview section

// Predefined color themes with HSL values
const colorThemes = {
  warm: {
    name: 'Warm',
    primary: '25 90% 55%',
    secondary: '45 85% 60%',
    accent: '15 85% 50%',
    sidebar: '25 30% 20%',
    sidebarText: '45 10% 95%',
  },
  cool: {
    name: 'Cool',
    primary: '210 85% 55%',
    secondary: '195 75% 50%',
    accent: '230 70% 60%',
    sidebar: '215 28% 17%',
    sidebarText: '210 20% 98%',
  },
  forest: {
    name: 'Forest',
    primary: '150 60% 40%',
    secondary: '120 50% 45%',
    accent: '90 55% 50%',
    sidebar: '150 30% 15%',
    sidebarText: '120 10% 95%',
  },
  ocean: {
    name: 'Ocean',
    primary: '200 80% 50%',
    secondary: '180 70% 45%',
    accent: '220 75% 55%',
    sidebar: '200 40% 18%',
    sidebarText: '195 15% 95%',
  },
  sunset: {
    name: 'Sunset',
    primary: '350 80% 55%',
    secondary: '30 85% 55%',
    accent: '15 90% 60%',
    sidebar: '350 30% 18%',
    sidebarText: '30 10% 95%',
  },
};

// Sidebar color presets
const sidebarPresets = {
  dark: { name: 'Dark Gray', background: '215 28% 17%', foreground: '210 20% 98%' },
  charcoal: { name: 'Charcoal', background: '220 15% 12%', foreground: '220 10% 95%' },
  navy: { name: 'Navy Blue', background: '225 50% 18%', foreground: '225 10% 95%' },
  slate: { name: 'Slate', background: '215 20% 25%', foreground: '215 10% 95%' },
  midnight: { name: 'Midnight', background: '230 30% 10%', foreground: '230 10% 95%' },
  olive: { name: 'Olive', background: '80 20% 20%', foreground: '80 10% 95%' },
  burgundy: { name: 'Burgundy', background: '350 40% 18%', foreground: '350 10% 95%' },
  teal: { name: 'Teal', background: '180 40% 18%', foreground: '180 10% 95%' },
};

// Use the shared default theme settings
const defaultTheme = defaultThemeSettings;

// Helper function to convert HSL string to hex
const hslToHex = (hsl: string): string => {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#000000';
  
  const hValue = parseFloat(parts[0]);
  const sValue = parseFloat(parts[1]);
  const lValue = parseFloat(parts[2]);
  
  const h = isNaN(hValue) ? 0 : hValue;
  const s = isNaN(sValue) ? 0 : sValue / 100;
  const l = isNaN(lValue) ? 0 : lValue / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Helper function to convert hex to HSL string
const hexToHsl = (hex: string): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Validate hex format - must be 6 characters and valid hex digits
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '0 0% 0%'; // Return black as fallback for invalid input
  }
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Color Picker Component with visual palette
interface ColorPickerProps {
  value: string; // HSL value
  onChange: (hsl: string) => void;
  label: string;
}

const ColorPicker = ({ value, onChange, label }: ColorPickerProps) => {
  const hexValue = hslToHex(value);
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    const newHsl = hexToHsl(newHex);
    onChange(newHsl);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-10 h-10 rounded-md border flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          style={{ backgroundColor: hexValue }}
          aria-label={`Select ${label}`}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <Label className="text-sm font-medium">{label}</Label>
          <input
            type="color"
            value={hexValue}
            onChange={handleColorChange}
            className="w-full h-32 cursor-pointer rounded border-0 p-0"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hex: {hexValue}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Default navigation items that can be reordered
const defaultNavItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Tickets", href: "/tickets" },
  { name: "IT Suppliers", href: "/it-suppliers" },
  { name: "Oricol CRM", href: "/crm" },
  { name: "Bluewave CRM", href: "/bluewave-crm" },
  { name: "Sage", href: "/sage" },
  { name: "Remote Support", href: "/remote-support" },
  { name: "Document Hub", href: "/document-hub" },
  { name: "Shared Files", href: "/shared-files" },
  { name: "Migrations", href: "/migrations" },
  { name: "Migration Tracker", href: "/migration-tracker" },
  { name: "Jobs", href: "/jobs" },
  { name: "Maintenance", href: "/maintenance" },
  { name: "Logistics", href: "/logistics" },
  { name: "Assets", href: "/assets" },
  { name: "Branches", href: "/branches" },
  { name: "Microsoft 365", href: "/microsoft-365" },
  { name: "Computers", href: "/hardware" },
  { name: "Software", href: "/software" },
  { name: "Licenses", href: "/licenses" },
  { name: "Provider Emails", href: "/provider-emails" },
  { name: "VPN", href: "/vpn" },
  { name: "RDP", href: "/rdp" },
  { name: "Nymbis RDP Cloud", href: "/nymbis-rdp-cloud" },
  { name: "Company Network", href: "/company-network" },
  { name: "Reports", href: "/reports" },
  { name: "Users", href: "/users" },
  { name: "Settings", href: "/settings" },
];

// Navigation Editor Component
interface NavigationEditorProps {
  navigationOrder: string[];
  hiddenNavItems: string[];
  onOrderChange: (order: string[]) => void;
  onHiddenChange: (hidden: string[]) => void;
}

const NavigationEditor = ({ navigationOrder, hiddenNavItems, onOrderChange, onHiddenChange }: NavigationEditorProps) => {
  // Get ordered items - use saved order or default
  const getOrderedItems = () => {
    if (navigationOrder.length === 0) {
      return defaultNavItems;
    }
    
    const orderedItems: typeof defaultNavItems = [];
    navigationOrder.forEach(href => {
      const item = defaultNavItems.find(i => i.href === href);
      if (item) orderedItems.push(item);
    });
    
    // Add any items not in the order (new items)
    defaultNavItems.forEach(item => {
      if (!orderedItems.find(i => i.href === item.href)) {
        orderedItems.push(item);
      }
    });
    
    return orderedItems;
  };

  const orderedItems = getOrderedItems();

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...orderedItems];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    onOrderChange(newOrder.map(item => item.href));
  };

  const toggleVisibility = (href: string) => {
    if (hiddenNavItems.includes(href)) {
      onHiddenChange(hiddenNavItems.filter(h => h !== href));
    } else {
      onHiddenChange([...hiddenNavItems, href]);
    }
  };

  const resetOrder = () => {
    onOrderChange([]);
    onHiddenChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={resetOrder}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Order
        </Button>
      </div>
      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
        {orderedItems.map((item, index) => {
          const isHidden = hiddenNavItems.includes(item.href);
          return (
            <div 
              key={item.href}
              className={`flex items-center justify-between p-3 ${isHidden ? 'opacity-50 bg-muted/50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className={`font-medium ${isHidden ? 'line-through' : ''}`}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === orderedItems.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleVisibility(item.href)}
                >
                  {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Use the arrows to reorder menu items. Click the eye icon to hide/show items. 
        Hidden items will not appear in the sidebar navigation.
      </p>
    </div>
  );
};

export const ThemeCustomizer = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [theme]);

  const loadTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setTheme({ ...defaultTheme, ...parsed });
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    }
  };

  const saveTheme = () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    toast({
      title: "Theme Saved",
      description: "Your customizations have been saved successfully",
    });
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem(THEME_STORAGE_KEY);
    toast({
      title: "Theme Reset",
      description: "Theme has been reset to default settings",
    });
  };

  const applyTheme = () => {
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
    const spacing = (theme.layoutDensity as string) === 'compact' ? '0.75' : 
                   (theme.layoutDensity as string) === 'spacious' ? '1.25' : '1';
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
  };

  const handleColorThemeChange = (themeName: keyof typeof colorThemes | 'custom') => {
    if (themeName === 'custom') {
      setTheme({ ...theme, colorTheme: 'custom' as any });
    } else {
      const selectedTheme = colorThemes[themeName];
      setTheme({
        ...theme,
        colorTheme: themeName as any,
        primaryColorHSL: selectedTheme.primary,
        secondaryColorHSL: selectedTheme.secondary,
        accentColorHSL: selectedTheme.accent,
        primaryColor: hslToHex(selectedTheme.primary),
        secondaryColor: hslToHex(selectedTheme.secondary),
        accentColor: hslToHex(selectedTheme.accent),
        sidebarBackground: selectedTheme.sidebar,
        sidebarForeground: selectedTheme.sidebarText,
      });
    }
  };

  const handleHSLChange = (colorType: 'primary' | 'secondary' | 'accent', hslValue: string) => {
    const hexValue = hslToHex(hslValue);
    if (colorType === 'primary') {
      setTheme({ ...theme, primaryColorHSL: hslValue, primaryColor: hexValue, colorTheme: 'custom' });
    } else if (colorType === 'secondary') {
      setTheme({ ...theme, secondaryColorHSL: hslValue, secondaryColor: hexValue, colorTheme: 'custom' });
    } else {
      setTheme({ ...theme, accentColorHSL: hslValue, accentColor: hexValue, colorTheme: 'custom' });
    }
  };

  const handleLogoUpload = async (file: File, type: 'primary' | 'secondary') => {
    try {
      setIsUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to upload logos",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${type}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (type === 'primary') {
        setTheme({ ...theme, logoUrl: data.publicUrl });
      } else {
        setTheme({ ...theme, secondaryLogoUrl: data.publicUrl });
      }

      toast({
        title: "Success",
        description: `${type === 'primary' ? 'Primary' : 'Secondary'} logo uploaded successfully`,
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance Settings
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your dashboard.
          </CardDescription>
        </div>
        <Button onClick={resetTheme} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="sidebar">
              <PanelLeft className="h-4 w-4 mr-2" />
              Sidebar
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <Ticket className="h-4 w-4 mr-2" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="fonts">
              <Type className="h-4 w-4 mr-2" />
              Fonts
            </TabsTrigger>
            <TabsTrigger value="logos">
              <ImageIcon className="h-4 w-4 mr-2" />
              Logo
            </TabsTrigger>
            <TabsTrigger value="layout">
              <GripVertical className="h-4 w-4 mr-2" />
              Layout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-6 mt-6">
            {/* Color Theme Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Color Theme</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a predefined color theme or create your own custom palette.
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.keys(colorThemes) as Array<keyof typeof colorThemes>).map((themeName) => {
                  const colorTheme = colorThemes[themeName];
                  return (
                    <button
                      key={themeName}
                      onClick={() => handleColorThemeChange(themeName)}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        (theme.colorTheme as any) === themeName
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: hslToHex(colorTheme.primary) }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: hslToHex(colorTheme.secondary) }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: hslToHex(colorTheme.accent) }}
                        />
                      </div>
                      <span className="text-sm font-medium capitalize">{colorTheme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Colors Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Custom Colors</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on the color swatches to open the color picker.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColorHSL">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.primaryColorHSL}
                      onChange={(hsl) => handleHSLChange('primary', hsl)}
                      label="Primary Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {theme.primaryColor}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColorHSL">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.secondaryColorHSL}
                      onChange={(hsl) => handleHSLChange('secondary', hsl)}
                      label="Secondary Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {theme.secondaryColor}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColorHSL">Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.accentColorHSL}
                      onChange={(hsl) => handleHSLChange('accent', hsl)}
                      label="Accent Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {theme.accentColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {theme.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <Label htmlFor="darkMode" className="text-base font-semibold cursor-pointer">
                    Dark Mode
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark appearance
                </p>
              </div>
              <Switch
                id="darkMode"
                checked={theme.darkMode}
                onCheckedChange={(checked) => setTheme({ ...theme, darkMode: checked })}
              />
            </div>
          </TabsContent>

          {/* Sidebar Tab */}
          <TabsContent value="sidebar" className="space-y-6 mt-6">
            {/* Sidebar Preset Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Sidebar Color Presets</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a preset sidebar color scheme or customize your own.
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(sidebarPresets) as Array<keyof typeof sidebarPresets>).map((presetName) => {
                  const preset = sidebarPresets[presetName];
                  return (
                    <button
                      key={presetName}
                      onClick={() => setTheme({
                        ...theme,
                        sidebarBackground: preset.background,
                        sidebarForeground: preset.foreground,
                        sidebarAccent: preset.background.replace(/(\d+)%\s*$/, (_, l) => `${Math.min(100, parseInt(l, 10) + 10)}%`),
                        sidebarAccentForeground: preset.foreground,
                        sidebarBorder: preset.background.replace(/(\d+)%\s*$/, (_, l) => `${Math.min(100, parseInt(l, 10) + 10)}%`),
                      })}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        theme.sidebarBackground === preset.background
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div 
                        className="w-12 h-12 rounded-md mb-2 flex items-center justify-center"
                        style={{ backgroundColor: `hsl(${preset.background})` }}
                      >
                        <span 
                          className="text-xs font-medium"
                          style={{ color: `hsl(${preset.foreground})` }}
                        >Aa</span>
                      </div>
                      <span className="text-sm font-medium">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Sidebar Colors */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Custom Sidebar Colors</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on the color swatches to customize your sidebar appearance.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sidebarBackground">Sidebar Background</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.sidebarBackground}
                      onChange={(hsl) => setTheme({ ...theme, sidebarBackground: hsl })}
                      label="Sidebar Background"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.sidebarBackground)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarForeground">Sidebar Text Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.sidebarForeground}
                      onChange={(hsl) => setTheme({ ...theme, sidebarForeground: hsl })}
                      label="Sidebar Text Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.sidebarForeground)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarAccent">Sidebar Accent/Hover Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.sidebarAccent}
                      onChange={(hsl) => setTheme({ ...theme, sidebarAccent: hsl })}
                      label="Sidebar Accent Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.sidebarAccent)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarBorder">Sidebar Border Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.sidebarBorder}
                      onChange={(hsl) => setTheme({ ...theme, sidebarBorder: hsl })}
                      label="Sidebar Border Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.sidebarBorder)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Live Preview</Label>
              <div 
                className="rounded-lg p-4 space-y-2"
                style={{ backgroundColor: `hsl(${theme.sidebarBackground})` }}
              >
                <div 
                  className="px-4 py-2 rounded"
                  style={{ 
                    backgroundColor: `hsl(${theme.sidebarAccent})`,
                    color: `hsl(${theme.sidebarForeground})`
                  }}
                >
                  <span className="font-medium">Active Link</span>
                </div>
                <div 
                  className="px-4 py-2 rounded"
                  style={{ color: `hsl(${theme.sidebarForeground})` }}
                >
                  <span>Regular Link</span>
                </div>
                <div 
                  className="h-px w-full"
                  style={{ backgroundColor: `hsl(${theme.sidebarBorder})` }}
                />
                <div 
                  className="px-4 py-2 rounded opacity-70"
                  style={{ color: `hsl(${theme.sidebarForeground})` }}
                >
                  <span className="text-sm">Menu Item</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6 mt-6">
            {/* Status Colors Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Ticket Status Colors</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize the colors used for different ticket statuses.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Open Status</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketStatusOpen}
                      onChange={(hsl) => setTheme({ ...theme, ticketStatusOpen: hsl })}
                      label="Open Status Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketStatusOpen)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>In Progress Status</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketStatusInProgress}
                      onChange={(hsl) => setTheme({ ...theme, ticketStatusInProgress: hsl })}
                      label="In Progress Status Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketStatusInProgress)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pending Status</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketStatusPending}
                      onChange={(hsl) => setTheme({ ...theme, ticketStatusPending: hsl })}
                      label="Pending Status Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketStatusPending)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Resolved Status</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketStatusResolved}
                      onChange={(hsl) => setTheme({ ...theme, ticketStatusResolved: hsl })}
                      label="Resolved Status Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketStatusResolved)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Closed Status</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketStatusClosed}
                      onChange={(hsl) => setTheme({ ...theme, ticketStatusClosed: hsl })}
                      label="Closed Status Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketStatusClosed)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Colors Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Ticket Priority Colors</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize the colors used for different ticket priorities.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Low Priority</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketPriorityLow}
                      onChange={(hsl) => setTheme({ ...theme, ticketPriorityLow: hsl })}
                      label="Low Priority Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketPriorityLow)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Medium Priority</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketPriorityMedium}
                      onChange={(hsl) => setTheme({ ...theme, ticketPriorityMedium: hsl })}
                      label="Medium Priority Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketPriorityMedium)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>High Priority</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketPriorityHigh}
                      onChange={(hsl) => setTheme({ ...theme, ticketPriorityHigh: hsl })}
                      label="High Priority Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketPriorityHigh)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Urgent Priority</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.ticketPriorityUrgent}
                      onChange={(hsl) => setTheme({ ...theme, ticketPriorityUrgent: hsl })}
                      label="Urgent Priority Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.ticketPriorityUrgent)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Live Preview</Label>
              <div className="rounded-lg border p-6 space-y-4 bg-card">
                <div>
                  <p className="text-sm font-medium mb-2">Status Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketStatusOpen})` }}
                    >
                      open
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketStatusInProgress})` }}
                    >
                      in progress
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketStatusPending})` }}
                    >
                      pending
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketStatusResolved})` }}
                    >
                      resolved
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketStatusClosed})` }}
                    >
                      closed
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Priority Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketPriorityLow})` }}
                    >
                      low
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketPriorityMedium})` }}
                    >
                      medium
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketPriorityHigh})` }}
                    >
                      high
                    </span>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: `hsl(${theme.ticketPriorityUrgent})` }}
                    >
                      urgent
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select 
                  value={theme.fontFamily} 
                  onValueChange={(value) => setTheme({ ...theme, fontFamily: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system-ui">System Default</SelectItem>
                    <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                    <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                    <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                    <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontSize">Base Font Size: {theme.fontSize}px</Label>
                <Slider
                  id="fontSize"
                  min={12}
                  max={20}
                  step={1}
                  value={[theme.fontSize]}
                  onValueChange={([value]) => setTheme({ ...theme, fontSize: value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="layoutDensity">Layout Density</Label>
                <Select 
                  value={theme.layoutDensity} 
                  onValueChange={(value) => setTheme({ ...theme, layoutDensity: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Controls spacing and padding throughout the dashboard
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logos" className="space-y-6 mt-6">
            {/* Logo Position & Layout */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Logo Position & Layout</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure where and how logos appear in the sidebar header.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position in Header</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={theme.logoPosition === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ ...theme, logoPosition: 'left' as LogoPosition })}
                    >
                      <AlignLeft className="h-4 w-4 mr-1" />
                      Left
                    </Button>
                    <Button
                      variant={theme.logoPosition === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ ...theme, logoPosition: 'center' as LogoPosition })}
                    >
                      <AlignCenter className="h-4 w-4 mr-1" />
                      Center
                    </Button>
                    <Button
                      variant={theme.logoPosition === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ ...theme, logoPosition: 'right' as LogoPosition })}
                    >
                      <AlignRight className="h-4 w-4 mr-1" />
                      Right
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Logo Arrangement</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={theme.logoLayout === 'horizontal' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ ...theme, logoLayout: 'horizontal' as LogoLayout })}
                    >
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Side by Side
                    </Button>
                    <Button
                      variant={theme.logoLayout === 'stacked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ ...theme, logoLayout: 'stacked' as LogoLayout })}
                    >
                      <Rows className="h-4 w-4 mr-1" />
                      Stacked
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Logo Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Primary Logo</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="showPrimaryLogo" className="text-sm">Show</Label>
                  <Switch
                    id="showPrimaryLogo"
                    checked={theme.showPrimaryLogo}
                    onCheckedChange={(checked) => setTheme({ ...theme, showPrimaryLogo: checked })}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                {theme.logoUrl && theme.showPrimaryLogo && (
                  <img 
                    src={theme.logoUrl} 
                    alt="Primary Logo" 
                    style={{ height: `${Math.min(theme.logoSize, MAX_LOGO_PREVIEW_HEIGHT)}px` }}
                    className="object-contain border rounded p-2 max-w-[200px]"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('primary-logo-input')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {theme.logoUrl && theme.logoUrl !== defaultTheme.logoUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTheme({ ...theme, logoUrl: defaultTheme.logoUrl });
                        toast({
                          title: "Logo Reset",
                          description: "Primary logo has been reset to default",
                        });
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                  {theme.logoUrl && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setTheme({ ...theme, logoUrl: '', showPrimaryLogo: false });
                        toast({
                          title: "Logo Removed",
                          description: "Primary logo has been removed",
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="primary-logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file, 'primary');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoSize">Logo Size: {theme.logoSize}px</Label>
                <Slider
                  id="logoSize"
                  min={20}
                  max={200}
                  step={5}
                  value={[theme.logoSize]}
                  onValueChange={([value]) => setTheme({ ...theme, logoSize: value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust slider to resize the primary logo (20px - 200px)
                </p>
              </div>
            </div>

            {/* Secondary Logo Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Secondary Logo</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="showSecondaryLogo" className="text-sm">Show</Label>
                  <Switch
                    id="showSecondaryLogo"
                    checked={theme.showSecondaryLogo}
                    onCheckedChange={(checked) => setTheme({ ...theme, showSecondaryLogo: checked })}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                {theme.secondaryLogoUrl && theme.showSecondaryLogo && (
                  <img 
                    src={theme.secondaryLogoUrl} 
                    alt="Secondary Logo" 
                    style={{ height: `${Math.min(theme.secondaryLogoSize, MAX_LOGO_PREVIEW_HEIGHT)}px` }}
                    className="object-contain border rounded p-2 max-w-[200px]"
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('secondary-logo-input')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {theme.secondaryLogoUrl && theme.secondaryLogoUrl !== defaultTheme.secondaryLogoUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTheme({ ...theme, secondaryLogoUrl: defaultTheme.secondaryLogoUrl });
                        toast({
                          title: "Logo Reset",
                          description: "Secondary logo has been reset to default",
                        });
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                  {theme.secondaryLogoUrl && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setTheme({ ...theme, secondaryLogoUrl: '', showSecondaryLogo: false });
                        toast({
                          title: "Logo Removed",
                          description: "Secondary logo has been removed",
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <input
                  id="secondary-logo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file, 'secondary');
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryLogoSize">Logo Size: {theme.secondaryLogoSize}px</Label>
                <Slider
                  id="secondaryLogoSize"
                  min={20}
                  max={200}
                  step={5}
                  value={[theme.secondaryLogoSize]}
                  onValueChange={([value]) => setTheme({ ...theme, secondaryLogoSize: value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust slider to resize the secondary logo (20px - 200px)
                </p>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Live Preview</Label>
              <div 
                className="rounded-lg p-4 border"
                style={{ backgroundColor: `hsl(${theme.sidebarBackground})` }}
              >
                <div className={`flex ${theme.logoLayout === 'stacked' ? 'flex-col' : 'flex-row'} gap-3 ${
                  theme.logoPosition === 'center' ? 'justify-center items-center' :
                  theme.logoPosition === 'right' ? 'justify-end items-center' :
                  'justify-start items-center'
                }`}>
                  {theme.showPrimaryLogo && theme.logoUrl && (
                    <img 
                      src={theme.logoUrl} 
                      alt="Primary Logo Preview" 
                      style={{ height: `${Math.min(theme.logoSize, MAX_LIVE_PREVIEW_HEIGHT)}px` }}
                      className="object-contain"
                    />
                  )}
                  {theme.showSecondaryLogo && theme.secondaryLogoUrl && (
                    <img 
                      src={theme.secondaryLogoUrl} 
                      alt="Secondary Logo Preview" 
                      style={{ height: `${Math.min(theme.secondaryLogoSize, MAX_LIVE_PREVIEW_HEIGHT)}px` }}
                      className="object-contain"
                    />
                  )}
                  {!theme.showPrimaryLogo && !theme.showSecondaryLogo && (
                    <p style={{ color: `hsl(${theme.sidebarForeground})` }} className="text-sm">
                      No logos visible - enable at least one logo above
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Layout & Navigation Tab */}
          <TabsContent value="layout" className="space-y-6 mt-6">
            {/* Font Colors Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Text & Font Colors</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on the color swatches to customize text colors throughout the dashboard.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headingColor">Heading Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.headingColor}
                      onChange={(hsl) => setTheme({ ...theme, headingColor: hsl })}
                      label="Heading Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.headingColor)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Body Text Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.textColor}
                      onChange={(hsl) => setTheme({ ...theme, textColor: hsl })}
                      label="Body Text Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.textColor)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mutedTextColor">Muted/Secondary Text</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.mutedTextColor}
                      onChange={(hsl) => setTheme({ ...theme, mutedTextColor: hsl })}
                      label="Muted Text Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.mutedTextColor)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkColor">Link Color</Label>
                  <div className="flex items-center gap-3">
                    <ColorPicker
                      value={theme.linkColor}
                      onChange={(hsl) => setTheme({ ...theme, linkColor: hsl })}
                      label="Link Color"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {hslToHex(theme.linkColor)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Order Section */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">Navigation Menu Editor</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Reorder menu items using the arrows or hide items you don't need. Changes are saved with your theme.
                </p>
              </div>
              
              <NavigationEditor 
                navigationOrder={theme.navigationOrder}
                hiddenNavItems={theme.hiddenNavItems}
                onOrderChange={(order) => setTheme({ ...theme, navigationOrder: order })}
                onHiddenChange={(hidden) => setTheme({ ...theme, hiddenNavItems: hidden })}
              />
            </div>

            {/* Typography Preview */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Typography Preview</Label>
              <div className="rounded-lg border p-6 space-y-4 bg-card">
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: `hsl(${theme.headingColor})` }}
                >
                  Heading Example
                </h1>
                <p 
                  className="text-base"
                  style={{ color: `hsl(${theme.textColor})` }}
                >
                  This is an example of body text that appears throughout the dashboard. 
                  It uses the text color you've selected above.
                </p>
                <p 
                  className="text-sm"
                  style={{ color: `hsl(${theme.mutedTextColor})` }}
                >
                  This is muted or secondary text, often used for descriptions and helper text.
                </p>
                <a 
                  href="#"
                  className="text-base underline"
                  style={{ color: `hsl(${theme.linkColor})` }}
                  onClick={(e) => e.preventDefault()}
                >
                  This is a sample link
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button onClick={saveTheme} className="flex-1">
            Save Theme
          </Button>
          <Button onClick={resetTheme} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
