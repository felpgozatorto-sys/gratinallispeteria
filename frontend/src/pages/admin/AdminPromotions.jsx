import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const empty = { title: "", subtitle: "", image_url: "", product_ids: [], discount_pct: 10, active: true };

export default function AdminPromotions() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [{ data: prs }, { data: ps }] = await Promise.all([
      api.get("/promotions"),
      api.get("/products"),
    ]);
    setItems(prs);
    setProducts(ps);
  };

  useEffect(() => { load().finally(()=>setLoading(false)); }, []);

  const save = async () => {
    try {
      const payload = { ...form, discount_pct: form.discount_pct === "" ? null : Number(form.discount_pct) };
      if (editing) {
        await api.patch(`/promotions/${editing.id}`, payload);
        toast.success("Promoção atualizada");
      } else {
        await api.post("/promotions", payload);
        toast.success("Promoção criada");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao salvar");
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Excluir ${p.title}?`)) return;
    await api.delete(`/promotions/${p.id}`);
    toast.success("Promoção removida");
    await load();
  };

  const toggleActive = async (p) => {
    await api.patch(`/promotions/${p.id}`, { active: !p.active });
    await load();
  };

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-marrom">Promoções</h1>
          <p className="text-marrom/60 text-sm">Crie, edite e ative campanhas que aparecem nos chips quadrados da home.</p>
        </div>
        <button
          data-testid="admin-new-promo-button"
          onClick={()=>{setEditing(null);setForm(empty);setOpen(true);}}
          className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center gap-2"
        >
          <Plus size={16}/> Nova promoção
        </button>
      </div>

      {loading ? <div className="mt-8 text-marrom/60">Carregando...</div> : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p)=>(
            <div key={p.id} data-testid={`admin-promo-card-${p.id}`} className="bg-white border border-baunilha rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-baunilha text-marrom/60"}`}>{p.active ? "Ativa" : "Inativa"}</span>
                <div className="flex gap-1">
                  <button onClick={()=>toggleActive(p)} className="p-1 hover:bg-baunilha rounded-full text-marrom">{p.active ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}</button>
                  <button onClick={()=>{setEditing(p);setForm({...empty, ...p});setOpen(true);}} className="p-1 hover:bg-baunilha rounded-full text-marrom"><Pencil size={14}/></button>
                  <button onClick={()=>remove(p)} className="p-1 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14}/></button>
                </div>
              </div>
              <h3 className="font-heading text-xl text-marrom mt-2">{p.title}</h3>
              <p className="text-sm text-marrom/70 mt-1 line-clamp-2">{p.subtitle}</p>
              <div className="mt-2 text-xs text-marrom/60">{p.product_ids?.length || 0} produtos vinculados · {p.discount_pct ? `${p.discount_pct}% OFF` : "Sem desconto direto"}</div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-marrom">{editing ? "Editar promoção" : "Nova promoção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input data-testid="promo-title-input" placeholder="Título" value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <input data-testid="promo-subtitle-input" placeholder="Subtítulo" value={form.subtitle} onChange={(e)=>setForm({...form, subtitle:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <input data-testid="promo-image-input" placeholder="URL da imagem (opcional)" value={form.image_url || ""} onChange={(e)=>setForm({...form, image_url:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <input data-testid="promo-discount-input" type="number" step="0.1" placeholder="% de desconto" value={form.discount_pct ?? ""} onChange={(e)=>setForm({...form, discount_pct:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha" />
            <label className="text-sm text-marrom/80 block">Produtos vinculados</label>
            <div className="max-h-40 overflow-y-auto border border-baunilha rounded-2xl p-2 space-y-1">
              {products.map((pr)=>(
                <label key={pr.id} className="flex items-center gap-2 text-sm text-marrom">
                  <input
                    type="checkbox"
                    checked={form.product_ids?.includes(pr.id)}
                    onChange={(e)=>{
                      const ids = new Set(form.product_ids || []);
                      if (e.target.checked) ids.add(pr.id); else ids.delete(pr.id);
                      setForm({...form, product_ids: Array.from(ids)});
                    }}
                  />
                  {pr.name}
                </label>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-marrom">
              <input type="checkbox" checked={!!form.active} onChange={(e)=>setForm({...form, active:e.target.checked})} /> Ativa
            </label>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={()=>setOpen(false)} className="h-11 px-5 rounded-full border border-marrom/40 text-marrom hover:bg-baunilha">Cancelar</button>
            <button data-testid="promo-save-button" onClick={save} className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom">Salvar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
