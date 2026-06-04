import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PATENTES } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import Banners from "@/components/app/Banners";
import PromoChips from "@/components/app/PromoChips";
import CategoryTabs from "@/components/app/CategoryTabs";
import ProductCard from "@/components/app/ProductCard";
import MobileSearch from "@/components/app/MobileSearch";

export default function Home() {
  const { user, setShowAuthPrompt } = useAuth();
  const [params] = useSearchParams();
  const search = params.get("q") || "";
  const [category, setCategory] = useState("all");
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, prRes] = await Promise.all([
          api.get("/products?active_only=true"),
          api.get("/promotions"),
        ]);
        setProducts(pRes.data);
        setPromotions(prRes.data.filter((p) => p.active));
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(load, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (user === false) {
      const shown = sessionStorage.getItem("gratinalli_auth_prompt_shown");
      if (!shown) {
        setShowAuthPrompt(true);
        sessionStorage.setItem("gratinalli_auth_prompt_shown", "1");
      }
    }
  }, [user, setShowAuthPrompt]);

  const filtered = useMemo(() => {
    let arr = products;
    if (category !== "all") arr = arr.filter((p) => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    return arr;
  }, [products, category, search]);

  const byPatente = useMemo(() => {
    const order = ["especial", "premium", "gourmet", "tradicional"];
    const groups = {};
    filtered.forEach((p) => { (groups[p.patente] ||= []).push(p); });
    return order
      .filter((k) => groups[k]?.length)
      .map((k) => ({ key: k, ...PATENTES[k], items: groups[k] }));
  }, [filtered]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="pt-4 sm:pt-6">
        <Banners />
      </section>

      {/* Mobile-only search bar below banners */}
      <section className="mt-4 md:hidden">
        <MobileSearch />
      </section>

      <section className="mt-8 sm:mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-2xl sm:text-3xl text-marrom">Promoções da casa</h2>
          <span className="text-sm text-marrom/60 hidden sm:block">Toque para ver</span>
        </div>
        <PromoChips promotions={promotions} />
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-2xl sm:text-3xl text-marrom">Cardápio</h2>
          <span className="text-sm text-marrom/60">{filtered.length} espetinhos</span>
        </div>
        <CategoryTabs value={category} onChange={setCategory} />
      </section>

      {loading ? (
        <div className="mt-16 text-center text-marrom/60">Carregando o cardápio...</div>
      ) : byPatente.length === 0 ? (
        <div className="mt-16 text-center text-marrom/60">Nenhum espetinho encontrado.</div>
      ) : (
        byPatente.map((g) => (
          <section key={g.key} className="mt-10" data-testid={`patente-section-${g.key}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 rounded-full" style={{ background: g.color }} />
              <h3 className="font-heading text-xl sm:text-2xl text-marrom">{g.label}</h3>
              <span className="text-sm text-marrom/50 hidden sm:inline">· {g.description}</span>
            </div>

            {/* Mobile: horizontal scroll | Desktop: grid */}
            <div
              data-testid={`patente-row-${g.key}`}
              className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto md:overflow-visible no-scrollbar snap-x md:snap-none -mx-4 px-4 md:mx-0 md:px-0 pb-2"
            >
              {g.items.map((p) => (
                <div key={p.id} className="snap-start shrink-0 w-[170px] sm:w-[200px] md:w-auto">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="h-16" />
    </div>
  );
}
