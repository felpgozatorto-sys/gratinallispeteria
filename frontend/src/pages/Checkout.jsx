import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { api, formatBRL, formatApiError } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/data";
import { toast } from "sonner";
import { MapPin, Search, Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import SuccessModal from "@/components/app/SuccessModal";

const ICONS = { pix: Smartphone, credit_card: CreditCard, debit_card: CreditCard, cash: Banknote };

export default function Checkout() {
  const { user, refreshMe } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(null);
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [quote, setQuote] = useState(null); // { distance_km, fee }
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);

  useEffect(() => {
    // Prefill from saved primary address
    const saved = (user?.addresses || []).find((a) => a.primary) || user?.addresses?.[0];
    if (saved) {
      setCep(saved.cep);
      setAddress({
        cep: saved.cep, street: saved.street, neighborhood: saved.neighborhood,
        city: saved.city, state: saved.state,
      });
      setNumber(saved.number || "");
      setComplement(saved.complement || "");
    }
    if (user?.phone) setPhone(user.phone);
  }, [user]);

  useEffect(() => {
    if (items.length === 0) {
      // allow viewing but warn
    }
  }, [items]);

  const lookupCep = async () => {
    setLoadingCep(true);
    try {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) {
        toast.error("CEP inválido");
        return;
      }
      const { data } = await api.get(`/cep/${digits}`);
      setAddress({
        cep: data.cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      });
      const q = await api.post("/delivery/quote", { cep: digits, number });
      setQuote(q.data);
      toast.success(q.data.mocked ? "Endereço encontrado, frete estimado" : "Endereço e frete calculados");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const placeOrder = async () => {
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!address || !number) return toast.error("Informe endereço e número");
    if (!quote) return toast.error("Calcule o frete pelo CEP");
    if (!phone || phone.replace(/\D/g, "").length < 10) return toast.error("Informe um telefone com DDD para contato");
    setSubmitting(true);
    try {
      const fullAddress = {
        label: "Entrega",
        cep: address.cep,
        street: address.street,
        number,
        complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      };
      // Persist phone to profile
      if (phone !== user?.phone) {
        try { await api.patch("/auth/profile", { phone }); } catch {}
      }
      // Save address to user (best-effort) if no primary exists
      if (!(user?.addresses || []).some((a) => a.primary)) {
        try { await api.post("/auth/addresses", fullAddress); await refreshMe(); } catch {}
      } else {
        try { await refreshMe(); } catch {}
      }
      const { data } = await api.post("/orders", {
        items: items.map((i) => ({ product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity })),
        address: fullAddress,
        payment_method: paymentMethod,
        change_for: paymentMethod === "cash" && changeFor ? Number(changeFor) : null,
        notes,
        delivery_fee: quote.fee,
        distance_km: quote.distance_km,
      });
      clear();
      setSuccessOrder(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Não foi possível concluir o pedido");
    } finally {
      setSubmitting(false);
    }
  };

  const total = subtotal + (quote?.fee || 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading text-3xl sm:text-4xl text-marrom">Finalizar pedido</h1>
      <p className="text-marrom/60 mt-1">Pré-preenchemos o que pudemos com seus dados.</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          {/* Address */}
          <section data-testid="checkout-address" className="bg-white border border-baunilha rounded-3xl p-5">
            <h2 className="font-heading text-xl text-marrom flex items-center gap-2">
              <MapPin size={18} /> Endereço de entrega
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                data-testid="cep-input"
                value={cep} onChange={(e)=>setCep(e.target.value)}
                placeholder="CEP" inputMode="numeric"
                className="flex-1 h-11 px-4 rounded-full border border-baunilha bg-cream focus:outline-none focus:ring-2 focus:ring-dourado/60"
              />
              <button
                data-testid="cep-lookup-button"
                onClick={lookupCep} disabled={loadingCep}
                className="h-11 px-5 rounded-full bg-marrom text-white font-semibold hover:bg-terracota inline-flex items-center gap-2"
              >
                <Search size={16} /> {loadingCep ? "..." : "Buscar"}
              </button>
            </div>
            {address && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={address.street} disabled className="h-11 px-4 rounded-2xl bg-cream border border-baunilha text-marrom/80" />
                <input value={`${address.neighborhood} · ${address.city}/${address.state}`} disabled className="h-11 px-4 rounded-2xl bg-cream border border-baunilha text-marrom/80" />
                <input
                  data-testid="number-input"
                  placeholder="Número"
                  value={number} onChange={(e)=>setNumber(e.target.value)}
                  className="h-11 px-4 rounded-2xl bg-white border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
                />
                <input
                  data-testid="complement-input"
                  placeholder="Complemento (opcional)"
                  value={complement} onChange={(e)=>setComplement(e.target.value)}
                  className="h-11 px-4 rounded-2xl bg-white border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
                />
              </div>
            )}
            {quote && (
              <div className="mt-3 text-sm text-marrom/70 flex items-center justify-between">
                <span>Distância estimada: {quote.distance_km} km {quote.mocked ? "(simulada)" : ""}</span>
                <span className="font-semibold text-marrom">Frete: {formatBRL(quote.fee)}</span>
              </div>
            )}
          </section>

          {/* Customer */}
          <section data-testid="checkout-customer" className="bg-white border border-baunilha rounded-3xl p-5">
            <h2 className="font-heading text-xl text-marrom">Dados do cliente</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input disabled value={user?.name || ""} className="h-11 px-4 rounded-2xl bg-cream border border-baunilha text-marrom/80" />
              <input disabled value={user?.email || ""} className="h-11 px-4 rounded-2xl bg-cream border border-baunilha text-marrom/80" />
              <input
                data-testid="checkout-phone-input"
                value={phone}
                onChange={(e)=>setPhone(e.target.value)}
                placeholder="Telefone com DDD (ex: 31999999999)"
                className="sm:col-span-2 h-11 px-4 rounded-2xl bg-white border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
              />
            </div>
            <textarea
              data-testid="notes-input"
              value={notes} onChange={(e)=>setNotes(e.target.value)}
              placeholder="Observações (ex: tirar molho, ponto da carne...)"
              className="mt-3 w-full px-4 py-3 rounded-2xl bg-white border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60 min-h-[80px]"
            />
          </section>

          {/* Payment */}
          <section data-testid="checkout-payment" className="bg-white border border-baunilha rounded-3xl p-5">
            <h2 className="font-heading text-xl text-marrom flex items-center gap-2">
              <Wallet size={18} /> Forma de pagamento
            </h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m.id];
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    data-testid={`payment-${m.id}`}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${active ? "border-terracota bg-baunilha/40" : "border-baunilha bg-white hover:bg-cream"}`}
                  >
                    <div className={`w-10 h-10 rounded-full grid place-items-center ${active ? "bg-terracota text-white" : "bg-baunilha text-marrom"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-marrom">{m.label}</div>
                      <div className="text-xs text-marrom/60">{m.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {paymentMethod === "cash" && (
              <input
                data-testid="change-for-input"
                value={changeFor} onChange={(e)=>setChangeFor(e.target.value)}
                placeholder="Troco para R$..."
                inputMode="decimal"
                className="mt-3 w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
              />
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-24 h-fit bg-white border border-baunilha rounded-3xl p-5">
          <h2 className="font-heading text-xl text-marrom">Resumo</h2>
          <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto text-sm">
            {items.length === 0 && <li className="text-marrom/60">Seu carrinho está vazio.</li>}
            {items.map((i) => (
              <li key={i.product_id} className="flex items-center justify-between">
                <span className="text-marrom/80">{i.quantity}x {i.name}</span>
                <span className="text-marrom font-semibold">{formatBRL(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="my-4 h-px bg-baunilha" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-marrom/70">Subtotal</span><span className="text-marrom font-semibold">{formatBRL(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-marrom/70">Frete</span><span className="text-marrom font-semibold">{quote ? formatBRL(quote.fee) : "—"}</span></div>
            <div className="flex justify-between text-lg mt-2"><span className="font-heading text-marrom">Total</span><span data-testid="checkout-total" className="font-bold text-terracota">{formatBRL(total)}</span></div>
          </div>
          <button
            data-testid="place-order-button"
            onClick={placeOrder}
            disabled={submitting || items.length === 0}
            className="mt-4 w-full h-12 rounded-full bg-terracota text-white font-semibold hover:bg-marrom transition-colors disabled:opacity-60"
          >
            {submitting ? "Enviando..." : "Concluir pedido"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="mt-2 w-full h-11 rounded-full border-2 border-marrom text-marrom font-semibold hover:bg-baunilha"
          >
            Continuar comprando
          </button>
        </aside>
      </div>

      <SuccessModal open={!!successOrder} onOpenChange={(o)=>!o && setSuccessOrder(null)} order={successOrder} />
    </div>
  );
}
