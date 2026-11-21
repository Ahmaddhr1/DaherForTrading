"use client";
import { t } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LangProvider";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, ClipboardList, ShoppingCart, Wallet, Boxes, MoreHorizontal, LogOut, X, Search, UserRound, CreditCard } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import tabs from "@/lib/SideBarTabs";
import { useCart } from "@/lib/cartContext";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasPermission } from "@/lib/permissions";

// Searches both top-level tabs and any nested `children` (see
// SideBarTabs.js) - mobile doesn't nest them visually, it just needs to
// find them by label for its own flat section groupings below.
const findTab = (label) => {
  for (const tab of tabs) {
    if (tab.label === label) return tab;
    const child = tab.children?.find((c) => c.label === label);
    if (child) return child;
  }
  return undefined;
};

// Mobile-only bottom navigation bar - see MySideBar for the desktop (lg+)
// sidebar it replaces below that breakpoint.
export function MobileBottomBar() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [openSection, setOpenSection] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  // Drives whether ownerOnly/permission-gated tabs show up in the "More"
  // sheet - the real enforcement is server-side in middleware.js, this
  // just keeps an employee from seeing a link that would 403 (same as
  // MySideBar).
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";
  const canViewStats = hasPermission(me, "canViewStats");

  // Groups the sidebar's tabs into a handful of bottom-bar slots - a flat
  // row of icons doesn't fit on a phone screen. Cart gets its own direct
  // slot (most frequently used) and Search gets a raised, visually
  // distinct slot beside it since it's used from anywhere; everything
  // else is grouped into a section that opens a small sheet listing its
  // tabs - Orders groups "Orders" and its sub-tab "Drafts" (see
  // SideBarTabs.js), Home groups Dashboard with its nested stats
  // sub-pages (Profit Margins, Supplier Trends - see Dashboard's
  // `children` in SideBarTabs.js), the same pattern Sales/Stock already
  // use for their own tabs.
  const SECTIONS = [
    // The stats/charts overview page needs canViewStats (see middleware.js) -
    // an admin without it gets no "Home" slot at all rather than a dead link.
    ...(isOwner || canViewStats
      ? [
          {
            key: "dashboard",
            label: "Home",
            icon: <Home size={20} />,
            items: ["Dashboard", "Profit Margins", "Supplier Trends", "Overdue Debt"].map(findTab).filter(Boolean),
          },
        ]
      : []),
    {
      key: "orders",
      label: "Orders",
      icon: <ClipboardList size={20} />,
      items: ["Orders", "Drafts", "Returns"].map(findTab).filter(Boolean),
    },
    {
      key: "cart",
      label: "Cart",
      icon: <ShoppingCart size={20} />,
      action: openCart,
      badge: itemCount,
    },
    // Owner already has quick access to Payments inside the Sales sheet;
    // an employee's most frequent money-side need is recording a payment,
    // so give them a direct slot here instead of burying it in More.
    ...(isOwner
      ? []
      : [
          {
            key: "payments",
            label: "Payments",
            icon: <CreditCard size={20} />,
            path: findTab("Payments")?.path,
          },
        ]),
    {
      key: "search",
      label: "Search",
      icon: <Search size={22} />,
      action: () => setSearchOpen(true),
      special: true,
    },
    // Owner gets the full Sales group (Customers plus the money-side
    // pages); a plain employee's most frequent need here is just looking
    // up a customer, so give them a direct "Customers" link in the same
    // slot instead of burying it one level down - the rest of what Sales
    // held for them moves into the More sheet instead of disappearing.
    isOwner
      ? {
          key: "sales",
          label: "Sales",
          icon: <Wallet size={20} />,
          items: ["Customers", "Overdue Debt", "Payments", "Disbursements"].map(findTab).filter(Boolean),
        }
      : {
          key: "customers",
          label: "Customers",
          icon: <UserRound size={20} />,
          path: findTab("Customers")?.path,
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
      items: [
        ...(isOwner ? [] : ["Overdue Debt", "Disbursements"]),
        "Settings",
        ...(isOwner ? ["Admins", "Activity Log"] : []),
      ].map(findTab).filter(Boolean),
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
        <div className="grid" style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, minmax(0, 1fr))` }}>
          {SECTIONS.map((section) => {
            const active = isSectionActive(section);
            const className = `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-primary dark:text-white" : "text-gray-500 dark:text-gray-400"
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

            if (section.special) {
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={section.action}
                  className="relative flex flex-col items-center justify-center"
                  aria-label={t(section.label)}
                >
                  <span className="absolute -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 ring-4 ring-sidebar transition-transform active:scale-95">
                    {section.icon}
                  </span>
                  <span className="mt-9 text-[11px] font-medium text-gray-500 dark:text-gray-400">{t(section.label)}</span>
                </button>
              );
            }

            if (section.action) {
              return (
                <button key={section.key} type="button" onClick={section.action} className={className}>
                  {iconWithBadge}
                  {t(section.label)}
                </button>
              );
            }

            if (section.path) {
              return (
                <Link key={section.key} href={section.path} className={className}>
                  {iconWithBadge}
                  {t(section.label)}
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
                {t(section.label)}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Section sheet - lists the tabs inside a grouped section */}
      {activeSheet && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenSection(null)} />
          <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t(activeSheet.label)}</h2>
              <button
                onClick={() => setOpenSection(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md p-1"
                aria-label={t("Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 pb-4">
              {activeSheet.items.map((item) =>
                item.action ? (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setOpenSection(null);
                      item.action();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="relative">
                      {item.icon}
                      {item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {t(item.label)}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setOpenSection(null)}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      pathname === item.path ? "bg-primary text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.icon}
                    {t(item.label)}
                  </Link>
                )
              )}
              {activeSheet.key === "more" && (
                <>
                  <button
                    onClick={() => {
                      setOpenSection(null);
                      setLogoutConfirmOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={20} />
                    {t("Logout")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title={t("Log out?")}
        description={t("You'll need to sign in again to access your dashboard.")}
        confirmLabel={t("Logout")}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
      />
    </>
  );
}
