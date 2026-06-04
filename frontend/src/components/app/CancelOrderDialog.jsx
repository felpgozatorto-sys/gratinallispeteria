import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { XCircle } from "lucide-react";

const REASONS = [
  "Sem entregador disponível no momento",
  "Item indisponível no estoque",
  "Endereço fora da área de entrega",
  "Cliente solicitou o cancelamento",
  "Pagamento não confirmado",
  "Loja sobrecarregada (alto volume)",
  "Outro",
];

export default function CancelOrderDialog({ open, onOpenChange, order, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");

  const handleConfirm = () => {
    const final = reason === "Outro" ? (custom || "Outro motivo") : reason;
    if (!final) return;
    onConfirm(final);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(""); setCustom(""); } onOpenChange(o); }}>
      <DialogContent data-testid="cancel-order-dialog" className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-marrom flex items-center gap-2">
            <XCircle className="text-red-600" /> Cancelar pedido
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 text-sm text-marrom/70">
          Selecione o motivo do cancelamento{order ? ` do pedido #${order.id.slice(0,8).toUpperCase()}` : ""}.
          O cliente será notificado.
        </div>

        <ul className="mt-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {REASONS.map((r) => (
            <li key={r}>
              <button
                data-testid={`cancel-reason-${r.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => setReason(r)}
                className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                  reason === r
                    ? "border-terracota bg-baunilha/40 text-marrom font-semibold"
                    : "border-baunilha bg-white text-marrom hover:bg-baunilha/30"
                }`}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>

        {reason === "Outro" && (
          <input
            data-testid="cancel-reason-custom-input"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Descreva o motivo"
            className="mt-3 w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
          />
        )}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="h-11 px-5 rounded-full border border-marrom/40 text-marrom hover:bg-baunilha"
          >
            Voltar
          </button>
          <button
            data-testid="cancel-order-confirm"
            disabled={!reason || (reason === "Outro" && !custom.trim()) || loading}
            onClick={handleConfirm}
            className="h-11 px-5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
