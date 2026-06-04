import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

export default function AuthPromptModal() {
  const { user, showAuthPrompt, setShowAuthPrompt } = useAuth();
  if (user) return null;

  return (
    <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
      <DialogContent data-testid="auth-prompt-modal" className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-marrom">Bem-vindo à Gratinalli</DialogTitle>
          <DialogDescription className="text-marrom/70">
            Faça login para ver os preços e finalizar o pedido. Você também pode continuar navegando — os preços ficam ocultos até logar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
          <button
            data-testid="auth-prompt-continue"
            onClick={() => setShowAuthPrompt(false)}
            className="h-11 px-5 rounded-full border-2 border-marrom text-marrom font-semibold hover:bg-baunilha"
          >
            Continuar navegando
          </button>
          <Link
            to="/login"
            onClick={() => setShowAuthPrompt(false)}
            data-testid="auth-prompt-login"
            className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center justify-center"
          >
            Fazer login
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
