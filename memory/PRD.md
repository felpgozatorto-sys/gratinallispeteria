# Gratinalli Speteria — PRD

## Problema / Objetivo
Plataforma de delivery + admin para uma espetaria (Gratinalli Speteria), com catálogo de 38 espetinhos, checkout com cálculo real de frete via Google Distance Matrix, painel administrativo Kanban, e login com Google OAuth.

## Personas
- **Cliente**: navega catálogo, monta carrinho, finaliza pedido com endereço e frete calculado.
- **Admin**: gerencia produtos, promoções, configurações da loja (aberta/fechada, sol/chuva, tarifas de frete), acompanha pedidos via Kanban e histórico.

## Stack
- Backend: FastAPI + motor (MongoDB) + bcrypt + PyJWT + google-auth + httpx
- Frontend: React 19 + React Router 7 + Tailwind + Shadcn UI + @react-oauth/google + sonner
- Tipografia: Fraunces (headings) + Outfit (body)
- Paleta: #C34D1D, #F2AA00, #893B0B, #FFE9B0, fundo #FCFAF5

## Core Requirements (Static)
1. Catálogo de 38 espetinhos em 8 categorias e 4 patentes.
2. Carrinho persistido em localStorage (`gratinalli_cart_v1`).
3. Checkout com endereço (ViaCEP) e frete real (Google Distance Matrix).
4. Autenticação: JWT custom + Google OAuth real.
5. ProfileCompletionModal bloqueante (nome+telefone+endereço) para clientes.
6. Painel admin: Kanban, Produtos, Promoções, Histórico, Configurações.
7. Loja fechada bloqueia rotas cliente (`StoreClosed`), admin segue normal.

## Iterações Concluídas
- **Iter 1 (MVP)**: catálogo, carrinho, checkout, auth JWT, admin completo, seed. 22/22 testes backend.
- **Iter 2**: imagens reais, Google Distance Matrix, Settings dinâmicos, OrderDetailsModal (Imprimir/WhatsApp/Maps), AdminTopbar com toggles. 15/15 testes backend.
- **Iter 3**: Google OAuth real, JWT 30 dias, ProfileCompletionModal bloqueante, mobile redesign, logos oficiais. 8/8 testes backend.
- **Iter 4 (handoff atual — 2026-01)**: clone do repo público, instalação de deps, restauração das envs (JWT_SECRET, ADMIN_*, GOOGLE_*), validação de boot. Backend up, 38 produtos seed, frontend compilado e renderizando home corretamente.

## Backlog Priorizado
- P1 📲 Importar `picture` e `name` do Google direto no perfil (pular passo 1 do modal).
- P1 💬 Notificações WhatsApp Business (Twilio) automáticas no Kanban (precisa credenciais Twilio do usuário).
- P2 🎁 Cupons de desconto por categoria/patente.
- P2 ⭐ Avaliação pós-entrega (1–5 estrelas + comentário).
- P2 📊 Gráficos de venda no histórico admin (recharts já instalado).
- P3 🔔 WebSocket no Kanban (substituir polling de 6s).

## Endpoints (todos `/api`)
Auth, Catálogo, Pedido, Logística, Settings — todos descritos no handoff.

## Próxima Tarefa
Aguardando direcionamento do usuário para escolher próxima iteração do backlog.
