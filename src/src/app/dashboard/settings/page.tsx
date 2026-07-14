
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
import { Loader2, User, Users, Tag, Building, Truck, Palette, Database, Download } from 'lucide-react';
import SuppliersSettings from './components/suppliers-settings';
import UsersSettings from './components/users-settings';
import { useUsers } from './users-context';
import DataSettings from './components/data-settings';
import InstallationSettings from './components/installation-settings';


function SettingsPageContent() {
  const isMobile = useIsMobile();
  const { currentUserProfile, isCurrentUserProfileLoading } = useUsers();

  const allTabs = [
    { value: "profile", label: "Profil", icon: User, component: <ProfileSettings />, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "users", label: "Utilisateurs", icon: Users, component: <UsersSettings />, roles: ['Admin'] },
    { value: "items", label: "Articles", icon: Tag, component: <ItemsSettings />, roles: ['Admin'] },
    { value: "wards", label: "Étages", icon: Building, component: <WardsSettings />, roles: ['Admin', 'Soignant'] },
    { value: "suppliers", label: "Fournisseurs", icon: Truck, component: <SuppliersSettings />, roles: ['Admin'] },
    { value: "theme", label: "Apparence", icon: Palette, component: <ThemeSettings />, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "installation", label: "Installation", icon: Download, component: <InstallationSettings />, roles: ['Admin', 'Soignant', 'Agent Logistique'] },
    { value: "data", label: "Données", icon: Database, component: <DataSettings />, roles: ['Admin'] },
  ];
  
  const visibleTabs = React.useMemo(() => {
    if (isCurrentUserProfileLoading || !currentUserProfile?.role) return [];
    
    const userRole = currentUserProfile.role;
    const filtered = allTabs.filter(tab => tab.roles.includes(userRole));

    return filtered;

  }, [currentUserProfile, isCurrentUserProfileLoading]);


  const [selectedTab, setSelectedTab] = React.useState(visibleTabs.length > 0 ? visibleTabs[0].value : '');

  React.useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.value === selectedTab)) {
      setSelectedTab(visibleTabs[0].value);
    }
  }, [visibleTabs, selectedTab]);
  
  if (isCurrentUserProfileLoading || visibleTabs.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }
  
  const activeTabContent = visibleTabs.find(tab => tab.value === selectedTab)?.component;

  const renderMobileView = () => {
    if (isMobile === undefined) return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
    if (!isMobile) return null;
    
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="settings-select">Section des paramètres</Label>
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger id="settings-select" className="w-full">
              <SelectValue placeholder="Sélectionnez une section..." />
            </SelectTrigger>
            <SelectContent>
              {visibleTabs.map(tab => (
                <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pt-4">
          {activeTabContent}
        </div>
      </div>
    );
  };

  const renderDesktopView = () => {
    if (isMobile) return null;
    return (
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab} value={selectedTab} className="w-full grid md:grid-cols-[250px_1fr] gap-8 items-start">
        <TabsList className="grid w-full grid-cols-1 h-auto justify-start p-0 bg-transparent gap-1">
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="justify-start gap-3 py-3 px-4 text-base data-[state=active]:bg-accent data-[state=active]:shadow-none data-[state=active]:font-semibold rounded-md">
                <tab.icon className="h-5 w-5" />
                {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="pr-4">
            {visibleTabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
                {tab.component}
            </TabsContent>
            ))}
        </div>
      </Tabs>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
            Gérez les paramètres de votre compte et les données de l'application.
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
