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
import { Palette, Type, Image as ImageIcon, Upload, RotateCcw, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Predefined color themes with HSL values
const colorThemes = {
  warm: {
    name: 'Warm',
    primary: '25 90% 55%',
    secondary: '45 85% 60%',
    accent: '15 85% 50%',
  },
  cool: {
    name: 'Cool',
    primary: '210 85% 55%',
    secondary: '195 75% 50%',
    accent: '230 70% 60%',
  },
  forest: {
    name: 'Forest',
    primary: '150 60% 40%',
    secondary: '120 50% 45%',
    accent: '90 55% 50%',
  },
  ocean: {
    name: 'Ocean',
    primary: '200 80% 50%',
    secondary: '180 70% 45%',
    accent: '220 75% 55%',
  },
  sunset: {
    name: 'Sunset',
    primary: '350 80% 55%',
    secondary: '30 85% 55%',
    accent: '15 90% 60%',
  },
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="fonts">
              <Type className="h-4 w-4 mr-2" />
              Fonts
            </TabsTrigger>
            <TabsTrigger value="logos">
              <ImageIcon className="h-4 w-4 mr-2" />
              Logo
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
