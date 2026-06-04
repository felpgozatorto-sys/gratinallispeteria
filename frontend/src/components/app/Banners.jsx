import React, { useEffect, useState } from "react";
import { BANNERS } from "@/lib/data";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Banners() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % BANNERS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setIdx((i) => (i - 1 + BANNERS.length) % BANNERS.length);
  const next = () => setIdx((i) => (i + 1) % BANNERS.length);

  return (
    <div data-testid="banners" className="relative w-full overflow-hidden rounded-3xl">
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {BANNERS.map((b) => (
          <div
            key={b.id}
            className="w-full shrink-0 h-56 sm:h-72 lg:h-80 relative grid place-items-center"
            style={{ background: b.color }}
          >
            <img
              src={b.image}
              alt={b.title}
              className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-multiply"
              loading="lazy"
            />
            <div className="relative max-w-3xl px-6 text-center text-white">
              <div className="text-xs uppercase tracking-[0.3em] opacity-90">Hoje na Gratinalli</div>
              <h2 className="font-heading text-3xl sm:text-5xl font-bold mt-2 leading-tight drop-shadow-lg">
                {b.title}
              </h2>
              <p className="mt-3 text-base sm:text-lg opacity-95 drop-shadow">{b.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        aria-label="Anterior"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/80 hover:bg-white text-marrom"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        aria-label="Próximo"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-white/80 hover:bg-white text-marrom"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-7 bg-white" : "w-2 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
