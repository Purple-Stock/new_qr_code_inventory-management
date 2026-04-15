# Modal de confirmacao contextual para exclusao de transacoes

## Objetivo

Substituir o uso de `window.confirm()` na tela de transacoes por um modal visualmente consistente com a interface do produto e com contexto suficiente para reduzir exclusoes acidentais.

## Escopo

Esta mudanca afeta apenas o fluxo de confirmacao de exclusao na listagem de transacoes do time.

Permanece fora de escopo:
- mudar a regra de permissao de exclusao
- alterar o backend de exclusao
- recalcular ou exibir impacto de estoque no modal
- mudar o comportamento dos toasts

## Comportamento esperado

Ao clicar na lixeira de uma transacao elegivel:

1. A aplicacao abre um modal de confirmacao em vez de usar `confirm()`.
2. O modal mostra um resumo da transacao selecionada com:
   - tipo
   - item
   - quantidade
   - localizacao
   - data e hora
   - usuario
   - nota, quando existir
3. O usuario pode cancelar ou confirmar a exclusao.
4. Ao confirmar:
   - o botao de confirmacao entra em estado de loading
   - a acao server-side existente e reutilizada
   - em sucesso, o modal fecha, a tela e revalidada e o toast de sucesso continua igual
   - em erro, o modal permanece aberto e o toast de erro continua igual

## Design de interface

O modal deve:
- usar o sistema visual atual do app
- comunicar risco moderado, sem tom excessivamente alarmista
- priorizar leitura rapida do contexto da transacao
- manter CTA primaria clara: `Excluir transacao`

Estrutura:
- cabecalho com titulo de confirmacao
- subtitulo curto explicando que a acao remove o registro da movimentacao
- bloco de resumo com os campos da transacao
- nota em destaque discreto quando existir
- rodape com `Cancelar` e `Excluir transacao`

## Arquitetura

Implementacao prevista:
- `TransactionsList` passa a controlar o item selecionado para exclusao
- o clique na lixeira abre o modal com a transacao corrente
- a exclusao continua usando `deleteTransactionAction`
- o estado local controla:
  - transacao selecionada
  - modal aberto/fechado
  - loading de exclusao

## Tratamento de erros

- falha na exclusao nao fecha o modal automaticamente
- o toast destrutivo atual continua sendo exibido
- o usuario pode cancelar ou tentar novamente

## Testes

Cobertura minima:
- abrir modal ao clicar na lixeira
- renderizar contexto da transacao no modal
- fechar ao cancelar
- chamar exclusao ao confirmar
- bloquear dupla confirmacao durante loading
- manter compatibilidade com a regra atual de exibicao da lixeira

## Riscos e decisoes

- Nao sera exibido impacto previsto em estoque para evitar acoplamento adicional nesta iteracao.
- O modal deve reutilizar componentes existentes do projeto para manter consistencia e reduzir regressao visual.
