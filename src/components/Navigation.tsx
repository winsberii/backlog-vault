import { Button } from "@/components/ui/button";
import { ViewMode } from "@/pages/Index";
import { Gamepad2, Heart, Trophy, Filter, Menu, X, SkipForward } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CurrencySelector } from "./CurrencySelector";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface NavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const navItems = [
    {
      key: 'backlog' as ViewMode,
      label: 'Backlog',
      icon: Gamepad2,
    },
    {
      key: 'wishlist' as ViewMode,
      label: 'Wishlist',
      icon: Heart,
    },
    {
      key: 'completed' as ViewMode,
      label: 'Completed',
      icon: Trophy,
    },
    {
      key: 'skipped' as ViewMode,
      label: 'Skipped',
      icon: SkipForward,
    },
    {
      key: 'tosort' as ViewMode,
      label: 'To Sort',
      icon: Filter,
    },
  ];

  const handleNavItemClick = (item: ViewMode) => {
    onViewChange(item);
    if (isMobile) {
      setIsDrawerOpen(false);
    }
  };

  if (isMobile) {
    return (
      <div className="mb-6">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <div className="flex items-center justify-between bg-card p-3 rounded-lg shadow-game-card">
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                {navItems.find(item => item.key === currentView)?.label || 'Menu'}
              </Button>
            </DrawerTrigger>
            <div className="flex items-center space-x-2">
              <CurrencySelector />
              <ThemeToggle />
            </div>
          </div>
          
          <DrawerContent className="p-4">
            <DrawerHeader>
              <DrawerTitle>Navigation</DrawerTitle>
            </DrawerHeader>
            <div className="grid gap-3 mt-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.key;
                
                return (
                  <Button
                    key={item.key}
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => handleNavItemClick(item.key)}
                    className={`flex items-center justify-start gap-3 h-12 text-left ${
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-base">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-8 bg-card p-2 rounded-lg shadow-game-card">
      <div className="flex space-x-2">
        {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.key;
        
        return (
          <Button
            key={item.key}
            variant={isActive ? "default" : "ghost"}
            onClick={() => onViewChange(item.key)}
            className={`flex items-center space-x-2 transition-smooth ${
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "hover:bg-secondary/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Button>
        );
      })}
      </div>
      <div className="flex items-center space-x-2">
        <CurrencySelector />
        <ThemeToggle />
      </div>
    </div>
  );
};