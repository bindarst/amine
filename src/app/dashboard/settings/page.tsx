
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import ItemsSettings from './components/items-settings';
import WardsSettings from './components/wards-settings';
import ProfileSettings from "./components/profile-settings";
import ThemeSettings from "./components/theme-settings";
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Barcode, Loader2, User, Users, Tag, Building, Truck, Palette, Database, Download } from 'lucide-react';
import SuppliersSettings from './components/suppliers-settings';
import UsersSettings from './components/users-settings';
import { useUsers } from './users-context';
import DataSettings from './components/data-settings';
import InstallationSettings from './components/installation-settings';
import BarcodeSettings from './components/barcode-settings';


function SettingsPageContent() {
  const isMobile = useIsMobile();
  const { currentUserProfile, isCurrentUserProfileLoading } = useUsers();

  const allTabs = React.useMemo(() => [
    { value: "profile", label: "Profil", icon: User, Component: ProfileSettings, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "users", label: "Utilisateurs", icon: Users, Component: UsersSettings, roles: ['Admin'] },
    { value: "items", label: "Articles", icon: Tag, Component: ItemsSettings, roles: ['Admin'] },
    { value: "barcodes", label: "Codes-barres", icon: Barcode, Component: BarcodeSettings, roles: ['Admin', 'Soignant'] },
    { value: "wards", label: "Étages", icon: Building, Component: WardsSettings, roles: ['Admin', 'Soignant'] },
    { value: "suppliers", label: "Fournisseurs", icon: Truck, Component: SuppliersSettings, roles: ['Admin'] },
    { value: "theme", label: "Apparence", icon: Palette, Component: ThemeSettings, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "installation", label: "Installation", icon: Download, Component: InstallationSettings, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "data", label: "Données", icon: Database, Component: DataSettings, roles: ['Admin'] },
  ], []);

  const visibleTabs = React.useMemo(() => {
    if (isCurrentUserProfileLoading || !currentUserProfile?.role) return [];

    const userRole = currentUserProfile.role;
    const filtered = allTabs.filter(tab => tab.roles.includes(userRole));

    return filtered;

  }, [currentUserProfile, isCurrentUserProfileLoading, allTabs]);


  const [selectedTab, setSelectedTab] = React.useState(visibleTabs.length > 0 ? visibleTabs[0].value : '');

  React.useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.value === selectedTab)) {
      setSelectedTab(visibleTabs[0].value);
    }
  }, [visibleTabs, selectedTab]);

  if (isCurrentUserProfileLoading || visibleTabs.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-primary border-r-secondary animate-spin" />
          <User className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Chargement des paramètres...</p>
      </div>
    )
  }

  const ActiveComponent = visibleTabs.find(tab => tab.value === selectedTab)?.Component;

  const renderMobileView = () => {
    if (isMobile === undefined) return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
    if (!isMobile) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-3">
          <Label htmlFor="settings-select" className="text-base font-semibold">Section des paramètres</Label>
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger id="settings-select" className="w-full h-12 glass border-border/50 focus:border-primary/50 rounded-2xl">
              <SelectValue placeholder="Sélectionnez une section..." />
            </SelectTrigger>
            <SelectContent>
              {visibleTabs.map(tab => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-4">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    );
  };

  const renderDesktopView = () => {
    if (isMobile) return null;
    return (
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} value={selectedTab} className="w-full grid md:grid-cols-[280px_1fr] gap-8 items-start animate-fade-in">
        <div className="glass-strong shadow-modern-lg rounded-2xl p-2 sticky top-6">
          <TabsList className="grid w-full grid-cols-1 h-auto justify-start p-0 bg-transparent gap-1">
            {visibleTabs.map((tab, index) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="justify-start gap-3 py-3.5 px-4 text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-secondary/10 data-[state=active]:shadow-md data-[state=active]:font-bold rounded-xl transition-all duration-300 hover:bg-muted/50 group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-2 rounded-lg group-data-[state=active]:bg-gradient-to-br group-data-[state=active]:from-primary group-data-[state=active]:to-secondary transition-all duration-300">
                  <tab.icon className="h-4 w-4 group-data-[state=active]:text-white transition-colors" />
                </div>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div>
          {visibleTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 animate-fade-in-scale">
              {tab.Component && <tab.Component />}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header avec effet gradient */}
      <div className="space-y-3 relative">
        <div className="pointer-events-none absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -top-4 right-12 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-400 to-primary shadow-lg">
            <User className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-500 via-primary to-secondary bg-clip-text text-transparent animate-gradient">
              Paramètres
            </span>
          </h1>
        </div>
        <p className="text-base text-muted-foreground relative">
          Gérez les paramètres de votre compte et les données de l'application
        </p>
      </div>

      <div className="pt-4">
        {renderMobileView()}
        {renderDesktopView()}
      </div>
    </div>
  );
}


export default function SettingsPage() {
  return (
    <SettingsPageContent />
  )
}
