import React from "react";
import { Power, Sun, CloudRain } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";

export default function AdminTopbar() {
  const { settings, patch } = useSettings();
  if (!settings) return null;

  const toggleStore = async () => {
    try {
      const next = !settings.store_open;
      await patch({ store_open: next });
      toast.success(next ? "Loja aberta" : "Loja fechada");
    } catch { toast.error("Erro ao alterar status"); }
  };

  const toggleWeather = async (w) => {
    if (settings.weather === w) return;
    try {
      await patch({ weather: w });
      toast.success(w === "rain" ? "Clima: chuva (frete atualizado)" : "Clima: sol");
    } catch { toast.error("Erro ao alterar clima"); }
  };

  return (
    <div data-testid="admin-topbar" className="flex items-center gap-2 flex-wrap mb-5">
      <button
        data-testid="store-toggle-button"
        onClick={toggleStore}
        className={`inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold transition-colors ${
          settings.store_open
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-red-600 text-white hover:bg-red-700"
        }`}
      >
        <Power size={16} />
        Loja {settings.store_open ? "aberta" : "fechada"}
      </button>

      <div className="ml-auto inline-flex items-center bg-white border border-baunilha rounded-full p-1">
        <button
          data-testid="weather-sun-button"
          onClick={() => toggleWeather("sun")}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm transition-colors ${
            settings.weather === "sun" ? "bg-dourado text-marrom font-semibold" : "text-marrom/60 hover:text-marrom"
          }`}
        >
          <Sun size={14}/> Sol
        </button>
        <button
          data-testid="weather-rain-button"
          onClick={() => toggleWeather("rain")}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm transition-colors ${
            settings.weather === "rain" ? "bg-marrom text-white font-semibold" : "text-marrom/60 hover:text-marrom"
          }`}
        >
          <CloudRain size={14}/> Chuva
        </button>
      </div>
    </div>
  );
}
