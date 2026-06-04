import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function MobileSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <form onSubmit={submit} className="md:hidden">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-marrom/50" size={18} />
        <input
          data-testid="mobile-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar espetinho..."
          className="w-full pl-11 pr-4 h-11 rounded-full bg-white border border-baunilha focus:outline-none focus:ring-2 focus:ring-dourado/60 placeholder:text-marrom/40"
        />
      </div>
    </form>
  );
}
