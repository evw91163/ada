import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  Menu,
  User,
  LogOut,
  Settings,
  Bell,
  Search,
  Shield,
  MessageCircle,
  Link as LinkIcon,
  ShoppingBag,
  FileText,
  Megaphone,
  Percent,
  UserPlus,
  Calendar,
  Briefcase,
  Home,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/forum", label: "Forum", icon: MessageCircle },
  { href: "/links", label: "Links", icon: LinkIcon },
  { href: "/for-sale", label: "For Sale", icon: ShoppingBag },
  { href: "/articles", label: "Articles", icon: FileText },
  { href: "/advertisements", label: "Advertisements", icon: Megaphone },
  { href: "/discounts", label: "Discounts", icon: Percent },
  { href: "/sign-up", label: "Free Member Sign-up", icon: UserPlus },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/help-wanted", label: "Help Wanted", icon: Briefcase },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl">🍩</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline text-foreground">
              American Donut Association
            </span>
            <span className="font-bold text-lg sm:hidden text-foreground">ADA</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.slice(0, 6).map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="text-sm"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navItems.slice(6).map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <Link href="/search">
              <Button variant="ghost" size="icon">
                <Search className="h-5 w-5" />
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link href="/settings">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount && unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs notification-badge"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/profile/${user?.id}`} className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    {user?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-2 mt-8">
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === "/" ? "secondary" : "ghost"}
                      className="w-full justify-start"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant={location === item.href ? "secondary" : "ghost"}
                        className="w-full justify-start"
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-lg">🍩</span>
                </div>
                <span className="font-bold text-foreground">ADA</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The American Donut Association - Bringing donut enthusiasts together since 2024.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/forum" className="hover:text-primary">
                    Forum
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="hover:text-primary">
                    Events
                  </Link>
                </li>
                <li>
                  <Link href="/articles" className="hover:text-primary">
                    Articles
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Marketplace</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/for-sale" className="hover:text-primary">
                    For Sale
                  </Link>
                </li>
                <li>
                  <Link href="/discounts" className="hover:text-primary">
                    Discounts
                  </Link>
                </li>
                <li>
                  <Link href="/help-wanted" className="hover:text-primary">
                    Help Wanted
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Connect</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/sign-up" className="hover:text-primary">
                    Join Us
                  </Link>
                </li>
                <li>
                  <Link href="/links" className="hover:text-primary">
                    Resources
                  </Link>
                </li>
                <li>
                  <Link href="/advertisements" className="hover:text-primary">
                    Advertise
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} American Donut Association. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
