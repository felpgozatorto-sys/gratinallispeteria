export const CATEGORIES = [
  { id: "all", label: "Todos", emoji: "✨" },
  { id: "bovinos", label: "Bovinos", emoji: "🥩" },
  { id: "frango", label: "Frango", emoji: "🍗" },
  { id: "suinos", label: "Suínos", emoji: "🐖" },
  { id: "peixes", label: "Peixes & Frutos do Mar", emoji: "🐟" },
  { id: "queijos", label: "Queijos", emoji: "🧀" },
  { id: "vegetarianos", label: "Vegetarianos", emoji: "🥬" },
  { id: "especiais", label: "Especiais", emoji: "🍢" },
  { id: "doces", label: "Doces", emoji: "🍓" },
];

export const PATENTES = {
  tradicional: { label: "Tradicional", color: "#893B0B", description: "O sabor de sempre" },
  gourmet: { label: "Gourmet", color: "#C34D1D", description: "Sabores em alta" },
  premium: { label: "Premium", color: "#F2AA00", description: "Seleção especial" },
  especial: { label: "Especial", color: "#1F2937", description: "O topo do espeto" },
};

// Generic vazado placeholder per category (transparent-feel cartoon icon via placeholder service)
export const CATEGORY_IMAGE = {
  bovinos: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80",
  frango: "https://images.unsplash.com/photo-1604908554007-3a3a01dc2c00?w=400&q=80",
  suinos: "https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&q=80",
  peixes: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80",
  queijos: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80",
  vegetarianos: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80",
  especiais: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80",
  doces: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80",
};

export const BANNERS = [
  {
    id: "b1",
    title: "Sextou no Espeto",
    subtitle: "Picanha + Salmão com frete grátis acima de R$ 120",
    cta: "Ver promoção",
    color: "#C34D1D",
    image: "https://images.unsplash.com/photo-1558030006-450675393462?w=1200&q=80",
  },
  {
    id: "b2",
    title: "Combo Família 10 espetos",
    subtitle: "Variados tradicionais com 15% OFF",
    cta: "Quero o combo",
    color: "#893B0B",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
  },
  {
    id: "b3",
    title: "Doce do Espetinho",
    subtitle: "Romeu & Julieta na grelha, irresistível",
    cta: "Conferir doces",
    color: "#F2AA00",
    image: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1200&q=80",
  },
];

export const PAYMENT_METHODS = [
  { id: "pix", label: "Pix", hint: "Pagamento instantâneo" },
  { id: "credit_card", label: "Cartão de crédito (na entrega)", hint: "Visa, Master, Elo" },
  { id: "debit_card", label: "Cartão de débito (na entrega)", hint: "Maquininha" },
  { id: "cash", label: "Dinheiro", hint: "Informe se precisa de troco" },
];
