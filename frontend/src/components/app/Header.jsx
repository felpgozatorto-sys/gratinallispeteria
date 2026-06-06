import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, MapPin, User2, LogOut, Search, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, logout } = useAuth();
  const { setOpen, totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  const isAdmin = user && user.role === "admin";
  const isLogged = !!user && user !== false;
  const primaryAddress = user?.addresses?.find((a) => a.primary) || user?.addresses?.[0];

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/?q=${encodeURIComponent(q.trim())}`);
  };

  const AvatarOrLoginDesktop = isLogged ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="user-menu-button"
          className="h-11 w-11 rounded-full bg-baunilha grid place-items-center text-marrom hover:bg-dourado/40 overflow-hidden"
        >
          {user.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <User2 size={18} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-heading">
          Olá, {user.name?.split(" ")[0] || "cliente"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem data-testid="goto-admin" onClick={() => navigate("/admin")}>
            Painel Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuItem data-testid="goto-orders" onClick={() => navigate("/meus-pedidos")}>
          Meus pedidos
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="goto-addresses" onClick={() => navigate("/meus-enderecos")}>
          Meus endereços
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="logout-button" onClick={logout}>
          <LogOut size={14} className="mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Link
      to={`/login?next=${encodeURIComponent(location.pathname)}`}
      data-testid="header-login-link"
      className="inline-flex items-center h-11 px-4 rounded-full border-2 border-marrom text-marrom font-semibold hover:bg-marrom hover:text-white transition-colors"
    >
      Entrar
    </Link>
  );

  const AvatarMobile = isLogged ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="user-menu-button-mobile"
          className="h-10 w-10 rounded-full bg-baunilha grid place-items-center text-marrom overflow-hidden"
        >
          {user.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <User2 size={16} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-heading">
          Olá, {user.name?.split(" ")[0] || "cliente"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>Painel Admin</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate("/meus-pedidos")}>Meus pedidos</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/meus-enderecos")}>Meus endereços</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}><LogOut size={14} className="mr-2"/> Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Link
      to={`/login?next=${encodeURIComponent(location.pathname)}`}
      data-testid="header-login-link-mobile"
      className="inline-flex items-center h-10 px-3 rounded-full border-2 border-marrom text-marrom text-sm font-semibold"
    >
      Entrar
    </Link>
  );

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-baunilha"
    >
      {/* Desktop layout */}
      <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 items-center gap-4">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2 shrink-0">
          <img src="/logo/gratinalli-dark.png" alt="Gratinnari Speteria" className="h-10 w-auto" />
        </Link>

        <form onSubmit={onSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-marrom/50" size={18} />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar espetinho, ex: picanha..."
              className="w-full pl-11 pr-4 h-11 rounded-full bg-cream border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60 placeholder:text-marrom/40"
            />
          </div>
        </form>

        <button
          data-testid="address-button"
          onClick={() => navigate(isLogged ? "/meus-enderecos" : "/login?next=/meus-enderecos")}
          className="hidden lg:inline-flex items-center gap-2 text-sm text-marrom hover:text-terracota"
        >
          <MapPin size={16} />
          <span className="max-w-[220px] truncate">
            {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.number}` : "Definir endereço"}
          </span>
          <ChevronDown size={14} />
        </button>

        <button
          data-testid="cart-button"
          onClick={() => setOpen(true)}
          className="relative inline-flex items-center gap-2 h-11 px-4 rounded-full bg-terracota text-white hover:bg-marrom transition-colors"
        >
          <ShoppingCart size={18} />
          <span className="text-sm font-semibold">Carrinho</span>
          {totalItems > 0 && (
            <span
              data-testid="cart-badge"
              className="absolute -top-1 -right-1 bg-dourado text-marrom text-[11px] font-bold rounded-full min-w-[20px] h-[20px] grid place-items-center px-1"
            >
              {totalItems}
            </span>
          )}
        </button>

        {AvatarOrLoginDesktop}
      </div>

      {/* Mobile layout: address centered, cart + avatar on the right (no flame, no logo, no search) */}
      <div className="md:hidden">
        <div className="grid grid-cols-[1fr_auto] items-center px-4 py-2 gap-2">
          <button
            data-testid="address-button-mobile"
            onClick={() => navigate(isLogged ? "/meus-enderecos" : "/login?next=/meus-enderecos")}
            className="flex items-center justify-center gap-1.5 mx-auto text-marrom text-sm font-medium max-w-full"
          >
            <MapPin size={14} />
            <span className="truncate max-w-[60vw]">
              {primaryAddress ? `${primaryAddress.street}, ${primaryAddress.number}` : "Definir endereço"}
            </span>
            <ChevronDown size={12} />
          </button>

          <div className="flex items-center gap-2 justify-self-end">
            <button
              data-testid="cart-button-mobile"
              onClick={() => setOpen(true)}
              className="relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-terracota text-white"
            >
              <ShoppingCart size={16} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-dourado text-marrom text-[10px] font-bold rounded-full min-w-[18px] h-[18px] grid place-items-center px-1">
                  {totalItems}
                </span>
              )}
            </button>
            {AvatarMobile}
          </div>
        </div>
      </div>
    </header>
  );
}
