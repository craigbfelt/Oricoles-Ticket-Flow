import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Layout, Image as ImageIcon, Upload, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  logoUrl: string;
  logoSize: number;
  secondaryLogoUrl: string;
  secondaryLogoSize: number;
  layoutDensity: 'comfortable' | 'compact' | 'spacious';
}

const defaultTheme: ThemeSettings = {
  primaryColor: '#1e40af',
  secondaryColor: '#7c3aed',
  accentColor: '#f59e0b',
  fontFamily: 'system-ui',
  fontSize: 16,
  logoUrl: '/src/assets/oricol-logo.png',
  logoSize: 40,
  secondaryLogoUrl: '/src/assets/zerobitone-logo.png',
  secondaryLogoSize: 40,
  layoutDensity: 'comfortable',
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
    
    // Apply colors
    root.style.setProperty('--theme-primary', theme.primaryColor);
    root.style.setProperty('--theme-secondary', theme.secondaryColor);
    root.style.setProperty('--theme-accent', theme.accentColor);
    
    // Apply font
    root.style.setProperty('--theme-font-family', theme.fontFamily);
    root.style.setProperty('--theme-font-size', `${theme.fontSize}px`);
    
    // Apply layout density
    const spacing = theme.layoutDensity === 'compact' ? '0.75' : 
                   theme.layoutDensity === 'spacious' ? '1.25' : '1';
    root.style.setProperty('--theme-spacing', spacing);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Customization
        </CardTitle>
        <CardDescription>
          Customize the look and feel of your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography">
              <Type className="h-4 w-4 mr-2" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="layout">
              <Layout className="h-4 w-4 mr-2" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="logos">
              <ImageIcon className="h-4 w-4 mr-2" />
              Logos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-4">
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
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="layoutDensity">Layout Density</Label>
              <Select 
                value={theme.layoutDensity} 
                onValueChange={(value: any) => setTheme({ ...theme, layoutDensity: value })}
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
          </TabsContent>

          <TabsContent value="logos" className="space-y-6">
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
