# Gratinalli Speteria — PRD

## Iterações Concluídas
- **Iter 1–3** (handoff): MVP, integrações, Google OAuth, mobile redesign — todos OK.
- **Iter 4 (handoff atual — 2026-01)**: clone do repo, instalação, restauração das envs, boot validado.
- **Iter 5 (esta sessão)**: 5 mudanças solicitadas pelo usuário.

## Iter 5 — Mudanças aplicadas
1. ✅ **CartModal com endereço + frete automático**: novo seletor de endereços (DropdownMenu) pré-preenchido com o endereço principal; frete recalculado via `/api/delivery/quote` ao abrir o sheet; cache local em `gratinalli_quote_cache_v1`; passa endereço selecionado ao Checkout via `gratinalli_selected_addr_id`. Subtotal + frete + total visíveis no rodapé do carrinho.
2. ✅ **Kanban reestruturado**: 3 colunas ativas no topo (Recebido / Em preparo / Saiu para entrega) + seção "Finalizados" recolhível/expansível abaixo com scroll horizontal (Entregue + Cancelado), até 15 cards, botão "Ver todos" abre modal com todos.
3. ✅ **Cancelar pedido c/ motivo**:
   - Backend: `OrderStatusPatch` agora aceita `cancel_reason: Optional[str] = None`; handler grava `cancel_reason` e `cancelled_at` quando `status=cancelled`.
   - Admin: botão "Cancelar pedido" no OrderDetailsModal → `CancelOrderDialog` com 7 motivos pré-definidos + opção "Outro" (campo livre). Atualiza estado e fecha modal.
   - Cliente: `MyOrders.jsx` polleia a cada 8s; ao detectar transição para `cancelled`, exibe popup `customer-cancel-notice` com o motivo. Notificação registrada em `gratinalli_cancel_notified_v1` para não repetir.
4. ✅ **Sparkles removidos**: imports e uso retirados de `PromoChips`, `PromotionDetail`, `AdminLayout` e `lib/data.js` (emoji de "Todos"). Source 100% limpo.
5. ⚠️ **Google OAuth rejeitado**: o domínio do preview precisa estar em **Authorized JavaScript origins** do OAuth Client no Google Cloud Console. Instruções entregues ao usuário (somente ele pode editar no Console).

## Testes
- Backend: **12/12 PASS** em `/app/backend/tests/test_iteration4_cancel_reason.py` contra `localhost:8001` (iteration_5.json).
- Frontend e2e: não rodado nesta iteração devido a issue de plataforma (ingress).

## ⚠️ Bloqueios resolvidos
1. ✅ **Domínio correto do preview**: `https://delivery-kanban.preview.emergentagent.com` (não o `gratinalli-spets.*` do handoff antigo). `frontend/.env` atualizado.
2. ✅ Backend conectado e retornando 38 produtos + 3 promoções.
3. ✅ Sparkles 100% fora do bundle (validado com `document.querySelectorAll('svg.lucide-sparkles').length === 0`).
4. ⚠️ **Google OAuth**: usuário precisa adicionar `https://delivery-kanban.preview.emergentagent.com` em "Authorized JavaScript origins" do OAuth Client `154505935171-...` no Google Cloud Console.

## Backlog
- P1 📲 Importar `picture`/`name` do Google direto no perfil.
- P1 💬 WhatsApp Business (Twilio) automático no Kanban.
- P2 🎁 Cupons, ⭐ avaliações, 📊 gráficos admin, 🔔 WebSocket Kanban.
- P2 Validar `cancel_reason` com `min_length=1, max_length=200`.
- P3 Validar transições de status no backend (não permitir reverter `delivered → received`).
