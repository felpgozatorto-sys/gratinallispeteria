import React, { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import { Save, MapPin, Phone, Clock, Sun, CloudRain } from "lucide-react";

export default function AdminSettings() {
  const { settings, patch } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) return <div className="text-marrom/60">Carregando...</div>;

  const upd = (k, v) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await patch({
        store_address: form.store_address,
        store_phone: form.store_phone,
        open_from: form.open_from,
        open_to: form.open_to,
        min_fee: Number(form.min_fee),
        min_fee_rain: Number(form.min_fee_rain),
        fee_per_km: Number(form.fee_per_km),
        fee_per_km_rain: Number(form.fee_per_km_rain),
      });
      toast.success("Configurações salvas");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl text-marrom">Configurações</h1>
      <p className="text-marrom/60 text-sm">Parâmetros da loja, frete e horário de funcionamento.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-baunilha rounded-2xl p-5">
          <h2 className="font-heading text-xl text-marrom flex items-center gap-2"><MapPin size={18}/> Loja</h2>
          <div className="mt-3 space-y-3">
            <Field label="Endereço/origem (usado no Distance Matrix)">
              <input
                data-testid="store-address-input"
                value={form.store_address || ""}
                onChange={(e)=>upd("store_address", e.target.value)}
                placeholder="Ex: 31130-600, Brasil"
                className="w-full h-11 px-4 rounded-2xl border border-baunilha"
              />
            </Field>
            <Field label="Telefone (com DDI/DDD, somente dígitos)">
              <input
                data-testid="store-phone-input"
                value={form.store_phone || ""}
                onChange={(e)=>upd("store_phone", e.target.value)}
                placeholder="5531999999999"
                className="w-full h-11 px-4 rounded-2xl border border-baunilha"
              />
            </Field>
          </div>
        </section>

        <section className="bg-white border border-baunilha rounded-2xl p-5">
          <h2 className="font-heading text-xl text-marrom flex items-center gap-2"><Clock size={18}/> Horário de funcionamento</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Abre às">
              <input data-testid="open-from-input" type="time" value={form.open_from || ""} onChange={(e)=>upd("open_from", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
            <Field label="Fecha às">
              <input data-testid="open-to-input" type="time" value={form.open_to || ""} onChange={(e)=>upd("open_to", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
          </div>
          <p className="text-xs text-marrom/60 mt-2">Use o botão "Loja aberta/fechada" no topo para abrir/fechar imediatamente.</p>
        </section>

        <section className="bg-white border border-baunilha rounded-2xl p-5">
          <h2 className="font-heading text-xl text-marrom flex items-center gap-2"><Sun size={18}/> Frete (clima ensolarado)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Frete mínimo (R$)">
              <input data-testid="min-fee-input" type="number" step="0.01" value={form.min_fee ?? 0} onChange={(e)=>upd("min_fee", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
            <Field label="Frete por km (R$)">
              <input data-testid="fee-per-km-input" type="number" step="0.01" value={form.fee_per_km ?? 0} onChange={(e)=>upd("fee_per_km", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
          </div>
        </section>

        <section className="bg-white border border-baunilha rounded-2xl p-5">
          <h2 className="font-heading text-xl text-marrom flex items-center gap-2"><CloudRain size={18}/> Frete (chuva)</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Frete mínimo chuva (R$)">
              <input data-testid="min-fee-rain-input" type="number" step="0.01" value={form.min_fee_rain ?? 0} onChange={(e)=>upd("min_fee_rain", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
            <Field label="Frete por km chuva (R$)">
              <input data-testid="fee-per-km-rain-input" type="number" step="0.01" value={form.fee_per_km_rain ?? 0} onChange={(e)=>upd("fee_per_km_rain", e.target.value)} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            </Field>
          </div>
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          data-testid="settings-save-button"
          onClick={save} disabled={saving}
          className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center gap-2"
        >
          <Save size={16}/> {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>

      <div className="mt-4 text-xs text-marrom/60 bg-baunilha/40 rounded-2xl p-3">
        Cálculo do frete: <b>frete = min_fee + (distância_km - 1) × fee_per_km</b>, respeitando o mínimo configurado.
        O valor de "clima" pode ser alterado no topo do painel a qualquer momento.
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-marrom/70 font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
