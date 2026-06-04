import React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatBRL } from "@/lib/api";
import { PATENTES, CATEGORY_IMAGE } from "@/lib/data";
import { useNavigate } from "react-router-dom";

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { add, setOpen } = useCart();
  const navigate = useNavigate();
  const isLogged = !!user && user !== false;

  const patente = PATENTES[product.patente] ?? PATENTES.tradicional;
  const img = product.image_url || CATEGORY_IMAGE[product.category] || "";
  const price = product.promo_price ?? product.price;
  const hasPromo = product.promo_price && product.promo_price < product.price;

  const handleAdd = () => {
    if (!isLogged) {
      navigate("/login?next=/");
      return;
    }
    if (user && user.profile_completed === false) {
      toast.info("Finalize seu cadastro para fazer pedidos");
      return;
    }
    add(product);
    setOpen(true);
  };

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className="relative bg-white rounded-3xl p-3 border-2 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col overflow-hidden group"
      style={{ borderColor: patente.color }}
    >
      {/* Inner colored area */}
      <div
        className="relative h-36 rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          background: `linear-gradient(180deg, ${patente.color}22 0%, ${patente.color}10 100%)`,
        }}
      >
        <span
          className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-white shadow-sm"
          style={{ background: patente.color }}
          data-testid={`patente-badge-${product.patente}`}
        >
          {patente.label}
        </span>
        {hasPromo && (
          <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-marrom text-white">
            Promo
          </span>
        )}
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-32 w-32 object-cover rounded-full drop-shadow-xl group-hover:scale-105 transition-transform"
            style={{ filter: "saturate(1.1)" }}
          />
        ) : (
          <div className="h-32 w-32 rounded-full grid place-items-center text-marrom/40 text-xs" style={{ background: `${patente.color}22` }}>
            sem imagem
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1 min-h-[64px]">
        <h3 className="font-heading font-bold text-base text-marrom leading-tight line-clamp-2">
          {product.name}
        </h3>
        <span className="text-xs text-marrom/60">{product.weight}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {isLogged ? (
          <>
            <div className="flex flex-col">
              {hasPromo && (
                <span className="text-xs text-marrom/40 line-through">
                  {formatBRL(product.price)}
                </span>
              )}
              <span className="text-lg font-bold text-terracota leading-none">
                {formatBRL(price)}
              </span>
            </div>
            <button
              data-testid={`add-to-cart-${product.id}`}
              onClick={handleAdd}
              aria-label={`Adicionar ${product.name} ao carrinho`}
              className="h-10 w-10 rounded-full bg-terracota text-white grid place-items-center hover:bg-marrom transition-colors shadow-md"
            >
              <Plus size={18} />
            </button>
          </>
        ) : (
          <button
            data-testid={`login-cta-${product.id}`}
            onClick={() => navigate("/login?next=/")}
            className="w-full py-2 rounded-full text-sm font-semibold border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
          >
            Entrar para ver preço
          </button>
        )}
      </div>
    </div>
  );
}
