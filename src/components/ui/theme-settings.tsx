
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Laptop, Droplets, Trees, Sparkles, Sunrise, Mountain, Coffee, SquareTerminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const COLOR_THEMES = [
  { name: 'theme-default', label: 'Slate', icon: SquareTerminal, colors: ['#2dd4bf', '#38bdf8', '#818cf8'] },
  { name: 'theme-cosy', label: 'Cosy', icon: Coffee, colors: ['#E6A573', '#A6C2A6', '#D9B8A4'] },
];

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  
  const [colorTheme, setColorTheme] = React.useState('theme-default');
  const [mode, setMode] = React.useState('system');

  React.useEffect(() => {
    const currentTheme = document.body.className.split(' ').find(c => c.startsWith('theme-'));
    setColorTheme(currentTheme || 'theme-default');
    
    if (document.documentElement.classList.contains('dark')) {
        setMode('dark');
    } else if (theme === 'system') {
        setMode('system');
    } else {
        setMode('light');
    }
  }, [theme]);

  const handleThemeChange = (newThemeName: string) => {
    COLOR_THEMES.forEach(t => {
      document.body.classList.remove(t.name);
    });
    if (newThemeName !== 'theme-default') {
      document.body.classList.add(newThemeName);
    }
    setColorTheme(newThemeName);
    localStorage.setItem('color-theme', newThemeName);
  };

  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
    setTheme(newMode);
    setMode(newMode);
  };
  
  React.useEffect(() => {
    const savedColorTheme = localStorage.getItem('color-theme');
    const initialTheme = savedColorTheme || 'theme-default';
    handleThemeChange(initialTheme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Apparence</CardTitle>
        <CardDescription>
          Personnalisez l'apparence de l'application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <Label>Thème de couleur</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLOR_THEMES.map((t) => (
              <div
                key={t.name}
                className={cn(
                  'rounded-lg border-2 p-4 cursor-pointer text-center space-y-2 transition-all',
                  colorTheme === t.name ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'
                )}
                onClick={() => handleThemeChange(t.name)}
              >
                <div className="flex justify-center items-center gap-2">
                    <t.icon className="h-6 w-6 text-foreground" />
                </div>
                <p className="font-semibold text-sm">{t.label}</p>
                 <div className="flex justify-center gap-1 pt-1">
                  {t.colors.map(color => <div key={color} className="h-2 w-4 rounded-full" style={{ backgroundColor: color }} />)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Mode d'affichage</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={cn(
                'rounded-lg border-2 p-4 cursor-pointer text-center space-y-2 transition-all',
                mode === 'light' ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'
              )}
              onClick={() => handleModeChange('light')}
            >
              <Sun className="mx-auto h-6 w-6" />
              <p className="font-semibold text-sm">Clair</p>
            </div>
            <div
              className={cn(
                'rounded-lg border-2 p-4 cursor-pointer text-center space-y-2 transition-all',
                mode === 'dark' ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'
              )}
              onClick={() => handleModeChange('dark')}
            >
              <Moon className="mx-auto h-6 w-6" />
              <p className="font-semibold text-sm">Sombre</p>
            </div>
            <div
              className={cn(
                'rounded-lg border-2 p-4 cursor-pointer text-center space-y-2 transition-all',
                mode === 'system' ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border bg-card hover:bg-muted'
              )}
              onClick={() => handleModeChange('system')}
            >
              <Laptop className="mx-auto h-6 w-6" />
              <p className="font-semibold text-sm">Système</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
