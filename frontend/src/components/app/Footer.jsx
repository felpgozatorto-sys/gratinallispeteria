import React from "react";
import { Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 bg-marrom text-baunilha">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <img src="/logo/gratinalli-light.png" alt="Gratinnari Speteria" className="h-14 w-auto" />
          <p className="mt-3 text-sm opacity-80 leading-relaxed">
            Espetinhos artesanais grelhados no ponto certo. Do tradicional ao premium, levamos sabor até você.
          </p>
        </div>
        <div>
          <h4 className="font-heading text-lg text-dourado">Atendimento</h4>
          <ul className="mt-3 space-y-1 text-sm opacity-90">
            <li>Seg a Dom · 17:00 – 23:30</li>
            <li>(11) 9.0000-0000</li>
            <li>contato@gratinalli.com</li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading text-lg text-dourado">Siga a brasa</h4>
          <div className="mt-3 flex gap-3">
            <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-baunilha/10 grid place-items-center hover:bg-dourado hover:text-marrom transition-colors">
              <Instagram size={18} />
            </a>
            <a href="#" aria-label="WhatsApp" className="w-10 h-10 rounded-full bg-baunilha/10 grid place-items-center hover:bg-dourado hover:text-marrom transition-colors">
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-baunilha/15 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} Gratinnari Speteria. Todos os direitos reservados.
      </div>
    </footer>
  );
}
