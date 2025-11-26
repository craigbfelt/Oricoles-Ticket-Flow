import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Image as ImageIcon, Upload, RotateCcw, Sun, Moon, PanelLeft, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryColorHSL: string;
  secondaryColorHSL: string;
  accentColorHSL: string;
  colorTheme: keyof typeof colorThemes | 'custom';
  fontFamily: string;
  fontSize: number;
  logoUrl: string;
  logoSize: number;
  secondaryLogoUrl: string;
  secondaryLogoSize: number;
  layoutDensity: 'comfortable' | 'compact' | 'spacious';
  darkMode: boolean;
  // Sidebar colors
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  // Font colors
  headingColor: string;
  textColor: string;
  mutedTextColor: string;
  linkColor: string;
  // Navigation order
  navigationOrder: string[];
  hiddenNavItems: string[];
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#1e40af',
  secondaryColor: '#7c3aed',
  accentColor: '#f59e0b',
  primaryColorHSL: '212 85% 48%',
  secondaryColorHSL: '271 91% 65%',
  accentColorHSL: '38 92% 50%',
  colorTheme: 'custom',
  fontFamily: 'system-ui',
  fontSize: 16,
  logoUrl: '/src/assets/oricol-logo.png',
  logoSize: 40,
  secondaryLogoUrl: '/src/assets/zerobitone-logo.png',
  secondaryLogoSize: 40,
  layoutDensity: 'comfortable',
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
  navigationOrder: [],
  hiddenNavItems: [],
};

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

