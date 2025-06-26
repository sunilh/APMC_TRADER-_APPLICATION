import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Home, Users, Package, Settings, LogOut, Menu, Globe, IndianRupee, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: Home },
    { name: t('nav.farmers'), href: '/farmers', icon: Users },
    { name: t('nav.lots'), href: '/lots', icon: Package },
    { name: 'Buyers', href: '/buyers', icon: Users },
    { name: 'Billing', href: '/billing', icon: IndianRupee },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  // Add tenant onboarding for super admins
  const superAdminNavigation = [
    ...navigation,
    { name: 'Create Tenant', href: '/tenant-onboarding', icon: Building2 },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location === href;
    }
    return location.startsWith(href);
  };

  const currentNavigation = user?.role === 'super_admin' ? superAdminNavigation : navigation;

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {currentNavigation.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
          >
            <Button
              variant="ghost"
              className={`
                ${mobile ? 'w-full justify-start' : 'px-3 py-2'}
                ${active 
                  ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Icon className={`h-4 w-4 ${mobile ? 'mr-2' : 'mr-1'}`} />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Sprout className="h-8 w-8 text-secondary mr-3" />
                <div>
                  <span className="text-xl font-bold text-gray-900">APMC Trader</span>
                  <p className="text-xs text-gray-600 -mt-1">Agricultural Market</p>
                </div>
              </div>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-2">
              <NavLinks />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Language selector */}
            <div className="hidden md:flex items-center space-x-2">
              <Globe className="h-4 w-4 text-gray-400" />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-auto border-none focus:ring-0 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 px-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-white text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavLinks mobile />
                    
                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="hi">हिंदी</SelectItem>
                            <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {user && (
                        <Button
                          variant="ghost"
                          onClick={handleLogout}
                          className="w-full justify-start text-red-600 hover:text-red-600"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {t('auth.logout')}
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
