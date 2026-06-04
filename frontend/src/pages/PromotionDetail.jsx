import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import ProductCard from "@/components/app/ProductCard";
import { ArrowLeft } from "lucide-react";

export default function PromotionDetail() {
  const { id } = useParams();
  const [promo, setPromo] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: promos }, { data: prods }] = await Promise.all([
          api.get("/promotions"),
          api.get("/products?active_only=true"),
        ]);
        const p = promos.find((x) => x.id === id);
        setPromo(p);
        if (p?.product_ids?.length) {
          setProducts(prods.filter((pr) => p.product_ids.includes(pr.id)));
        } else {
          // Show featured (premium + gourmet) when promo has no explicit products
          setProducts(prods.filter((pr) => ["premium", "especial"].includes(pr.patente)).slice(0, 8));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-marrom/70 text-sm hover:text-marrom">
        <ArrowLeft size={16} /> Voltar
      </Link>

      {loading ? (
        <div className="mt-10 text-marrom/60">Carregando promoção...</div>
      ) : !promo ? (
        <div className="mt-10 text-marrom/60">Promoção não encontrada.</div>
      ) : (
        <>
          <section className="mt-4 rounded-3xl p-8 sm:p-12 text-baunilha relative overflow-hidden" style={{ background: "linear-gradient(135deg, #893B0B 0%, #C34D1D 100%)" }}>
            <h1 className="font-heading text-4xl sm:text-6xl font-bold leading-none">{promo.title}</h1>
            {promo.subtitle && <p className="mt-3 text-lg opacity-95 max-w-2xl">{promo.subtitle}</p>}
            {promo.discount_pct ? (
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dourado text-marrom font-bold">
                {promo.discount_pct}% OFF
              </div>
            ) : null}
          </section>

          <section className="mt-10">
            <h2 className="font-heading text-2xl text-marrom mb-4">Itens em destaque</h2>
            {products.length === 0 ? (
              <div className="text-marrom/60">Nenhum item vinculado a esta promoção ainda.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </section>
        </>
      )}

      <div className="h-16" />
    </div>
  );
}
