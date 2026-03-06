import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/activities", label: "Activités" },
  { href: "/admin/applications", label: "Inscriptions" },
  { href: "/admin/activityTypes", label: "Types d'activités" },
  { href: "/admin/children", label: "Enfants" },
  { href: "/admin/family-status", label: "Situation Familiale" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ocp_token");
      localStorage.removeItem("ocp_user");
    }
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-72 bg-emerald-800 text-white flex flex-col">
        <div className="px-5 py-4 border-b border-emerald-700/60 flex flex-col items-center">
          <img src="/logo-ocp.png" alt="Logo OCP" className="h-12 mb-2" />
          <div className="text-xs text-emerald-100/90">Espace administrateur</div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          {menuItems.map((item) => {
            const active = router.pathname === item.href;
            const baseClasses =
              "block rounded px-3 py-2 hover:bg-emerald-700/80 hover:text-white";
            const activeClasses = active
              ? "bg-emerald-600 text-white"
              : "text-emerald-50";
            return (
              <Link key={item.href} href={item.href} className={`${baseClasses} ${activeClasses}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 py-4 border-t border-emerald-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm text-emerald-50 hover:bg-emerald-700/80 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

