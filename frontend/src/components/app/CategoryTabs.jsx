import React from "react";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/data";

export default function CategoryTabs({ value, onChange }) {
  return (
    <div className="relative">
      <div
        data-testid="category-tabs"
        className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x"
      >
        {CATEGORIES.map((c) => {
          const active = value === c.id;
          return (
            <button
              key={c.id}
              data-testid={`category-tab-${c.id}`}
              onClick={() => onChange(c.id)}
              className={`snap-start shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-full border-2 font-medium transition-all text-sm whitespace-nowrap ${
                active
                  ? "bg-terracota border-terracota text-white shadow-md"
                  : "bg-white border-baunilha text-marrom hover:bg-baunilha/40"
              }`}
            >
              <span className="text-base">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-cream via-cream/70 to-transparent grid place-items-center sm:flex hidden">
        <ChevronRight size={16} className="text-marrom/40" />
      </div>
    </div>
  );
}
