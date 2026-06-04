import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, X, ShoppingBag, MapPin, ChevronDown, Plus as PlusIcon } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatBRL, formatApiError } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const QUOTE_CACHE_KEY = "gratinalli_quote_cache_v1";

function readCache() {
  try { return JSON.parse(localStorage.getItem(QUOTE_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeCache(obj) {
  try { localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(obj)); } catch {}
}

export default function CartModal() {
  const { items, inc, dec, remove, subtotal, open, setOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const addresses = user?.addresses || [];
  const primary = addresses.find((a) => a.primary) || addresses[0] || null;

  const [selectedId, setSelectedId] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  const selected = addresses.find((a) => a.id === selectedId) || primary;

  // Sync selection with primary when sheet opens / addresses load
  useEffect(() => {
    if (open && primary && !selectedId) {
      setSelectedId(primary.id);
    }
  }, [open, primary, selectedId]);

  const fetchQuote = useCallback(async (addr) => {
    if (!addr) return;
    const cep = (addr.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) return;
    const cache = readCache();
    if (cache[cep]) {
      setQuote(cache[cep]);
    }
    setQuoting(true);
    try {
      const { data } = await api.post("/delivery/quote", { cep, number: addr.number });
      setQuote(data);
      const c = readCache();
      c[cep] = data;
      writeCache(c);
    } catch (e) {
      if (!cache[cep]) {
        toast.error(formatApiError(e.response?.data?.detail) || "Não foi possível calcular o frete");
      }
    } finally {
      setQuoting(false);
    }
  }, []);

  useEffect(() => {
    if (open && selected) {
      fetchQuote(selected);
    }
    if (!selected) setQuote(null);
  }, [open, selected, fetchQuote]);

  const goCheckout = () => {
    setOpen(false);
    if (!user || user === false) {
      navigate("/login?next=/checkout");
      return;
    }
    if (selected) {
      try {
        localStorage.setItem("gratinalli_selected_addr_id", selected.id);
      } catch {}
    }
    navigate("/checkout");
  };

  const total = subtotal + (quote?.fee || 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        data-testid="cart-sheet"
        className="w-full sm:max-w-md flex flex-col p-0 bg-white"
      >
        <SheetHeader className="px-6 py-4 border-b border-baunilha flex flex-row items-center justify-between">
          <SheetTitle className="font-heading text-2xl text-marrom flex items-center gap-2">
            <ShoppingBag size={20} /> Seu carrinho
          </SheetTitle>
          <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-marrom/60 hover:text-marrom">
            <X size={20} />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-marrom/60">
              <div>
                <ShoppingBag size={42} className="mx-auto mb-3 opacity-40" />
                <p className="font-heading text-xl">Seu carrinho está vazio</p>
                <p className="text-sm mt-1">Adicione espetinhos para começar.</p>
              </div>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {items.map((it) => (
                  <li
                    key={it.product_id}
                    data-testid={`cart-item-${it.product_id}`}
                    className="flex items-start gap-3 pb-4 border-b border-baunilha/70"
                  >
                    <div className="w-16 h-16 rounded-xl bg-baunilha/60 grid place-items-center overflow-hidden shrink-0">
                      {it.image_url ? (
                        <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-marrom/40 text-[10px]">espeto</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-marrom text-sm leading-tight">{it.name}</div>
                      <div className="text-xs text-marrom/60">{it.weight}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          data-testid={`cart-dec-${it.product_id}`}
                          onClick={() => dec(it.product_id)}
                          className="w-7 h-7 rounded-full border border-marrom/30 text-marrom grid place-items-center hover:bg-baunilha"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{it.quantity}</span>
                        <button
                          data-testid={`cart-inc-${it.product_id}`}
                          onClick={() => inc(it.product_id)}
                          className="w-7 h-7 rounded-full bg-terracota text-white grid place-items-center hover:bg-marrom"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-terracota font-bold">{formatBRL(it.price * it.quantity)}</div>
                      <button
                        data-testid={`cart-remove-${it.product_id}`}
                        onClick={() => remove(it.product_id)}
                        className="text-marrom/40 hover:text-red-600 mt-2"
                        aria-label="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Address selector */}
              <div className="mt-6 border border-baunilha rounded-2xl p-3" data-testid="cart-address-block">
                <div className="text-[10px] uppercase tracking-widest text-marrom/60 font-semibold mb-1">Entregar em</div>
                {addresses.length === 0 ? (
                  <button
                    data-testid="cart-add-address-button"
                    onClick={() => { setOpen(false); navigate(user ? "/meus-enderecos" : "/login?next=/meus-enderecos"); }}
                    className="w-full flex items-center justify-between text-marrom hover:text-terracota"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <MapPin size={16} /> Cadastrar endereço
                    </span>
                    <PlusIcon size={16} />
                  </button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        data-testid="cart-address-trigger"
                        className="w-full flex items-start justify-between gap-2 text-left"
                      >
                        <div className="flex gap-2 items-start min-w-0">
                          <MapPin size={16} className="text-marrom shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-marrom flex items-center gap-2">
                              {selected?.label || "Selecionar"}
                              {selected?.primary && (
                                <span className="text-[9px] uppercase font-bold tracking-widest bg-terracota text-white px-1.5 py-0.5 rounded-full">
                                  Principal
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-marrom/60 truncate">
                              {selected ? `${selected.street}, ${selected.number} · ${selected.neighborhood}/${selected.city}` : "Escolher endereço"}
                            </div>
                          </div>
                        </div>
                        <ChevronDown size={14} className="text-marrom/60 mt-1 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      {addresses.map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          data-testid={`cart-address-option-${a.id}`}
                          onClick={() => setSelectedId(a.id)}
                          className="flex flex-col items-start gap-0.5"
                        >
                          <span className="text-sm font-semibold text-marrom flex items-center gap-2">
                            {a.label}
                            {a.primary && (
                              <span className="text-[9px] uppercase bg-terracota text-white px-1.5 py-0.5 rounded-full">Principal</span>
                            )}
                          </span>
                          <span className="text-xs text-marrom/60">{a.street}, {a.number}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        data-testid="cart-address-manage"
                        onClick={() => { setOpen(false); navigate("/meus-enderecos"); }}
                        className="text-terracota"
                      >
                        <PlusIcon size={14} className="mr-1.5"/> Gerenciar endereços
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-baunilha px-6 py-4 space-y-2 bg-cream">
            <div className="flex items-center justify-between text-sm text-marrom/80">
              <span>Subtotal</span>
              <span data-testid="cart-subtotal" className="font-semibold text-marrom">{formatBRL(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-marrom/80">
              <span>Frete{quote?.distance_km ? ` · ${quote.distance_km} km` : ""}</span>
              <span data-testid="cart-fee" className="font-semibold text-marrom">
                {quoting && !quote ? "calculando..." : quote ? formatBRL(quote.fee) : (selected ? "—" : "definir endereço")}
              </span>
            </div>
            <div className="flex items-center justify-between text-base pt-1 border-t border-baunilha/70">
              <span className="font-heading text-marrom">Total</span>
              <span data-testid="cart-total" className="font-bold text-terracota">{formatBRL(total)}</span>
            </div>
            <button
              data-testid="cart-checkout-button"
              onClick={goCheckout}
              className="w-full h-12 rounded-full bg-terracota text-white font-semibold hover:bg-marrom transition-colors"
            >
              Finalizar pedido
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
