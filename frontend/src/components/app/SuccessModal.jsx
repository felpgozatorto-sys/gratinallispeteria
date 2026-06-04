import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { formatBRL } from "@/lib/api";

export default function SuccessModal({ open, onOpenChange, order }) {
  const navigate = useNavigate();
  if (!order) return null;

  const goTrack = () => {
    onOpenChange(false);
    navigate("/meus-pedidos");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="success-modal" className="sm:max-w-md bg-white p-0 overflow-hidden">
        <VisuallyHidden.Root>
          <DialogTitle>Pedido confirmado</DialogTitle>
        </VisuallyHidden.Root>
        <div className="bg-terracota text-white p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-white/15 grid place-items-center animate-pop-in">
            <CheckCircle2 size={42} />
          </div>
          <h2 className="font-heading text-3xl font-bold mt-3">Pedido confirmado!</h2>
          <p className="opacity-90 mt-1 text-sm">Já estamos preparando seu espetinho com carinho.</p>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-marrom/70">Número</span>
            <span className="font-semibold text-marrom" data-testid="success-order-id">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-marrom/70">Total</span>
            <span className="font-bold text-terracota text-lg">{formatBRL(order.total)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-marrom/70">Entrega estimada</span>
            <span className="font-semibold text-marrom">35–50 min</span>
          </div>
          <button
            data-testid="success-track-button"
            onClick={goTrack}
            className="w-full h-12 mt-2 rounded-full bg-marrom text-white font-semibold hover:bg-terracota"
          >
            Acompanhar pedido
          </button>
          <button
            data-testid="success-back-home"
            onClick={() => { onOpenChange(false); navigate("/"); }}
            className="w-full h-11 rounded-full border-2 border-marrom text-marrom font-semibold hover:bg-baunilha"
          >
            Voltar ao início
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
