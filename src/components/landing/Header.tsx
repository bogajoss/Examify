"use client";
import {
  House,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Users,
  FileText,
  ChevronDown,
  NotebookText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "../theme-toggle";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  subItems?: { label: string; href: string; icon: React.ReactNode }[];
}

const navLinks: NavItem[] = [
  { label: "হোম", href: "/", icon: <House size={18} /> },
  {
    label: "ড্যাশবোর্ড",
    href: "/exams",
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: "ব্যাচ",
    href: "/batches",
    icon: <Users size={18} />,
  },
  {
    label: "পরীক্ষা",
    href: "/exams",
    icon: <FileText size={18} />,
  },
];

const NavItem = memo(function NavItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  if (item.subItems) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group relative flex cursor-pointer items-center justify-center rounded-full transition-all duration-300",
              "h-9 focus-visible:outline-none px-3",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-primary/10 text-primary font-semibold",
            )}
          >
            <div className="relative z-10 flex items-center gap-2">
              <div className="shrink-0">{item.icon}</div>
              <span className="hidden sm:block whitespace-nowrap text-sm font-medium">
                {item.label}
              </span>
              <ChevronDown
                size={16}
                className="hidden shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
              />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-40">
          {item.subItems.map((subItem) => (
            <DropdownMenuItem key={subItem.label} asChild>
              <Link
                href={subItem.href}
                className="flex items-center gap-2 cursor-pointer"
              >
                {subItem.icon}
                <span>{subItem.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className={cn(
        "relative flex cursor-pointer items-center justify-center rounded-full transition-all duration-300",
        "h-9 focus-visible:outline-none px-3",
        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-primary/10 text-primary font-semibold",
      )}
    >
      <div className="relative z-10 flex items-center gap-2">
        <div className="shrink-0">{item.icon}</div>
        <span className="hidden sm:block whitespace-nowrap text-sm font-medium">
          {item.label}
        </span>
      </div>
    </Link>
  );
});

export const Header = memo(function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-2 z-50 w-full flex justify-center px-4 sm:px-6 lg:px-8">
      <div
        className={cn(
          "flex items-center gap-x-1 rounded-full border border-primary/20 bg-card/70 dark:bg-card/60 backdrop-blur-lg p-1.5 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-5xl",
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="Examify Home"
          className="group flex items-center space-x-2 pl-3 pr-2 shrink-0"
        >
          <div className="relative">
            <div className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 group-active:scale-95">
              <NotebookText size={28} className="h-full w-full" />
            </div>
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <span className="hidden sm:block font-bold text-sm bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Examify
          </span>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50"></div>

        {/* Navigation */}
        <nav className="flex-grow flex items-center overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-x-1">
            {navLinks.map((item) => {
              let isActive = false;
              if (item.href === "/") {
                isActive = pathname === item.href;
              } else {
                isActive = pathname.startsWith(item.href);
              }
              return (
                <NavItem key={item.label} item={item} isActive={isActive} />
              );
            })}
          </div>
        </nav>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50"></div>

        {/* Right Actions */}
        <div className="flex items-center gap-x-2 shrink-0">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-9 w-9 rounded-full p-0 hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.roll}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/exams">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>ড্যাশবোর্ড</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>লগ আউট</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              <Link href="/login">লগইন</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
