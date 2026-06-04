import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, Tag, History, LogOut, Settings } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Pedidos", icon: LayoutDashboard, end: true },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/promocoes", label: "Promoções", icon: Tag },
  { to: "/admin/historico", label: "Histórico", icon: History },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="hidden lg:flex flex-col w-64 bg-marrom text-baunilha p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src="/logo/gratinalli-light.png" alt="Gratinalli Speteria" className="h-12 w-auto" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-70 px-2 -mt-1 mb-2">Painel Admin</div>
        <nav className="mt-6 space-y-1 flex-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                data-testid={`admin-nav-${n.to.replace(/\//g, '-')}`}
                className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-baunilha text-marrom" : "text-baunilha/80 hover:bg-baunilha/10"}`}
              >
                <Icon size={16} />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <button
          data-testid="admin-logout-button"
          onClick={onLogout}
          className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-baunilha/80 hover:bg-baunilha/10"
        >
          <LogOut size={16} /> Sair
        </button>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-marrom text-baunilha px-4 py-3 flex items-center justify-between">
          <img src="/logo/gratinalli-light.png" alt="Gratinalli Speteria" className="h-8 w-auto" />
          <button onClick={onLogout} className="text-sm underline">Sair</button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <nav className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({isActive}) => `shrink-0 px-3 py-2 rounded-full text-sm font-medium ${isActive ? "bg-terracota text-white" : "bg-white text-marrom border border-baunilha"}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
