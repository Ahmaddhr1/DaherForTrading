"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Menu, X, ListCollapse, Languages } from "lucide-react";
import tabs from "@/lib/SideBarTabs";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function MySideBar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleLanguage = () => setLanguage(language === "ar" ? "en" : "ar");

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
    return (
      <Link
        key={index}
        href={tab.path}
        className={`flex items-center p-4 transition-colors ${
          isActive ? "bg-primary text-white" : "hover:bg-primary hover:text-white"
        } ${isCollapsed ? "justify-center" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      >
        <span>{tab.icon}</span>
        {!isCollapsed && <span className="ms-3">{t(tab.labelKey)}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 end-6 z-40 p-2 bg-primary text-white rounded-lg"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Backdrop for mobile */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity ${
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={toggleMobile}
      />

      {/* Combined Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 start-0 h-screen z-40 bg-sidebar text-primary
                    transition-all duration-300 ease-in-out
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"}
                    lg:translate-x-0
                    ${isCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 flex justify-between items-center border-b border-gray-700">
            {!isCollapsed && <h1 className="text-xl font-bold">M.D.T</h1>}
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-lg hover:bg-primary hover:text-white duration-150"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ListCollapse className={isCollapsed ? "rtl:rotate-180" : "rotate-180 rtl:rotate-0"} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-2">
              {tabs.map((tab, index) => renderLink(tab, index))}
            </div>
          </nav>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className={`p-4 border-t border-gray-700 flex items-center hover:bg-primary hover:text-white cursor-pointer duration-150 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <Languages />
            {!isCollapsed && (
              <span className="ms-3">{language === "ar" ? "English" : "العربية"}</span>
            )}
          </button>

          {/* Footer */}
          <button
            onClick={handleLogout}
            className={`p-4 border-t border-gray-700 flex items-center hover:bg-destructive hover:text-white cursor-pointer duration-150 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <LogOut />
            {!isCollapsed && <span className="ms-3">{t("nav.logout")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
