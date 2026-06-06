import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

export default function StoreClosed() {
  const { settings } = useSettings();
  const horario = settings?.open_from && settings?.open_to ? `${settings.open_from} – ${settings.open_to}` : "—";

  return (
    <div className="min-h-screen grid place-items-center bg-cream p-6 text-center">
      <div className="max-w-md w-full bg-white border border-baunilha rounded-3xl p-8 shadow-sm">
        <img src="/logo/gratinalli-dark.png" alt="Gratinnari Speteria" className="h-16 w-auto mx-auto" />
        <h1 className="font-heading text-4xl text-marrom mt-4">Loja fechada</h1>
        <p className="text-marrom/70 mt-2">
          Estamos descansando o braço da grelha. Volte em breve para mais espetinhos.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 bg-baunilha text-marrom rounded-full px-4 py-2 text-sm">
          <Clock size={14} /> Horário de funcionamento: {horario}
        </div>
        <Link to="/login" className="block mt-6 text-terracota underline text-sm">Sou administrador</Link>
      </div>
    </div>
  );
}
