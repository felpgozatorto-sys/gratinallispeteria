import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Star, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

const empty = { id: "", label: "Casa", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

export default function MyAddresses() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);

  const addresses = user?.addresses || [];

  const onCep = async () => {
    setLoadingCep(true);
    try {
      const digits = form.cep.replace(/\D/g, "");
      if (digits.length !== 8) return toast.error("CEP inválido");
      const { data } = await api.get(`/cep/${digits}`);
      setForm((f) => ({
        ...f,
        cep: data.cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a) => { setEditing(a); setForm({ ...empty, ...a }); setOpen(true); };

  const save = async () => {
    if (!form.cep || !form.street || !form.number) return toast.error("Preencha CEP, rua e número");
    try {
      if (editing) {
        await api.patch(`/auth/addresses/${editing.id}`, {
          label: form.label, cep: form.cep, street: form.street, number: form.number,
          complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state,
        });
        toast.success("Endereço atualizado");
      } else {
        await api.post("/auth/addresses", form);
        toast.success("Endereço adicionado");
      }
      await refreshMe();
      setOpen(false);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao salvar");
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Remover endereço ${a.label}?`)) return;
    await api.delete(`/auth/addresses/${a.id}`);
    await refreshMe();
    toast.success("Endereço removido");
  };

  const setPrimary = async (a) => {
    await api.post(`/auth/addresses/${a.id}/primary`);
    await refreshMe();
    toast.success(`"${a.label}" agora é o principal`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl text-marrom">Meus endereços</h1>
          <p className="text-marrom/60 mt-1">Gerencie locais de entrega, defina seu favorito como principal.</p>
        </div>
        <button
          data-testid="new-address-button"
          onClick={openNew}
          className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center gap-2"
        >
          <Plus size={16} /> Novo endereço
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-10 text-center text-marrom/60">
          <MapPin className="mx-auto mb-3 opacity-40" size={36} />
          Você ainda não cadastrou nenhum endereço.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              data-testid={`address-card-${a.id}`}
              className={`bg-white rounded-2xl border p-4 flex items-start justify-between gap-3 ${a.primary ? "border-terracota shadow-md" : "border-baunilha"}`}
            >
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-baunilha grid place-items-center text-marrom shrink-0"><MapPin size={18}/></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading text-lg text-marrom">{a.label}</span>
                    {a.primary && (
                      <span data-testid={`address-primary-badge-${a.id}`} className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-terracota text-white">Principal</span>
                    )}
                  </div>
                  <div className="text-sm text-marrom/70 mt-0.5 truncate">{a.street}, {a.number} {a.complement && `· ${a.complement}`}</div>
                  <div className="text-xs text-marrom/50">{a.neighborhood} · {a.city}/{a.state} · CEP {a.cep}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!a.primary && (
                  <button
                    data-testid={`address-favorite-${a.id}`}
                    onClick={() => setPrimary(a)}
                    title="Definir como principal"
                    className="p-2 rounded-full hover:bg-baunilha text-marrom"
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  data-testid={`address-edit-${a.id}`}
                  onClick={() => openEdit(a)}
                  className="p-2 rounded-full hover:bg-baunilha text-marrom"
                ><Pencil size={14}/></button>
                <button
                  data-testid={`address-delete-${a.id}`}
                  onClick={() => remove(a)}
                  className="p-2 rounded-full hover:bg-red-100 text-red-600"
                ><Trash2 size={14}/></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-marrom">
              {editing ? "Editar endereço" : "Novo endereço"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input data-testid="addr-label-input" placeholder="Rótulo (Casa, Trabalho...)" value={form.label} onChange={(e)=>setForm({...form, label:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <div className="flex gap-2">
              <input data-testid="addr-cep-input" placeholder="CEP" value={form.cep} onChange={(e)=>setForm({...form, cep:e.target.value})} className="flex-1 h-11 px-4 rounded-2xl border border-baunilha" />
              <button onClick={onCep} disabled={loadingCep} className="h-11 px-4 rounded-2xl bg-marrom text-white inline-flex items-center gap-2"><Search size={14}/>{loadingCep ? "..." : "Buscar"}</button>
            </div>
            <input data-testid="addr-street-input" placeholder="Rua" value={form.street} onChange={(e)=>setForm({...form, street:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <div className="grid grid-cols-2 gap-2">
              <input data-testid="addr-number-input" placeholder="Número" value={form.number} onChange={(e)=>setForm({...form, number:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha" />
              <input data-testid="addr-complement-input" placeholder="Complemento" value={form.complement} onChange={(e)=>setForm({...form, complement:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha" />
            </div>
            <input data-testid="addr-neighborhood-input" placeholder="Bairro" value={form.neighborhood} onChange={(e)=>setForm({...form, neighborhood:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <div className="grid grid-cols-3 gap-2">
              <input data-testid="addr-city-input" placeholder="Cidade" value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} className="col-span-2 h-11 px-4 rounded-2xl border border-baunilha" />
              <input data-testid="addr-state-input" placeholder="UF" maxLength={2} value={form.state} onChange={(e)=>setForm({...form, state:e.target.value.toUpperCase()})} className="h-11 px-4 rounded-2xl border border-baunilha" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={()=>setOpen(false)} className="h-11 px-5 rounded-full border border-marrom/40 text-marrom hover:bg-baunilha">Cancelar</button>
            <button data-testid="addr-save-button" onClick={save} className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom">Salvar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
