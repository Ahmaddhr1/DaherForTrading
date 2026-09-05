"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ShoppingCart, Wallet, Boxes, MoreHorizontal, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import tabs from "@/lib/SideBarTabs";

const findTab = (label) => tabs.find((tab) => tab.label === label);

// Groups the sidebar's 9 tabs into a handful of bottom-bar slots - a flat
// row of 9 icons doesn't fit on a phone screen. Dashboard and Orders (the
// most frequently used) get their own direct slot; everything else is
// grouped into a section that opens a small sheet listing its tabs.
const SECTIONS = [
  { key: "dashboard", label: "Home", icon: <Home size={20} />, path: "/dashboard" },
  { key: "orders", label: "Orders", icon: <ShoppingCart size={20} />, path: "/dashboard/orders" },
  {
    key: "sales",
    label: "Sales",
    icon: <Wallet size={20} />,
    items: ["Customers", "Payments", "Disbursements"].map(findTab).filter(Boolean),
  },
  {
    key: "inventory",
    label: "Stock",
    icon: <Boxes size={20} />,
    items: ["Products", "Categories", "Companies"].map(findTab).filter(Boolean),
  },
  {
    key: "more",
    label: "More",
    icon: <MoreHorizontal size={20} />,
    items: ["Settings"].map(findTab).filter(Boolean),
  },
];

// Mobile-only bottom navigation bar - see MySideBar for the desktop (lg+)
// sidebar it replaces below that breakpoint.
export function MobileBottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openSection, setOpenSection] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  };

  const isSectionActive = (section) =>
    section.path
      ? pathname === section.path
      : section.items.some((tab) => pathname === tab.path);

  const activeSheet = SECTIONS.find((section) => section.key === openSection);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {SECTIONS.map((section) => {
            const active = isSectionActive(section);
            const className = `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-primary" : "text-gray-500"
            }`;

            if (section.path) {
              return (
                <Link key={section.key} href={section.path} className={className}>
                  {section.icon}
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
                {section.icon}
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
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">{activeSheet.label}</h2>
              <button
                onClick={() => setOpenSection(null)}
                className="text-gray-400 hover:text-gray-600 rounded-md p-1"
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
                    pathname === tab.path ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
              {activeSheet.key === "more" && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
