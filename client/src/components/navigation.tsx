import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Home, Users, Package, Settings, LogOut, Menu, Globe, IndianRupee, Building2, Receipt, FileText, Search, BarChart3, FolderOpen, Briefcase, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

export function Navigation() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { language, setLanguage, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let shouldCloseAll = true;
      
      // Check if click is inside any dropdown
      for (const [groupName, ref] of Object.entries(dropdownRefs.current)) {
        if (ref && ref.contains(event.target as Node)) {
          shouldCloseAll = false;
          break;
        }
      }
      
      if (shouldCloseAll) {
        setExpandedGroups(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: Home, type: 'single' },
    
    // Manage Group
    { name: 'Manage', type: 'group', icon: FolderOpen, items: [
      { name: t('nav.farmers'), href: '/farmers', icon: Users },
      { name: 'Buyers', href: '/buyers', icon: Users },
      ...(user?.role === 'admin' ? [{ name: 'Staff', href: '/staff', icon: Users }] : []),
    ]},
    
    // Operations Group
    { name: 'Operations', type: 'group', icon: Briefcase, items: [
      { name: t('nav.lots'), href: '/lots', icon: Package },
    ]},
    
    // Bills Group
    { name: 'Bills', type: 'group', icon: Receipt, items: [
      { name: 'Farmer Bill', href: '/farmer-bill', icon: Receipt },
      { name: 'Tax Invoice', href: '/tax-invoice', icon: FileText },
    ]},
    
    // Reports Group
    { name: 'Reports', type: 'group', icon: BarChart3, items: [
      { name: 'CESS Reports', href: '/cess-reports', icon: BarChart3 },
      { name: 'GST Reports', href: '/gst-reports', icon: BarChart3 },
    ]},
    
    // Final Accounts
    { name: 'Final Accounts', href: '/final-accounts', icon: IndianRupee, type: 'single' },
    
    { name: t('nav.settings'), href: '/settings', icon: Settings, type: 'single' },
  ];

  // Add tenant onboarding for super admins
  const superAdminNavigation = [
    ...navigation,
    { name: 'Create Tenant', href: '/tenant-onboarding', icon: Building2, type: 'single' },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavigation = (href: string) => {
    console.log('🔥 Navigation clicked! Href:', href);
    console.log('🔥 Current location:', window.location.href);
    try {
      window.location.href = href;
      console.log('🔥 Navigation successful');
    } catch (error) {
      console.error('🔥 Navigation error:', error);
    }
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

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const isGroupExpanded = (groupName: string) => expandedGroups.has(groupName);

  const isGroupActive = (items: any[]) => {
    return items.some(item => item.href && isActive(item.href));
  };

  const currentNavigation = (user?.role === 'super_admin' && user?.tenantId === null) ? superAdminNavigation : navigation;

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`${mobile ? 'space-y-1' : 'space-x-1 flex'}`}>
      {currentNavigation.map((item: any) => {
        // Single item (not grouped)
        if (item.type === 'single') {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Button
              key={item.name}
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Button clicked:', item.name, item.href);
                alert(`Navigating to: ${item.name} (${item.href})`); // Visual confirmation
                handleNavigation(item.href);
                if (mobile) setMobileMenuOpen(false);
              }}
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
              {item.name === 'Final Accounts' && <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">TEST</span>}
            </Button>
          );
        }

        // Grouped items
        if (item.type === 'group') {
          const Icon = item.icon;
          const expanded = isGroupExpanded(item.name);
          const groupActive = isGroupActive(item.items);

          return (
            <div 
              key={item.name} 
              className={mobile ? 'space-y-1' : 'relative'}
              ref={(el) => {
                if (!mobile) {
                  dropdownRefs.current[item.name] = el;
                }
              }}
            >
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  console.log('🔥 Group clicked:', item.name);
                  toggleGroup(item.name);
                }}
                className={`
                  ${mobile ? 'w-full justify-start' : 'px-3 py-2'}
                  ${groupActive 
                    ? 'text-primary bg-primary/10 border-b-2 border-primary' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${mobile ? 'mr-2' : 'mr-1'}`} />
                {item.name}
                <div className={`transition-transform ml-1 ${expanded ? 'rotate-90' : ''}`}>
                  ▶
                </div>
              </Button>

              {/* Submenu */}
              {expanded && (
                <div className={`
                  ${mobile 
                    ? 'ml-4 space-y-1' 
                    : 'absolute top-full left-0 bg-white dark:bg-gray-800 shadow-lg border rounded-md py-2 min-w-[160px] z-50'
                  }
                `}>
                  {item.items.map((subItem: any) => {
                    const SubIcon = subItem.icon;
                    const subActive = isActive(subItem.href);

                    return (
                      <Button
                        key={subItem.name}
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔥 Sub-menu clicked:', subItem.name, subItem.href);
                          handleNavigation(subItem.href);
                          if (mobile) {
                            setMobileMenuOpen(false);
                          } else {
                            setExpandedGroups(new Set()); // Close dropdown after click
                          }
                        }}
                        className={`
                          ${mobile ? 'w-full justify-start text-sm' : 'w-full justify-start px-4 py-2'}
                          ${subActive 
                            ? 'text-primary bg-primary/10' 
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                          }
                        `}
                      >
                        <SubIcon className="h-4 w-4 mr-2" />
                        {subItem.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      {/* DEBUG: Navigation component is loading */}
      <div className="bg-red-500 text-white text-center py-1 text-sm">
        🔥 NAVIGATION DEBUG: Component loaded - Final Accounts should be visible below
      </div>
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
            <div className="hidden md:ml-8 md:flex md:items-center bg-yellow-100 p-2 rounded">
              <div className="text-xs text-red-600 mr-2">DEBUG NAV:</div>
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
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('🔥 Settings clicked from user menu');
                      handleNavigation('/settings');
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.settings')}
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
