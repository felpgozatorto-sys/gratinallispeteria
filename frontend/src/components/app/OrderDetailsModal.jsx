import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatBRL } from "@/lib/api";
import { Printer, MessageCircle, Map, X, Clock, ChefHat, Bike, CheckCircle2, XCircle } from "lucide-react";
import CancelOrderDialog from "@/components/app/CancelOrderDialog";
import { toast } from "sonner";

const STATUS = {
  received: { label: "Recebido", icon: Clock, color: "#F2AA00" },
  preparing: { label: "Em preparo", icon: ChefHat, color: "#C34D1D" },
  out_for_delivery: { label: "Saiu para entrega", icon: Bike, color: "#893B0B" },
  delivered: { label: "Entregue", icon: CheckCircle2, color: "#1F2937" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "#7f1d1d" },
};

const PAYMENT_LABEL = {
  pix: "Pix",
  credit_card: "Cartão de crédito (entrega)",
  debit_card: "Cartão de débito (entrega)",
  cash: "Dinheiro",
};

export default function OrderDetailsModal({ open, onOpenChange, order, onPrint, isAdmin = false, onUpdated }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const st = order ? STATUS[order.status] || STATUS.received : null;

  const mapsUrl = useMemo(() => {
    if (!order) return "#";
    const a = order.address;
    const q = encodeURIComponent(`${a.street}, ${a.number}, ${a.neighborhood}, ${a.city}, ${a.state}, ${a.cep}, Brasil`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [order]);

  const waUrl = useMemo(() => {
    if (!order) return "#";
    const phone = (order.user_phone || "").replace(/\D/g, "");
    if (!phone) return null;
    const msg = encodeURIComponent(
      `Olá ${order.user_name?.split(" ")[0] || ""}! Sobre seu pedido #${order.id.slice(0,8).toUpperCase()} na Gratinalli Speteria — `
    );
    return `https://wa.me/55${phone}?text=${msg}`;
  }, [order]);

  if (!order) return null;

  const canCancel = isAdmin && order.status !== "delivered" && order.status !== "cancelled";

  const confirmCancel = async (reason) => {
    setCancelling(true);
    try {
      const { data } = await api.patch(`/orders/${order.id}/status`, {
        status: "cancelled",
        cancel_reason: reason,
      });
      toast.success("Pedido cancelado");
      setCancelOpen(false);
      if (onUpdated) onUpdated(data);
    } catch (e) {
      toast.error("Erro ao cancelar pedido");
    } finally {
      setCancelling(false);
    }
  };

  const print = () => {
    if (onPrint) return onPrint(order);
    // Default: open a printable window
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) return;
    const itemsHtml = order.items.map((i) => `
      <tr>
        <td>${i.quantity}x ${i.name}</td>
        <td style="text-align:right">${formatBRL(i.price * i.quantity)}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${order.id.slice(0,8)}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 16px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; text-align:center; }
        h2 { font-size: 14px; margin: 12px 0 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        td { padding: 2px 0; }
        hr { border: 0; border-top: 1px dashed #999; margin: 10px 0; }
        .small { font-size: 11px; color: #444; }
        .total { font-size: 14px; font-weight: bold; }
      </style>
      </head><body>
        <h1>GRATINALLI SPETERIA</h1>
        <div class="small" style="text-align:center">Pedido #${order.id.slice(0,8).toUpperCase()}</div>
        <div class="small" style="text-align:center">${new Date(order.created_at).toLocaleString("pt-BR")}</div>
        <hr/>
        <h2>Cliente</h2>
        <div class="small">${order.user_name || order.user_email}<br/>${order.user_phone || ""}</div>
        <h2>Entrega</h2>
        <div class="small">${order.address.street}, ${order.address.number} ${order.address.complement ? " · " + order.address.complement : ""}<br/>
        ${order.address.neighborhood} · ${order.address.city}/${order.address.state}<br/>CEP ${order.address.cep}</div>
        <hr/>
        <h2>Itens</h2>
        <table>${itemsHtml}</table>
        <hr/>
        <table>
          <tr><td>Subtotal</td><td style="text-align:right">${formatBRL(order.subtotal)}</td></tr>
          <tr><td>Frete (${order.distance_km} km)</td><td style="text-align:right">${formatBRL(order.delivery_fee)}</td></tr>
          <tr class="total"><td>TOTAL</td><td style="text-align:right">${formatBRL(order.total)}</td></tr>
        </table>
        <hr/>
        <div class="small">Pagamento: ${PAYMENT_LABEL[order.payment_method] || order.payment_method}${order.change_for ? ` · Troco para ${formatBRL(order.change_for)}` : ""}</div>
        ${order.notes ? `<div class="small" style="margin-top:6px">Obs: ${order.notes}</div>` : ""}
        <div class="small" style="margin-top:14px;text-align:center">Obrigado! 🔥</div>
        <script>window.onload = () => { window.print(); setTimeout(()=>window.close(), 300); };</script>
      </body></html>`);
    w.document.close();
  };

  const Icon = st.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="order-details-modal" className="max-w-2xl bg-white p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-baunilha flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="font-heading text-2xl text-marrom flex items-center gap-2">
              Pedido <span className="font-mono text-base text-marrom/60">#{order.id.slice(0,8).toUpperCase()}</span>
            </DialogTitle>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold" style={{ background: st.color }}>
                <Icon size={12}/> {st.label}
              </span>
              <span className="text-marrom/60">{new Date(order.created_at).toLocaleString("pt-BR")}</span>
            </div>
          </div>
          <button onClick={()=>onOpenChange(false)} className="text-marrom/60 hover:text-marrom" aria-label="Fechar"><X size={20}/></button>
        </DialogHeader>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <section>
            <h3 className="text-xs uppercase tracking-widest text-marrom/60 font-semibold">Cliente</h3>
            <div className="mt-1 text-marrom">{order.user_name || "—"}</div>
            <div className="text-sm text-marrom/70">{order.user_email}</div>
            <div className="text-sm text-marrom/70">{order.user_phone || "Sem telefone cadastrado"}</div>

            <h3 className="text-xs uppercase tracking-widest text-marrom/60 font-semibold mt-4">Entrega</h3>
            <div className="text-marrom text-sm mt-1">
              {order.address.street}, {order.address.number} {order.address.complement && `· ${order.address.complement}`}
            </div>
            <div className="text-sm text-marrom/70">{order.address.neighborhood} · {order.address.city}/{order.address.state}</div>
            <div className="text-sm text-marrom/70">CEP {order.address.cep} · {order.distance_km} km</div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-marrom/60 font-semibold">Itens</h3>
            <ul className="mt-1 space-y-1 max-h-44 overflow-y-auto pr-1">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-marrom">{i.quantity}x {i.name}</span>
                  <span className="text-marrom font-semibold">{formatBRL(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="my-3 h-px bg-baunilha" />
            <div className="text-sm space-y-1">
              <Row label="Subtotal" value={formatBRL(order.subtotal)} />
              <Row label={`Frete (${order.distance_km} km)`} value={formatBRL(order.delivery_fee)} />
              <Row label="Pagamento" value={PAYMENT_LABEL[order.payment_method] || order.payment_method} />
              {order.change_for ? <Row label="Troco para" value={formatBRL(order.change_for)} /> : null}
              {order.notes ? <div className="text-marrom/70 text-xs mt-1">Obs: {order.notes}</div> : null}
              <div className="flex justify-between text-lg mt-1"><span className="font-heading text-marrom">Total</span><span className="font-bold text-terracota">{formatBRL(order.total)}</span></div>
            </div>
          </section>
        </div>

        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <button
            data-testid="order-print-button"
            onClick={print}
            className="h-11 px-4 rounded-full bg-marrom text-white font-semibold inline-flex items-center gap-2 hover:bg-terracota"
          >
            <Printer size={16}/> Imprimir notinha
          </button>
          <a
            data-testid="order-whatsapp-button"
            href={waUrl || "#"}
            target="_blank" rel="noreferrer"
            onClick={(e)=>{ if (!waUrl) e.preventDefault(); }}
            aria-disabled={!waUrl}
            title={waUrl ? "Abrir WhatsApp" : "Cliente sem telefone cadastrado"}
            className={`h-11 px-4 rounded-full font-semibold inline-flex items-center gap-2 ${
              waUrl
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-emerald-200 text-emerald-900/60 cursor-not-allowed"
            }`}
          >
            <MessageCircle size={16}/> WhatsApp {!waUrl && "(sem telefone)"}
          </a>
          <a
            data-testid="order-maps-button"
            href={mapsUrl} target="_blank" rel="noreferrer"
            className="h-11 px-4 rounded-full bg-baunilha text-marrom font-semibold inline-flex items-center gap-2 hover:bg-dourado"
          >
            <Map size={16}/> Abrir no Maps
          </a>
          {canCancel && (
            <button
              data-testid="order-cancel-button"
              onClick={() => setCancelOpen(true)}
              className="h-11 px-4 rounded-full bg-red-600 text-white font-semibold inline-flex items-center gap-2 hover:bg-red-700 ml-auto"
            >
              <XCircle size={16}/> Cancelar pedido
            </button>
          )}
        </div>

        {order.status === "cancelled" && order.cancel_reason && (
          <div className="mx-5 mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-800">
            <div className="font-semibold flex items-center gap-1"><XCircle size={14}/> Pedido cancelado</div>
            <div className="mt-0.5 text-red-700/90">Motivo: {order.cancel_reason}</div>
          </div>
        )}
      </DialogContent>
      <CancelOrderDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        order={order}
        loading={cancelling}
        onConfirm={confirmCancel}
      />
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-marrom/80">
      <span>{label}</span>
      <span className="font-semibold text-marrom">{value}</span>
    </div>
  );
}
