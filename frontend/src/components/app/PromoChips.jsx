import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function PromoChips({ promotions = [] }) {
  const navigate = useNavigate();
  if (!promotions.length) return null;

  // Colors cycle to give differentiation
  const palette = [
    { bg: "#FFE9B0", fg: "#893B0B", accent: "#C34D1D" },
    { bg: "#F2AA00", fg: "#893B0B", accent: "#893B0B" },
    { bg: "#893B0B", fg: "#FFE9B0", accent: "#F2AA00" },
    { bg: "#C34D1D", fg: "#FFE9B0", accent: "#F2AA00" },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
      {promotions.map((p, idx) => {
        const c = palette[idx % palette.length];
        return (
          <button
            key={p.id}
            data-testid={`promo-chip-${p.id}`}
            onClick={() => navigate(`/promocao/${p.id}`)}
            className="snap-start shrink-0 w-48 h-48 sm:w-56 sm:h-56 rounded-3xl p-5 text-left relative overflow-hidden group transition-transform hover:-translate-y-1"
            style={{ background: c.bg, color: c.fg }}
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-30" style={{ background: c.accent }} />
            <Sparkles className="opacity-80" size={20} />
            <div className="mt-6">
              <div className="text-xs uppercase tracking-widest opacity-80">Promoção</div>
              <div className="font-heading font-bold text-xl leading-tight mt-1 line-clamp-2">{p.title}</div>
              {p.subtitle && (
                <div className="text-[12px] mt-2 opacity-90 line-clamp-2">{p.subtitle}</div>
              )}
            </div>
            <div
              className="absolute bottom-4 right-4 text-[11px] font-bold uppercase rounded-full px-2.5 py-1"
              style={{ background: c.fg, color: c.bg }}
            >
              Ver
            </div>
          </button>
        );
      })}
    </div>
  );
}
