"use client";
import { t } from "@/core/shared/i18n";
import { useT } from "@/core/shared/i18n/LangProvider";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ListCollapse, Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import tabs from "@/core/shared/SideBarTabs";
import { toast } from "@/core/shared/i18n/toast";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hasPermission } from "@/core/platform/permissions";

// Desktop-only navigation (lg and up). On mobile, navigation is handled by
// MobileBottomBar instead - see components/MobileBottomBar.jsx.
export function MySideBar() {
  const t = useT();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedTabs, setExpandedTabs] = useState({});
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Ctrl/Cmd+K opens the global search from anywhere on desktop.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Drives which ownerOnly/permission-gated tabs are shown - the real
  // enforcement is server-side in middleware.js, this is just so an
  // employee doesn't see a link that would 403.
  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => (await axios.get("/api/admin/me")).data,
  });
  const isOwner = me?.role === "owner";
  const canSee = (tab) => (!tab.ownerOnly || isOwner) && (!tab.permission || hasPermission(me, tab.permission));
  // A hidden parent normally hides its children too, except children
  // marked promoteIfParentHidden (e.g. Overdue Debt under Dashboard), which
  // then show as ordinary top-level tabs in the parent's place.
  const visibleTabs = tabs.flatMap((tab) => {
    if (canSee(tab)) return [tab];
    return (tab.children || []).filter((child) => child.promoteIfParentHidden && canSee(child));
  });

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // A tab with children starts expanded only if one of its children is the
  // active page, so landing on e.g. Profit Margins directly doesn't hide
  // its own link; otherwise it's collapsed behind the arrow until clicked.
  const isTabExpanded = (tab) =>
    tab.label in expandedTabs ? expandedTabs[tab.label] : !!tab.children?.some((c) => pathname === c.path);

  const toggleExpanded = (tab) => setExpandedTabs((prev) => ({ ...prev, [tab.label]: !isTabExpanded(tab) }));

  const handleLogout = async() => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });

      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed:", error);
    }

  };

  const renderLink = (tab, index) => {
    const isActive = pathname === tab.path;
    const hasChildren = !!tab.children?.length;
    const expanded = hasChildren && isTabExpanded(tab);

    return (
      <div
        key={index}
        className={`flex items-center transition-colors ${
          isActive ? "bg-primary text-white" : "hover:bg-primary hover:text-white"
        }`}
      >
        <Link
          href={tab.path}
          className={`flex items-center flex-1 p-4 ${isCollapsed ? "justify-center" : ""}`}
        >
          <span>{tab.icon}</span>
          {!isCollapsed && <span className="ms-3">{t(tab.label)}</span>}
        </Link>
        {hasChildren && !isCollapsed && (
          <button
            type="button"
            onClick={() => toggleExpanded(tab)}
            className="p-4 ps-0"
            aria-label={expanded ? t("Collapse {0}", {
              0: tab.label
            }) : t("Expand {0}", {
              0: tab.label
            })}
            aria-expanded={expanded}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
    );
  };

  // Sub-tabs use the same size as main tabs (same padding, icon, text) but
  // an amber scheme with a left accent bar, so they read as part of their
  // parent rather than separate sections.
  const renderChildLink = (child) => {
    const isActive = pathname === child.path;
    return (
      <Link
        key={child.path}
        href={child.path}
        title={isCollapsed ? t(child.label) : undefined}
        className={`flex items-center p-4 border-s-4 transition-colors ${
          isCollapsed ? "justify-center" : "ps-7"
        } ${
          isActive
            ? "bg-amber-500 text-gray-900 border-amber-600"
            : "bg-amber-500/10 border-amber-400 hover:bg-amber-500 hover:text-gray-900"
        }`}
      >
        <span>{child.icon}</span>
        {!isCollapsed && <span className="ms-3">{t(child.label)}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`hidden lg:flex lg:sticky top-0 start-0 h-screen z-40 bg-sidebar text-sidebar-foreground
                  transition-all duration-300 ease-in-out
                  ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <svg width="28" height="28" viewBox="20 30 102 102" className="shrink-0 text-sidebar-foreground">
                <rect x="20" y="86" width="26" height="46" rx="7" fill="currentColor" />
                <rect x="58" y="58" width="26" height="74" rx="7" fill="currentColor" />
                <rect x="96" y="30" width="26" height="102" rx="7" fill="#E8A33D" />
              </svg>
              <h1 className="text-xl font-bold whitespace-nowrap" style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}>
                {t("Invento")}
              </h1>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-primary hover:text-white duration-150"
            aria-label={isCollapsed ? t("Expand sidebar") : t("Collapse sidebar")}
          >
            <ListCollapse className={isCollapsed ? "" : "rotate-180"} />
          </button>
        </div>

        {/* Global search trigger */}
        <div className="p-3">
          <button
            onClick={() => setSearchOpen(true)}
            className={`w-full flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-primary hover:text-white transition-colors duration-150 ${
              isCollapsed ? "justify-center" : ""
            }`}
            aria-label={t("Search")}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-start">{t("Search")}</span>
                <kbd className="text-xs opacity-60">{t("⌘K")}</kbd>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-2">
            {visibleTabs.map((tab, index) => (
              <div key={index}>
                {renderLink(tab, index)}
                {isTabExpanded(tab) && tab.children?.filter(canSee).map(renderChildLink)}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border">
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className={`w-full p-4 flex items-center hover:bg-destructive hover:text-white cursor-pointer duration-150 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut />
            {!isCollapsed && <span className="ms-3">{t("Logout")}</span>}
          </button>
        </div>
      </div>
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
    </aside>
  );
}
