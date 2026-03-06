import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState, useEffect, useRef } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "home" },
  { href: "/admin/users", label: "Utilisateurs", icon: "users" },
  { href: "/admin/activities", label: "Activités", icon: "calendar" },
  { href: "/admin/applications", label: "Inscriptions", icon: "clipboard" },
  { href: "/admin/activityTypes", label: "Types d'activités", icon: "tag" },
  { href: "/admin/children", label: "Enfants", icon: "child" },
  { href: "/admin/family-status", label: "Situation Familiale", icon: "heart" },
  { href: "/admin/history", label: "Historique", icon: "clock" },
];

function MenuIcon({ name, className }: { name: string; className?: string }) {
  const c = className || "w-5 h-5";
  switch (name) {
    case "home":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "users":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "tag":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case "heart":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case "child":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "clock":
      return (
        <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; role?: string; email?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("ocp_user");
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch (_) {}
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileMenuOpen]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ocp_token");
      localStorage.removeItem("ocp_user");
    }
    router.push("/login");
  }

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : "Administrateur";
  const roleLabel = user?.role === "ADMIN" ? "admin" : "employé";

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside
        className={`${collapsed ? "w-[4.5rem]" : "w-60"} bg-[#176139] text-white flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        {/* Branding : image large centrée et zoomée, écriture (OCP Excursions / Espace admin) en bas */}
        <div className={`py-4 border-b border-white/20 flex flex-col items-center justify-center ${collapsed ? "px-2" : "px-3"}`}>
          <div className="w-full flex justify-center mb-2">
            <div className="w-full max-w-[140px] rounded-lg bg-white flex items-center justify-center p-1.5 shadow-sm overflow-visible">
              {!logoError ? (
                <img
                  src="/logo-ocp.png"
                  alt="Logo OCP"
                  className="w-full h-auto max-h-20 object-contain object-center"
                  style={{ transform: "scale(1.65)", minHeight: "2.5rem" }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-[#176139] font-bold text-xl py-3">OCP</span>
              )}
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col items-center text-center w-full mt-0.5">
              <span className="text-sm text-white/90">Espace administrateur</span>
            </div>
          )}
        </div>

        {/* Profil utilisateur (cliquable → menu) */}
        <div
          ref={profileRef}
          className={`py-3 border-b border-white/20 relative ${collapsed ? "px-2 flex justify-center" : "px-3"}`}
        >
          <button
            type="button"
            onClick={() => setProfileMenuOpen((o) => !o)}
            className={`w-full rounded-lg overflow-hidden bg-white/10 relative flex items-end text-left cursor-pointer border-0 ${collapsed ? "w-10 h-10 rounded-full" : "min-h-[72px] p-3"}`}
            style={{
              backgroundImage: "url(https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-[#176139]/85" />
            <div className={`relative z-10 flex items-center w-full ${collapsed ? "justify-center h-full" : "gap-3"}`}>
              {collapsed ? (
                <div className="w-8 h-8 rounded-full bg-white/30 border-2 border-white/50" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white/30 flex-shrink-0 border-2 border-white/50" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate capitalize">
                      {displayName.toLowerCase()}
                    </p>
                    <p className="text-xs text-white/90 capitalize">{roleLabel}</p>
                  </div>
                  <svg className="w-4 h-4 text-white/90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </div>
          </button>

          {/* Menu déroulant */}
          {profileMenuOpen && !collapsed && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 py-1 rounded-lg bg-white shadow-lg border border-slate-200 min-w-[180px]">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate capitalize">{displayName.toLowerCase()}</p>
                <p className="text-xs text-slate-500 capitalize">{roleLabel}</p>
                {user?.email && <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>}
              </div>
              <Link
                href="/admin/dashboard"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <MenuIcon name="home" className="w-4 h-4" />
                Tableau de bord
              </Link>
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Déconnexion
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-auto">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-medium text-white/80 uppercase tracking-wider">
              Navigation
            </p>
          )}
          <ul className="space-y-0.5">
            {menuItems.map((item) => {
              const active = router.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white transition-colors ${
                      active ? "bg-white/25 font-medium" : "hover:bg-white/15"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0 text-white/95">
                      <MenuIcon name={item.icon} />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Déconnexion + Collapse */}
        <div className="px-2 py-3 border-t border-white/20 space-y-1">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center rounded-lg px-3 py-2 text-sm text-white hover:bg-white/15 transition-colors ${collapsed ? "justify-center" : "gap-3"}`}
            title="Déconnexion"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center justify-center rounded-full w-9 h-9 mx-auto bg-white/15 hover:bg-white/25 text-white transition-colors"
            title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
