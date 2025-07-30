import { Button } from "@/components/ui/button";
import { ViewMode } from "@/pages/Index";
import { Gamepad2, Heart, Trophy } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavigationProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
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
  ];

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
      <ThemeToggle />
    </div>
  );
};