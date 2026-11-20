"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, ShoppingCart, Wallet, Boxes, MoreHorizontal, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import tabs from "@/lib/SideBarTabs";
import { useCart } from "@/lib/cartContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const findTab = (label) => tabs.find((tab) => tab.label === label);

// Mobile-only bottom navigation bar - see MySideBar for the desktop (lg+)
// sidebar it replaces below that breakpoint.
export function MobileBottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openSection, setOpenSection] = useState(null);
  const { itemCount, openCart } = useCart();

  // Drives whether Admins/Activity Log show up in the "More" sheet - the
  // real enforcement is server-side in middleware.js, this just keeps an
  // employee from seeing a link that would 403 (same as MySideBar).
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";

  // Groups the sidebar's tabs into a handful of bottom-bar slots - a flat
  // row of icons doesn't fit on a phone screen. Dashboard and Cart (the
  // most frequently used) each get their own direct slot; everything else
  // is grouped into a section that opens a small sheet listing its tabs -
  // Orders groups "Orders" and its sub-tab "Drafts" (see SideBarTabs.js),
  // the same pattern Sales/Stock already use for their own tabs.
  const SECTIONS = [
    // The stats/charts overview page is owner-only (see middleware.js) -
    // an employee gets no "Home" slot at all rather than a dead link.
    ...(isOwner ? [{ key: "dashboard", label: "Home", icon: <Home size={20} />, path: "/dashboard" }] : []),
    {
      key: "orders",
      label: "Orders",
      icon: <ClipboardList size={20} />,
      items: ["Orders", "Drafts"].map(findTab).filter(Boolean),
    },
    {
      key: "cart",
      label: "Cart",
      icon: <ShoppingCart size={20} />,
      action: openCart,
      badge: itemCount,
    },
    {
      key: "sales",
      label: "Sales",
      icon: <Wallet size={20} />,
      items: ["Customers", "Overdue Debt", "Payments", "Disbursements"].map(findTab).filter(Boolean),
    },
    {
      key: "inventory",
      label: "Stock",
      icon: <Boxes size={20} />,
      items: ["Products", "Categories", "Companies", "Stock History"].map(findTab).filter(Boolean),
    },
    {
      key: "more",
      label: "More",
      icon: <MoreHorizontal size={20} />,
      items: ["Settings", ...(isOwner ? ["Admins", "Activity Log"] : [])].map(findTab).filter(Boolean),
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  };

  const isSectionActive = (section) => {
    if (section.isActive) return section.isActive();
    if (section.path) return pathname === section.path;
    if (section.items) return section.items.some((tab) => pathname === tab.path);
    return false;
  };

  const activeSheet = SECTIONS.find((section) => section.key === openSection);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
        <div className={`grid ${isOwner ? "grid-cols-6" : "grid-cols-5"}`}>
          {SECTIONS.map((section) => {
            const active = isSectionActive(section);
            const className = `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-primary" : "text-gray-500 dark:text-gray-400"
            }`;
            const iconWithBadge = (
              <span className="relative">
                {section.icon}
                {section.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                    {section.badge}
                  </span>
                )}
              </span>
            );

            if (section.action) {
              return (
                <button key={section.key} type="button" onClick={section.action} className={className}>
                  {iconWithBadge}
                  {section.label}
                </button>
              );
            }

            if (section.path) {
              return (
                <Link key={section.key} href={section.path} className={className}>
                  {iconWithBadge}
                  {section.label}
                </Link>
              );
            }

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setOpenSection(section.key)}
                className={className}
              >
                {iconWithBadge}
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Section sheet - lists the tabs inside a grouped section */}
      {activeSheet && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenSection(null)} />
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-t-2xl shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">{activeSheet.label}</h2>
              <button
                onClick={() => setOpenSection(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 dark:hover:text-gray-300 rounded-md p-1"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 pb-4">
              {activeSheet.items.map((tab) => (
                <Link
                  key={tab.path}
                  href={tab.path}
                  onClick={() => setOpenSection(null)}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    pathname === tab.path ? "bg-primary text-white" : "text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
              {activeSheet.key === "more" && (
                <>
                  <ThemeToggle className="w-full text-gray-700 dark:text-gray-300 dark:text-gray-300" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={20} />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
