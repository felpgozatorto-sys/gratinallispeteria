import React, { useEffect, useState, useMemo } from "react";
import { api, formatBRL } from "@/lib/api";
import { toast } from "sonner";
import { Clock, ChefHat, Bike, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import AdminTopbar from "@/components/app/AdminTopbar";
import OrderDetailsModal from "@/components/app/OrderDetailsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACTIVE_COLUMNS = [
  { id: "received", label: "Recebido", color: "#F2AA00", icon: Clock },
  { id: "preparing", label: "Em preparo", color: "#C34D1D", icon: ChefHat },
  { id: "out_for_delivery", label: "Saiu para entrega", color: "#893B0B", icon: Bike },
];

const STATUS_META = {
  received: { label: "Recebido", color: "#F2AA00", icon: Clock },
  preparing: { label: "Em preparo", color: "#C34D1D", icon: ChefHat },
  out_for_delivery: { label: "Saiu para entrega", color: "#893B0B", icon: Bike },
  delivered: { label: "Entregue", color: "#1F2937", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "#7f1d1d", icon: XCircle },
};

const NEXT_STATUS = {
  received: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const FINISHED_LIMIT = 15;

function OrderCard({ o, columnColor, onClick, onAdvance, showAdvance }) {
  return (
    <li
      data-testid={`kanban-card-${o.id}`}
      onClick={onClick}
      className="bg-cream rounded-xl p-3 border-l-4 cursor-pointer hover:shadow-md transition-all"
      style={{ borderLeftColor: columnColor }}
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
      {showAdvance && (
        <div className="mt-3">
          <button
            data-testid={`kanban-advance-${o.id}`}
            onClick={onAdvance}
            className="w-full h-9 rounded-full bg-terracota text-white text-xs font-semibold hover:bg-marrom"
          >
            Avançar
          </button>
        </div>
      )}
    </li>
  );
}

function FinishedCard({ o, onClick }) {
  const meta = STATUS_META[o.status] || STATUS_META.delivered;
  const Icon = meta.icon;
  return (
    <li
      data-testid={`finished-card-${o.id}`}
      onClick={onClick}
      className="bg-cream rounded-xl p-3 border-l-4 cursor-pointer hover:shadow-md transition-all min-w-[240px] w-[240px] shrink-0"
      style={{ borderLeftColor: meta.color }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-marrom/70">#{o.id.slice(0,6).toUpperCase()}</span>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
          style={{ background: meta.color }}
        >
          <Icon size={10} /> {meta.label}
        </span>
      </div>
      <div className="mt-1 font-semibold text-marrom text-sm truncate">{o.user_name || o.user_email}</div>
      <div className="text-xs text-marrom/60 truncate">{o.address.street}, {o.address.number}</div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-marrom/50">{new Date(o.created_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
        <span className="text-terracota font-bold">{formatBRL(o.total)}</span>
      </div>
    </li>
  );
}

export default function Kanban() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [finishedOpen, setFinishedOpen] = useState(true);
  const [allFinishedOpen, setAllFinishedOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/orders");
      setOrders(data);
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
      toast.success(`Pedido movido para ${STATUS_META[status]?.label}`);
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const activeGrouped = useMemo(() => ACTIVE_COLUMNS.map((c) => ({
    ...c,
    items: orders.filter((o) => o.status === c.id),
  })), [orders]);

  const finished = useMemo(() => {
    return orders
      .filter((o) => o.status === "delivered" || o.status === "cancelled")
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  }, [orders]);

  const finishedVisible = finished.slice(0, FINISHED_LIMIT);
  const hasMoreFinished = finished.length > FINISHED_LIMIT;

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
        <>
          {/* Active columns (top row) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeGrouped.map((col) => {
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  data-testid={`kanban-col-${col.id}`}
                  className="bg-white rounded-2xl border border-baunilha p-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: col.color }}><Icon size={14}/></span>
                      <h2 className="font-heading text-lg text-marrom">{col.label}</h2>
                    </div>
                    <span className="text-xs font-bold text-marrom/60 bg-baunilha rounded-full px-2 py-0.5">{col.items.length}</span>
                  </div>
                  <ul className="space-y-3 min-h-[50vh] max-h-[60vh] overflow-y-auto pr-1">
                    {col.items.map((o) => (
                      <OrderCard
                        key={o.id}
                        o={o}
                        columnColor={col.color}
                        showAdvance={true}
                        onClick={() => setDetail(o)}
                        onAdvance={(e) => move(e, o, NEXT_STATUS[col.id])}
                      />
                    ))}
                    {col.items.length === 0 && (
                      <li className="text-xs text-marrom/40 text-center py-6">Vazio</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Finished section (collapsible, horizontal scroll) */}
          <div className="mt-6 bg-white rounded-2xl border border-baunilha">
            <button
              data-testid="finished-toggle"
              onClick={() => setFinishedOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                {finishedOpen ? <ChevronDown size={18} className="text-marrom/60"/> : <ChevronRight size={18} className="text-marrom/60"/>}
                <span className="w-7 h-7 rounded-full grid place-items-center text-white" style={{ background: "#1F2937" }}>
                  <CheckCircle2 size={14}/>
                </span>
                <h2 className="font-heading text-lg text-marrom">Finalizados</h2>
                <span className="text-xs font-bold text-marrom/60 bg-baunilha rounded-full px-2 py-0.5">{finished.length}</span>
              </div>
              <span className="text-xs text-marrom/50 hidden sm:block">
                Entregues e Cancelados
              </span>
            </button>

            {finishedOpen && (
              <div className="border-t border-baunilha px-4 py-3">
                {finished.length === 0 ? (
                  <div className="text-xs text-marrom/40 text-center py-6">Nenhum pedido finalizado ainda</div>
                ) : (
                  <>
                    <ul
                      data-testid="finished-row"
                      className="flex gap-3 overflow-x-auto pb-2 snap-x"
                    >
                      {finishedVisible.map((o) => (
                        <FinishedCard key={o.id} o={o} onClick={() => setDetail(o)} />
                      ))}
                    </ul>
                    {hasMoreFinished && (
                      <div className="mt-3 flex justify-end">
                        <button
                          data-testid="finished-see-all"
                          onClick={() => setAllFinishedOpen(true)}
                          className="h-9 px-4 rounded-full bg-marrom text-white text-sm font-semibold hover:bg-terracota"
                        >
                          Ver todos ({finished.length})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <OrderDetailsModal
        open={!!detail}
        onOpenChange={(o)=>!o && setDetail(null)}
        order={detail}
        isAdmin={true}
        onUpdated={(updated)=>{
          setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          setDetail(updated);
        }}
      />

      <Dialog open={allFinishedOpen} onOpenChange={setAllFinishedOpen}>
        <DialogContent data-testid="finished-all-modal" className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-marrom flex items-center gap-2">
              <CheckCircle2 className="text-marrom/70"/> Pedidos finalizados ({finished.length})
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 max-h-[70vh] overflow-y-auto">
            <ul className="space-y-2">
              {finished.map((o) => {
                const meta = STATUS_META[o.status];
                const Icon = meta.icon;
                return (
                  <li
                    key={o.id}
                    data-testid={`finished-list-${o.id}`}
                    onClick={() => { setDetail(o); setAllFinishedOpen(false); }}
                    className="bg-cream border border-baunilha rounded-xl p-3 cursor-pointer hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-marrom/70">#{o.id.slice(0,6).toUpperCase()}</span>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{ background: meta.color }}
                        >
                          <Icon size={10} /> {meta.label}
                        </span>
                      </div>
                      <div className="text-terracota font-bold">{formatBRL(o.total)}</div>
                    </div>
                    <div className="mt-1 text-sm text-marrom truncate">{o.user_name || o.user_email}</div>
                    <div className="text-xs text-marrom/60 truncate">{o.address.street}, {o.address.number} · {new Date(o.created_at).toLocaleString("pt-BR")}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
