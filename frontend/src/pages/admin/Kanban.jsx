import React, { useEffect, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { toast } from "sonner";
import { Clock, ChefHat, Bike, CheckCircle2, XCircle } from "lucide-react";
import AdminTopbar from "@/components/app/AdminTopbar";
import OrderDetailsModal from "@/components/app/OrderDetailsModal";

const COLUMNS = [
  { id: "received", label: "Recebido", color: "#F2AA00", icon: Clock },
  { id: "preparing", label: "Em preparo", color: "#C34D1D", icon: ChefHat },
  { id: "out_for_delivery", label: "Saiu para entrega", color: "#893B0B", icon: Bike },
  { id: "delivered", label: "Entregue", color: "#1F2937", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelado", color: "#7f1d1d", icon: XCircle },
];

const NEXT_STATUS = {
  received: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

export default function Kanban() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/orders");
      setOrders(data);
      // If a detail is open, refresh it
      setDetail((cur) => (cur ? data.find((o) => o.id === cur.id) || cur : cur));
    } catch {}
  };

  useEffect(() => {
    const init = async () => { await load(); setLoading(false); };
    init();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, []);

  const move = async (e, order, status) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/orders/${order.id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
      toast.success(`Pedido movido para ${COLUMNS.find(c=>c.id===status)?.label}`);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const cancel = async (e, order) => {
    e.stopPropagation();
    await move(e, order, "cancelled");
  };

  const grouped = COLUMNS.map((c) => ({
    ...c,
    items: orders.filter((o) => o.status === c.id),
  }));

  const todayTotal = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <AdminTopbar />
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-marrom">Kanban de pedidos</h1>
          <p className="text-marrom/60 text-sm">Clique no pedido para ver detalhes, imprimir notinha, WhatsApp e Maps. Atualiza a cada 6s.</p>
        </div>
        <div className="bg-white border border-baunilha rounded-2xl px-4 py-2 text-sm">
          <span className="text-marrom/60">Faturamento ativo:</span>{" "}
          <span className="font-bold text-terracota">{formatBRL(todayTotal)}</span>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 text-marrom/60">Carregando...</div>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {grouped.map((col) => {
            const Icon = col.icon;
            return (
              <div key={col.id} data-testid={`kanban-col-${col.id}`} className="min-w-[300px] w-[300px] shrink-0 bg-white rounded-2xl border border-baunilha p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: col.color }}><Icon size={14}/></span>
                    <h2 className="font-heading text-lg text-marrom">{col.label}</h2>
                  </div>
                  <span className="text-xs font-bold text-marrom/60 bg-baunilha rounded-full px-2 py-0.5">{col.items.length}</span>
                </div>
                <ul className="space-y-3 min-h-[60vh]">
                  {col.items.map((o) => (
                    <li
                      key={o.id}
                      data-testid={`kanban-card-${o.id}`}
                      onClick={()=>setDetail(o)}
                      className="bg-cream rounded-xl p-3 border-l-4 cursor-pointer hover:shadow-md transition-all"
                      style={{ borderLeftColor: col.color }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-marrom/70">#{o.id.slice(0,6).toUpperCase()}</span>
                        <span className="text-xs text-marrom/50">{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit"})}</span>
                      </div>
                      <div className="mt-1 font-semibold text-marrom text-sm">{o.user_name || o.user_email}</div>
                      <div className="mt-1 text-xs text-marrom/60">{o.items.length} itens · {o.distance_km} km</div>
                      <div className="mt-2 text-xs text-marrom/60 truncate">{o.address.street}, {o.address.number}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-terracota font-bold">{formatBRL(o.total)}</span>
                        <span className="text-[10px] uppercase tracking-widest text-marrom/60">{o.payment_method.replace("_"," ")}</span>
                      </div>
                      {col.id !== "delivered" && col.id !== "cancelled" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            data-testid={`kanban-advance-${o.id}`}
                            onClick={(e) => move(e, o, NEXT_STATUS[col.id])}
                            className="flex-1 h-9 rounded-full bg-terracota text-white text-xs font-semibold hover:bg-marrom"
                          >
                            Avançar
                          </button>
                          <button
                            data-testid={`kanban-cancel-${o.id}`}
                            onClick={(e) => cancel(e, o)}
                            className="h-9 px-3 rounded-full border border-marrom/40 text-marrom text-xs hover:bg-baunilha"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                  {col.items.length === 0 && <li className="text-xs text-marrom/40 text-center py-6">Vazio</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <OrderDetailsModal open={!!detail} onOpenChange={(o)=>!o && setDetail(null)} order={detail} />
    </div>
  );
}
