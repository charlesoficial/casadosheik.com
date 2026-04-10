# Operacao

## Painel admin

Fluxo atual do operador:

1. Entrar em `/login`
2. Ir para `/admin/pedidos`
3. Validar pedidos novos
4. Aceitar, acompanhar preparo e imprimir comandas
5. Fechar mesas ou pedidos diretos quando o fluxo operacional terminar
6. Consolidar o caixa em `/admin/caixa`
7. Consultar o historico em `/admin/historico`

## Cardapio e mesas

- Cliente de mesa acessa `/menu?mesa={numero}`
- Cliente de delivery acessa `/menu`
- Checkout redireciona para `/pedido/{id}/status`

## Areas principais

- `Gestor de Pedidos`
  - operacao do dia
  - som global
  - impressao de comanda
- `Cardapio`
  - categorias e produtos
- `Mesas & QR`
  - links e QR codes por mesa
- `Caixa`
  - resumo, sangria, suprimento e fechamento
- `Historico`
  - consulta de caixas fechados e detalhes
