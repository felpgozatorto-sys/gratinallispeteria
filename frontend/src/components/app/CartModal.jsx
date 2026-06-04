import React from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatBRL } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function CartModal() {
  const { items, inc, dec, remove, subtotal, open, setOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const goCheckout = () => {
    setOpen(false);
    if (!user || user === false) {
      navigate("/login?next=/checkout");
      return;
    }
    navigate("/checkout");
  };

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
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-baunilha px-6 py-4 space-y-3 bg-cream">
            <div className="flex items-center justify-between text-sm text-marrom/80">
              <span>Subtotal</span>
              <span data-testid="cart-subtotal" className="font-semibold text-marrom">{formatBRL(subtotal)}</span>
            </div>
            <div className="text-xs text-marrom/50">O frete será calculado no checkout pelo CEP.</div>
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
