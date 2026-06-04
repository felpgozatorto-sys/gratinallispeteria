import React, { useEffect, useState } from "react";
import { api, formatBRL, formatApiError } from "@/lib/api";
import { CATEGORIES, PATENTES } from "@/lib/data";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminTopbar from "@/components/app/AdminTopbar";

const empty = {
  name: "", weight: "110g", price: 0, category: "bovinos", patente: "tradicional",
  image_url: "", active: true, promo_price: null, description: "",
};

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await api.get("/products");
    setItems(data);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p, promo_price: p.promo_price ?? "" }); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        promo_price: form.promo_price === "" || form.promo_price == null ? null : Number(form.promo_price),
      };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success("Produto atualizado");
      } else {
        await api.post("/products", payload);
        toast.success("Produto criado");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Erro ao salvar");
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.patch(`/products/${p.id}`, { active: !p.active });
      await load();
    } catch { toast.error("Erro"); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Excluir ${p.name}?`)) return;
    await api.delete(`/products/${p.id}`);
    toast.success("Produto removido");
    await load();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div>
      <AdminTopbar />
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-marrom">Produtos</h1>
          <p className="text-marrom/60 text-sm">{items.length} cadastrados · ative/desative, edite preços e crie promoções.</p>
        </div>
        <button
          data-testid="admin-new-product-button"
          onClick={openNew}
          className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom inline-flex items-center gap-2"
        >
          <Plus size={16} /> Novo produto
        </button>
      </div>

      <div className="relative mt-4">
        <div data-testid="admin-products-filter-scroll" className="flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1 snap-x">
          <button onClick={()=>setFilter("all")} className={`snap-start shrink-0 h-9 px-3 rounded-full text-sm whitespace-nowrap ${filter==="all" ? "bg-marrom text-white" : "bg-white border border-baunilha text-marrom"}`}>Todos</button>
          {CATEGORIES.filter(c=>c.id!=="all").map(c => (
            <button key={c.id} onClick={()=>setFilter(c.id)} className={`snap-start shrink-0 h-9 px-3 rounded-full text-sm whitespace-nowrap ${filter===c.id ? "bg-marrom text-white" : "bg-white border border-baunilha text-marrom"}`}>{c.emoji} {c.label}</button>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-cream via-cream/70 to-transparent grid place-items-center">
          <ChevronRight size={16} className="text-marrom/40" />
        </div>
      </div>

      {loading ? <div className="mt-8 text-marrom/60">Carregando...</div> : (
        <div className="mt-4 overflow-x-auto bg-white rounded-2xl border border-baunilha">
          <table className="w-full text-sm">
            <thead className="bg-cream text-marrom/70">
              <tr>
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-left p-3">Patente</th>
                <th className="text-right p-3">Preço</th>
                <th className="text-right p-3">Promo</th>
                <th className="text-center p-3">Ativo</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const pat = PATENTES[p.patente] ?? PATENTES.tradicional;
                return (
                  <tr key={p.id} data-testid={`admin-product-row-${p.id}`} className="border-t border-baunilha/60">
                    <td className="p-3 font-semibold text-marrom">{p.name}<div className="text-xs text-marrom/60 font-normal">{p.weight}</div></td>
                    <td className="p-3">{CATEGORIES.find(c=>c.id===p.category)?.label || p.category}</td>
                    <td className="p-3"><span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white" style={{ background: pat.color }}>{pat.label}</span></td>
                    <td className="p-3 text-right">{formatBRL(p.price)}</td>
                    <td className="p-3 text-right">{p.promo_price ? formatBRL(p.promo_price) : "—"}</td>
                    <td className="p-3 text-center">
                      <button data-testid={`toggle-active-${p.id}`} onClick={() => toggleActive(p)} className={p.active ? "text-emerald-700" : "text-marrom/40"}>
                        {p.active ? <ToggleRight size={26}/> : <ToggleLeft size={26}/>}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button data-testid={`edit-product-${p.id}`} onClick={() => openEdit(p)} className="p-2 hover:bg-baunilha rounded-full text-marrom"><Pencil size={14}/></button>
                      <button data-testid={`delete-product-${p.id}`} onClick={() => remove(p)} className="p-2 hover:bg-red-100 rounded-full text-red-600"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="product-form-dialog" className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-marrom">{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input data-testid="product-name-input" placeholder="Nome" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
            <div className="grid grid-cols-2 gap-3">
              <input data-testid="product-weight-input" placeholder="Gramatura" value={form.weight} onChange={(e)=>setForm({...form, weight:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
              <input data-testid="product-price-input" type="number" step="0.01" placeholder="Preço" value={form.price} onChange={(e)=>setForm({...form, price:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select data-testid="product-category-select" value={form.category} onChange={(e)=>setForm({...form, category:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha bg-white">
                {CATEGORIES.filter(c=>c.id!=="all").map(c=> <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
              <select data-testid="product-patente-select" value={form.patente} onChange={(e)=>setForm({...form, patente:e.target.value})} className="h-11 px-4 rounded-2xl border border-baunilha bg-white">
                {Object.entries(PATENTES).map(([k,p])=> <option key={k} value={k}>{p.label}</option>)}
              </select>
            </div>
            <input data-testid="product-image-input" placeholder="URL da imagem (opcional)" value={form.image_url || ""} onChange={(e)=>setForm({...form, image_url:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
            <input data-testid="product-promo-input" type="number" step="0.01" placeholder="Preço promocional (opcional)" value={form.promo_price ?? ""} onChange={(e)=>setForm({...form, promo_price:e.target.value})} className="w-full h-11 px-4 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
            <textarea data-testid="product-desc-input" placeholder="Descrição (opcional)" value={form.description || ""} onChange={(e)=>setForm({...form, description:e.target.value})} className="w-full px-4 py-3 rounded-2xl border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60" />
            <label className="inline-flex items-center gap-2 text-sm text-marrom">
              <input type="checkbox" checked={!!form.active} onChange={(e)=>setForm({...form, active:e.target.checked})} /> Ativo
            </label>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={()=>setOpen(false)} className="h-11 px-5 rounded-full border border-marrom/40 text-marrom hover:bg-baunilha">Cancelar</button>
            <button data-testid="product-save-button" onClick={save} className="h-11 px-5 rounded-full bg-terracota text-white font-semibold hover:bg-marrom">Salvar</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
