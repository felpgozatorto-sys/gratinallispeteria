import React, { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { CheckCircle2, Clock, Bike, ChefHat, XCircle } from "lucide-react";

const STATUS_FLOW = [
  { id: "received", label: "Recebido", icon: Clock },
  { id: "preparing", label: "Em preparo", icon: ChefHat },
  { id: "out_for_delivery", label: "Saiu para entrega", icon: Bike },
  { id: "delivered", label: "Entregue", icon: CheckCircle2 },
];

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/orders/mine");
        setOrders(data);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-heading text-3xl sm:text-4xl text-marrom">Meus pedidos</h1>
      <p className="text-marrom/60 mt-1">Acompanhe em tempo real o preparo e a entrega.</p>

      {loading ? (
        <div className="mt-8 text-marrom/60">Carregando...</div>
      ) : orders.length === 0 ? (
        <div className="mt-8 text-marrom/60">Você ainda não fez nenhum pedido.</div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => {
            const isCancelled = o.status === "cancelled";
            const currentIdx = STATUS_FLOW.findIndex((s) => s.id === o.status);
            return (
              <li key={o.id} data-testid={`order-row-${o.id}`} className="bg-white border border-baunilha rounded-3xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-marrom/60">Pedido</div>
                    <div className="font-heading text-xl text-marrom">#{o.id.slice(0,8).toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-marrom/60">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                    <div className="font-bold text-terracota text-lg">{formatBRL(o.total)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  {isCancelled ? (
                    <div className="inline-flex items-center gap-2 text-red-700 font-semibold"><XCircle size={16}/> Pedido cancelado</div>
                  ) : (
                    <ol className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                      {STATUS_FLOW.map((s, idx) => {
                        const reached = idx <= currentIdx;
                        const Icon = s.icon;
                        return (
                          <li key={s.id} className="flex items-center gap-3 shrink-0">
                            <div className={`w-9 h-9 rounded-full grid place-items-center ${reached ? "bg-terracota text-white" : "bg-baunilha text-marrom/50"}`}>
                              <Icon size={16} />
                            </div>
                            <span className={`text-sm ${reached ? "text-marrom font-semibold" : "text-marrom/40"}`}>{s.label}</span>
                            {idx < STATUS_FLOW.length - 1 && (
                              <span className={`w-8 h-px ${reached ? "bg-terracota" : "bg-baunilha"}`} />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>

                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm text-marrom/70 hover:text-marrom">Ver itens & endereço</summary>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <ul className="space-y-1">
                      {o.items.map((i, idx) => (
                        <li key={idx} className="text-marrom/80">{i.quantity}x {i.name} <span className="text-marrom/40">· {formatBRL(i.price)}</span></li>
                      ))}
                    </ul>
                    <div className="text-marrom/80">
                      <div className="font-semibold">Entrega em:</div>
                      <div>{o.address.street}, {o.address.number} {o.address.complement && `· ${o.address.complement}`}</div>
                      <div>{o.address.neighborhood} · {o.address.city}/{o.address.state}</div>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