// Default navigation items that can be reordered
const defaultNavItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Tickets", href: "/tickets" },
  { name: "Oricol CRM", href: "/crm" },
  { name: "Remote Support", href: "/remote-support" },
  { name: "Document Hub", href: "/document-hub" },
  { name: "Shared Files", href: "/shared-files" },
  { name: "Migrations", href: "/migrations" },
  { name: "Jobs", href: "/jobs" },
  { name: "Maintenance", href: "/maintenance" },
  { name: "Logistics", href: "/logistics" },
  { name: "Assets", href: "/assets" },
  { name: "Branches", href: "/branches" },
  { name: "Microsoft 365", href: "/microsoft-365" },
  { name: "Hardware", href: "/hardware" },
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
    const savedTheme = localStorage.getItem('dashboardTheme');
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
    localStorage.setItem('dashboardTheme', JSON.stringify(theme));
    toast({
      title: "Theme Saved",
      description: "Your customizations have been saved successfully",
    });
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('dashboardTheme');
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
    const spacing = theme.layoutDensity === 'compact' ? '0.75' : 
                   theme.layoutDensity === 'spacious' ? '1.25' : '1';
    root.style.setProperty('--theme-spacing', spacing);
    
    // Apply dark mode
    if (theme.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleColorThemeChange = (themeName: keyof typeof colorThemes | 'custom') => {
    if (themeName === 'custom') {
      setTheme({ ...theme, colorTheme: 'custom' });
    } else {
      const selectedTheme = colorThemes[themeName];
      setTheme({
        ...theme,
        colorTheme: themeName,
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="sidebar">
              <PanelLeft className="h-4 w-4 mr-2" />
              Sidebar
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
                        theme.colorTheme === themeName 
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
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColorHSL">Primary Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <Input
                      id="primaryColorHSL"
                      type="text"
                      value={theme.primaryColorHSL}
                      onChange={(e) => handleHSLChange('primary', e.target.value)}
                      placeholder="210 60% 55%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColorHSL">Secondary Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: theme.secondaryColor }}
                    />
                    <Input
                      id="secondaryColorHSL"
                      type="text"
                      value={theme.secondaryColorHSL}
                      onChange={(e) => handleHSLChange('secondary', e.target.value)}
                      placeholder="110 10% 90%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColorHSL">Accent Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <Input
                      id="accentColorHSL"
                      type="text"
                      value={theme.accentColorHSL}
                      onChange={(e) => handleHSLChange('accent', e.target.value)}
                      placeholder="210 50% 88%"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Enter colors in HSL format: hue saturation% lightness% (e.g., "210 60% 55%")
              </p>
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
                  Fine-tune your sidebar appearance with custom HSL colors.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sidebarBackground">Sidebar Background (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: `hsl(${theme.sidebarBackground})` }}
                    />
                    <Input
                      id="sidebarBackground"
                      type="text"
                      value={theme.sidebarBackground}
                      onChange={(e) => setTheme({ ...theme, sidebarBackground: e.target.value })}
                      placeholder="215 28% 17%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarForeground">Sidebar Text Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0 flex items-center justify-center"
                      style={{ 
                        backgroundColor: `hsl(${theme.sidebarBackground})`,
                        color: `hsl(${theme.sidebarForeground})`
                      }}
                    >
                      <span className="text-sm font-bold">Aa</span>
                    </div>
                    <Input
                      id="sidebarForeground"
                      type="text"
                      value={theme.sidebarForeground}
                      onChange={(e) => setTheme({ ...theme, sidebarForeground: e.target.value })}
                      placeholder="210 20% 98%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarAccent">Sidebar Accent/Hover Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: `hsl(${theme.sidebarAccent})` }}
                    />
                    <Input
                      id="sidebarAccent"
                      type="text"
                      value={theme.sidebarAccent}
                      onChange={(e) => setTheme({ ...theme, sidebarAccent: e.target.value })}
                      placeholder="217 32% 24%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sidebarBorder">Sidebar Border Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0"
                      style={{ backgroundColor: `hsl(${theme.sidebarBorder})` }}
                    />
                    <Input
                      id="sidebarBorder"
                      type="text"
                      value={theme.sidebarBorder}
                      onChange={(e) => setTheme({ ...theme, sidebarBorder: e.target.value })}
                      placeholder="217 32% 24%"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Enter colors in HSL format: hue saturation% lightness% (e.g., "215 28% 17%")
              </p>
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
                  onValueChange={(value: 'comfortable' | 'compact' | 'spacious') => setTheme({ ...theme, layoutDensity: value })}
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Logo</Label>
                <div className="flex items-center gap-4">
                  {theme.logoUrl && (
                    <img 
                      src={theme.logoUrl} 
                      alt="Primary Logo" 
                      style={{ height: `${theme.logoSize}px` }}
                      className="object-contain border rounded p-2"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('primary-logo-input')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Logo
                  </Button>
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
                <div className="space-y-2 mt-2">
                  <Label htmlFor="logoSize">Logo Size: {theme.logoSize}px</Label>
                  <Slider
                    id="logoSize"
                    min={20}
                    max={80}
                    step={5}
                    value={[theme.logoSize]}
                    onValueChange={([value]) => setTheme({ ...theme, logoSize: value })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Logo</Label>
                <div className="flex items-center gap-4">
                  {theme.secondaryLogoUrl && (
                    <img 
                      src={theme.secondaryLogoUrl} 
                      alt="Secondary Logo" 
                      style={{ height: `${theme.secondaryLogoSize}px` }}
                      className="object-contain border rounded p-2"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('secondary-logo-input')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Logo
                  </Button>
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
                <div className="space-y-2 mt-2">
                  <Label htmlFor="secondaryLogoSize">Logo Size: {theme.secondaryLogoSize}px</Label>
                  <Slider
                    id="secondaryLogoSize"
                    min={20}
                    max={80}
                    step={5}
                    value={[theme.secondaryLogoSize]}
                    onValueChange={([value]) => setTheme({ ...theme, secondaryLogoSize: value })}
                    className="w-full"
                  />
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
                  Customize the colors of text elements throughout the dashboard.
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headingColor">Heading Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0 flex items-center justify-center"
                      style={{ color: `hsl(${theme.headingColor})` }}
                    >
                      <span className="text-lg font-bold">H1</span>
                    </div>
                    <Input
                      id="headingColor"
                      type="text"
                      value={theme.headingColor}
                      onChange={(e) => setTheme({ ...theme, headingColor: e.target.value })}
                      placeholder="215 25% 15%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="textColor">Body Text Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0 flex items-center justify-center"
                      style={{ color: `hsl(${theme.textColor})` }}
                    >
                      <span className="text-sm">Aa</span>
                    </div>
                    <Input
                      id="textColor"
                      type="text"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      placeholder="215 25% 15%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mutedTextColor">Muted/Secondary Text (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0 flex items-center justify-center"
                      style={{ color: `hsl(${theme.mutedTextColor})` }}
                    >
                      <span className="text-sm opacity-70">Aa</span>
                    </div>
                    <Input
                      id="mutedTextColor"
                      type="text"
                      value={theme.mutedTextColor}
                      onChange={(e) => setTheme({ ...theme, mutedTextColor: e.target.value })}
                      placeholder="215 16% 46%"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkColor">Link Color (HSL)</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-md border flex-shrink-0 flex items-center justify-center"
                      style={{ color: `hsl(${theme.linkColor})` }}
                    >
                      <span className="text-sm underline">Link</span>
                    </div>
                    <Input
                      id="linkColor"
                      type="text"
                      value={theme.linkColor}
                      onChange={(e) => setTheme({ ...theme, linkColor: e.target.value })}
                      placeholder="212 85% 48%"
                      className="font-mono"
                    />
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
