import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError, formatBRL } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, MapPin, Search, User as UserIcon, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FREIGHT_CACHE_KEY = "gratinalli_freight_cache_v1";

export function getCachedFreight(cepDigits) {
  try {
    const all = JSON.parse(localStorage.getItem(FREIGHT_CACHE_KEY) || "{}");
    const entry = all[cepDigits];
    if (!entry) return null;
    if (Date.now() - entry.t > 1000 * 60 * 60 * 24) return null; // 24h cache
    return entry.q;
  } catch { return null; }
}

export function setCachedFreight(cepDigits, quote) {
  try {
    const all = JSON.parse(localStorage.getItem(FREIGHT_CACHE_KEY) || "{}");
    all[cepDigits] = { t: Date.now(), q: quote };
    localStorage.setItem(FREIGHT_CACHE_KEY, JSON.stringify(all));
  } catch {}
}

export default function ProfileCompletionModal() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [quote, setQuote] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  // Open when authenticated user has incomplete profile and is not admin
  const isOpen =
    !!user && user !== false && user.role !== "admin" && user.profile_completed === false;

  useEffect(() => {
    if (isOpen) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [isOpen, user]);

  const onCep = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return toast.error("CEP inválido");
    setLoadingCep(true);
    try {
      const { data: addr } = await api.get(`/cep/${digits}`);
      setStreet(addr.logradouro || "");
      setNeighborhood(addr.bairro || "");
      setCity(addr.localidade || "");
      setState(addr.uf || "");
      setCep(addr.cep || cep);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "CEP não encontrado");
    } finally {
      setLoadingCep(false);
    }
  };

  const computeFreight = async (digits, num) => {
    try {
      const { data } = await api.post("/delivery/quote", { cep: digits, number: num });
      setQuote(data);
      setCachedFreight(digits, data);
    } catch {
      // soft fail
    }
  };

  const next1 = () => {
    if (!name.trim()) return toast.error("Informe seu nome completo");
    if (phone.replace(/\D/g, "").length < 10) return toast.error("Telefone com DDD (mínimo 10 dígitos)");
    setStep(2);
  };

  const finish = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8 || !street || !number) {
      return toast.error("Preencha CEP, rua e número");
    }
    setSaving(true);
    try {
      // Save profile
      await api.patch("/auth/profile", { name, phone });
      // Save address (becomes primary automatically if it's the first)
      await api.post("/auth/addresses", {
        label: "Casa",
        cep: digits,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });
      // Compute freight + cache
      await computeFreight(digits, number);
      await refreshMe();
      toast.success("Cadastro finalizado! Bom apetite 🔥");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao finalizar");
    } finally {
      setSaving(false);
    }
  };

  // Modal closes itself when user.profile_completed becomes true (refreshMe sets it)

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        data-testid="profile-completion-modal"
        className="max-w-lg bg-white"
        onPointerDownOutside={(e)=>e.preventDefault()}
        onEscapeKeyDown={(e)=>e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl text-marrom">Falta pouquinho!</DialogTitle>
          <DialogDescription className="text-marrom/70">
            Complete seu cadastro para fazer pedidos. Vamos calcular o frete da sua casa e deixar tudo pronto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-2 text-xs text-marrom/60">
          <span className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-terracota" : "bg-baunilha"}`}/>
          <span className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-terracota" : "bg-baunilha"}`}/>
        </div>

        {step === 1 && (
          <div className="space-y-3 mt-4">
            <Field label="Nome completo" icon={UserIcon}>
              <input
                data-testid="pc-name-input"
                value={name} onChange={(e)=>setName(e.target.value)}
                placeholder="Como podemos te chamar?"
                className="w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
              />
            </Field>
            <Field label="Telefone com DDD" icon={Phone}>
              <input
                data-testid="pc-phone-input"
                value={phone} onChange={(e)=>setPhone(e.target.value)}
                placeholder="31999999999"
                inputMode="numeric"
                className="w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
              />
            </Field>
            <div className="pt-2 flex justify-end">
              <button data-testid="pc-next-button" onClick={next1} className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom">
                Próximo
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 mt-4">
            <Field label="CEP" icon={MapPin}>
              <div className="flex gap-2">
                <input
                  data-testid="pc-cep-input"
                  value={cep} onChange={(e)=>setCep(e.target.value)}
                  placeholder="00000-000"
                  className="flex-1 h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60"
                />
                <button onClick={onCep} disabled={loadingCep} className="h-11 px-4 rounded-2xl bg-marrom text-white inline-flex items-center gap-2">
                  {loadingCep ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>}
                  Buscar
                </button>
              </div>
            </Field>
            <input data-testid="pc-street-input" value={street} onChange={(e)=>setStreet(e.target.value)} placeholder="Rua" className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <div className="grid grid-cols-2 gap-2">
              <input data-testid="pc-number-input" value={number} onChange={(e)=>setNumber(e.target.value)} placeholder="Número" className="h-11 px-4 rounded-2xl border border-baunilha" />
              <input data-testid="pc-complement-input" value={complement} onChange={(e)=>setComplement(e.target.value)} placeholder="Complemento" className="h-11 px-4 rounded-2xl border border-baunilha" />
            </div>
            <input value={neighborhood} onChange={(e)=>setNeighborhood(e.target.value)} placeholder="Bairro" className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <div className="grid grid-cols-3 gap-2">
              <input value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Cidade" className="col-span-2 h-11 px-4 rounded-2xl border border-baunilha" />
              <input value={state} onChange={(e)=>setState(e.target.value.toUpperCase())} placeholder="UF" maxLength={2} className="h-11 px-4 rounded-2xl border border-baunilha" />
            </div>

            {quote && (
              <div className="text-sm text-marrom/80 bg-baunilha/50 rounded-2xl p-3">
                Frete estimado para sua casa: <b>{formatBRL(quote.fee)}</b> · {quote.distance_km} km
              </div>
            )}

            <div className="pt-2 flex justify-between gap-2">
              <button onClick={()=>setStep(1)} className="h-11 px-5 rounded-full border border-marrom/40 text-marrom hover:bg-baunilha">Voltar</button>
              <button data-testid="pc-finish-button" onClick={finish} disabled={saving} className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin"/>}
                {saving ? "Salvando..." : "Finalizar cadastro"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-marrom/50 text-center inline-flex items-center justify-center gap-1">
          <CheckCircle2 size={12}/> Suas informações ficam salvas para próximos pedidos.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-marrom/70 font-semibold inline-flex items-center gap-1">
        {Icon && <Icon size={12}/>} {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
