"use client";

import React, { useState } from "react";
import { User, ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  isActive?: boolean;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  userInfo: {
    name: string;
    role: string;
  };
  onLogout: () => void;
  panelType: "student" | "admin";
  onExpandedChange?: (expanded: boolean) => void;
  hideMobileNav?: boolean;
}

export default function DashboardSidebar({
  items,
  userInfo,
  onLogout,
  panelType,
  onExpandedChange,
  hideMobileNav = false,
}: DashboardSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpandedChange?.(newState);
  };

  const accentBg = "bg-primary";
  const accentText = "text-primary";

  const panelTitle =
    panelType === "admin" ? "অ্যাডমিন প্যানেল" : "শিক্ষার্থী প্যানেল";
  const panelIcon = panelType === "admin" ? Shield : User;

  const PanelIcon = panelIcon;

  return (
    <>
      <aside
        className={`
          hidden lg:flex flex-col 
          bg-card
          border-r border-border
          h-screen z-30 fixed left-0 top-0 shadow-sm
          ${isExpanded ? "w-64" : "w-20"}
        `}
      >
        <button
          onClick={toggleSidebar}
          className={`absolute -right-3 top-24 bg-card border border-border rounded-full p-1 ${accentText} shadow-sm z-50 focus:outline-none`}
        >
          {isExpanded ? (
            <ChevronLeft size={18} strokeWidth={3} />
          ) : (
            <ChevronRight size={18} strokeWidth={3} />
          )}
        </button>

        <div className="flex items-center h-20 border-b border-border shrink-0 px-5 overflow-hidden whitespace-nowrap">
          <div
            className={`w-10 h-10 ${accentBg} rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl shadow-sm shrink-0`}
          >
            <PanelIcon size={24} />
          </div>
          <span
            className={`ml-3 font-bold text-xl ${accentText} ${
              isExpanded ? "opacity-100" : "opacity-0 hidden"
            }`}
          >
            {panelTitle}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 scrollbar-hide w-full px-3">
          {items.map((item) => (
            <SidebarItemLink
              key={item.title}
              item={item}
              isExpanded={isExpanded}
              accentText={accentText}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-border shrink-0 flex flex-col gap-3">
          <div className="flex items-center overflow-hidden whitespace-nowrap">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div
              className={`ml-3 ${
                isExpanded ? "opacity-100" : "opacity-0 hidden"
              }`}
            >
              <p className="text-sm font-bold text-foreground">
                {userInfo.name}
              </p>
              <p className="text-xs text-muted-foreground">{userInfo.role}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className={`w-full justify-start gap-2 text-muted-foreground ${
              !isExpanded && "px-3"
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {isExpanded && <span>লগ আউট</span>}
          </Button>
        </div>
      </aside>

      {!hideMobileNav && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 pb-safe rounded-t-2xl">
          <div className="flex justify-around items-center h-16 px-2">
            {items.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary space-y-1"
              >
                <div className={item.isActive ? "text-primary" : ""}>
                  <item.icon size={24} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-medium">{item.title}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}

interface SidebarItemLinkProps {
  item: SidebarItem;
  isExpanded: boolean;
  accentText: string;
}

function SidebarItemLink({
  item,
  isExpanded,
  accentText,
}: SidebarItemLinkProps) {
  return (
    <Link
      href={item.href}
      className={`
        flex items-center h-12 px-3 rounded-xl group relative overflow-hidden
        ${isExpanded ? "" : "justify-center"}
        ${
          item.isActive
            ? `bg-primary/10 border border-primary/20 ${accentText}`
            : "text-muted-foreground hover:bg-muted/50 hover:text-primary"
        }
      `}
    >
      <div className="shrink-0">
        <item.icon size={24} strokeWidth={2} />
      </div>

      <span
        className={`ml-3 font-medium whitespace-nowrap ${
          isExpanded ? "opacity-100" : "opacity-0 hidden"
        }`}
      >
        {item.title}
      </span>

      {!isExpanded && (
        <span className="absolute left-14 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 shadow-lg ml-2">
          {item.title}
        </span>
      )}
    </Link>
  );
}
