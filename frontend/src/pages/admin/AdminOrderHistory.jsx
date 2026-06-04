import React, { useEffect, useMemo, useState } from "react";
import { api, formatBRL } from "@/lib/api";
import { Eye } from "lucide-react";
import AdminTopbar from "@/components/app/AdminTopbar";
import OrderDetailsModal from "@/components/app/OrderDetailsModal";

const STATUS_LABEL = {
  received: "Recebido", preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega", delivered: "Entregue", cancelled: "Cancelado",
};

export default function AdminOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get("/orders").then((r) => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  const list = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const stats = useMemo(() => {
    const total = orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+o.total,0);
    const delivered = orders.filter(o=>o.status==="delivered").length;
    const cancelled = orders.filter(o=>o.status==="cancelled").length;
    return { total, delivered, cancelled, count: orders.length };
  }, [orders]);

  return (
    <div>
      <AdminTopbar />
      <h1 className="font-heading text-3xl text-marrom">Histórico de pedidos</h1>
      <p className="text-marrom/60 text-sm">Tudo que rolou na speteria.</p>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.count} />
        <Stat label="Entregues" value={stats.delivered} />
        <Stat label="Cancelados" value={stats.cancelled} />
        <Stat label="Faturamento" value={formatBRL(stats.total)} />
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2">
        {["all","received","preparing","out_for_delivery","delivered","cancelled"].map(k => (
          <button
            key={k}
            data-testid={`history-filter-${k}`}
            onClick={()=>setFilter(k)}
            className={`shrink-0 h-9 px-3 rounded-full text-sm whitespace-nowrap ${filter===k ? "bg-marrom text-white" : "bg-white border border-baunilha text-marrom"}`}
          >
            {k === "all" ? "Todos" : STATUS_LABEL[k]}
          </button>
        ))}
      </div>

      {loading ? <div className="mt-6 text-marrom/60">Carregando...</div> : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((o) => (
            <div key={o.id} data-testid={`history-card-${o.id}`} className="bg-white border border-baunilha rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-marrom/70">#{o.id.slice(0,8).toUpperCase()}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-baunilha text-marrom">{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="mt-1 font-semibold text-marrom">{o.user_name || o.user_email}</div>
              <div className="text-xs text-marrom/60">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
              <div className="mt-2 text-sm text-marrom/80">{o.items.length} itens · {o.distance_km} km</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-terracota font-bold text-lg">{formatBRL(o.total)}</span>
                <button
                  data-testid={`history-details-${o.id}`}
                  onClick={()=>setDetail(o)}
                  className="h-9 px-4 rounded-full bg-marrom text-white text-sm font-semibold hover:bg-terracota inline-flex items-center gap-1.5"
                >
                  <Eye size={14}/> Ver detalhes
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-full p-6 text-center text-marrom/50 bg-white border border-baunilha rounded-2xl">Nenhum pedido neste filtro.</div>
          )}
        </div>
      )}

      <OrderDetailsModal open={!!detail} onOpenChange={(o)=>!o && setDetail(null)} order={detail} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-baunilha rounded-2xl p-4">
      <div className="text-xs uppercase tracking-widest text-marrom/60">{label}</div>
      <div className="font-heading text-2xl text-marrom mt-1">{value}</div>
    </div>
  );
}
