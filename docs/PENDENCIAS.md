# Pendências conhecidas

Lista viva do que ainda precisa ser resolvido. Quando um item for concluído, remova-o daqui ou
mova-o para o histórico do PR correspondente. O que já foi entregue está em [MVP_PLAN.md](MVP_PLAN.md) e, depois do
MVP, em [HISTORICO_ENTREGAS.md](HISTORICO_ENTREGAS.md).

## Conferir no navegador (nada disso foi visto em tela)

O assistente não consegue entrar no app; as telas abaixo passaram em `tsc`, testes e build, mas precisam de olho humano
com duas contas (coordenadora e pesquisador):

- [ ] **Bolsas de fomento (Meu perfil):** cartão próprio com botão "Salvar bolsas"; adicionar bolsa com projeto (membro e
  não membro, com "Pedir para entrar"), agência sem SUS, valor, início, fim, horas e nº do processo; recarregar e ver
  salvo; carga semanal somando só as bolsas vigentes.
- [ ] **Termo de outorga (PDF):** anexar, abrir, trocar e remover em bolsa já salva; só a dona e coordenadores abrem (testar com
  uma segunda conta de pesquisador, que não deve ver nem abrir); remover a bolsa apaga o arquivo. Depende da migration
  `20261003` (não aplicada em produção).
- [ ] **Notificações:** sino (pendências, "Novidades", "Marcar tudo como lido"), página `/notificacoes` (filtros e
  "Carregar mais"), cartão "Notificações" em Meu perfil (desligar um assunto e conferir que o aviso para).
- [ ] **Push com o app fechado:** ligar os avisos, fechar a aba e gerar um evento com outra conta; testar no Chrome
  (desktop e Android) e no iPhone/iPad com o app instalado na tela inicial.
- [ ] **Pesquisadores:** card enxuto, página `/pesquisadores/:id` (sem bio, sem bolsa, sem projeto, agenda no celular) e
  a seção "Projetos" do perfil.
- [ ] **Compras como pesquisador sem ser do projeto:** vê os pedidos dos outros, com o nome do projeto certo e sem
  botões de editar, cancelar ou aprovar; o filtro de projeto lista os projetos dos pedidos que ele enxerga.
- [ ] **Projetos:** aba "Todos os projetos", pedir para entrar, cancelar o pedido, aprovar e recusar como membro e como
  coordenador, e conferir os avisos.
- [ ] **Dashboard:** "Minhas tarefas" para pesquisador sem projeto (mensagem) e com projeto (criar tarefa).
- [ ] **Início (nova):** saudação, "Agora" (próxima reserva e presença), atalhos, "Precisa da sua decisão" (coordenador, mantenedor e membro de projeto), Novidades, Minhas reservas, Meus pedidos de compra e Meus projetos; estados vazios, celular e tema escuro. Os números do laboratório hoje saíram daqui e estão em **Analytics**.
- [ ] **Analytics:** abas "Meus números" (todos) e "Laboratório" (só coordenador), filtro de período (7/30/90 dias e 12 meses), gráficos no tema claro e escuro, celular, "Ver os dados em tabela" e estados sem dados. Conferir se as cores dos gráficos seguem o tema (usam `rgb(var(--c-...))`).
- [ ] **Tarefas:** prioridade no cartão e no filtro; **Feedback** com fotos; **Logo e favicon** em Configurações.

## Antes de abrir para os testadores

- [ ] **Limpar os dados de teste do Supabase hospedado.** Durante a revisão foram criados chamados, pedidos de
  compra e equipamentos em situação *Parado* ou *Em manutenção* só para teste (por exemplo chamados na
  Bambuzinha e na Baby Hip e pedidos como "Café" e "Sensor mioelétrico"). Revisar e apagar o que não for real;
  a limpeza no hospedado deve ser feita com cuidado, porque o app não tem botão de exclusão de chamados nem de
  pedidos.
- [ ] **Teste rápido com duas contas** (uma coordenadora e uma de pesquisador), cobrindo o que só foi verificado
  pelas regras do banco ou como coordenador:
  - Compras como pesquisador: pedir para um projeto e para o estoque geral; ver o selo e a seção "Seus pedidos de
    compra" na campainha depois que a coordenação aprovar e marcar como comprado.
  - Chamados como pesquisador: abrir um chamado urgente com foto; o equipamento deve ficar *Parado*; um
    responsável usa **Iniciar manutenção**, **Pedir peça** e acompanha *Aguardando peça*.
  - No Chrome: ligar "Receber avisos no computador" na campainha e pedir que alguém abra um chamado e um pedido
    de compra com a aba em segundo plano.
  - No celular: botão **Tirar foto** (câmera nativa), pinça para ampliar as fotos e a campainha.
  - Colar um valor (por exemplo `1.234,56`) nos campos de valor e abrir o .zip das fotos no Windows.
- [ ] **Roteiro dos testadores** (uma página para colar numa mensagem): pedir uma compra, abrir um chamado,
  reservar uma impressora, mandar um feedback. Os testadores devem usar a caixa **Feedback** para relatar erros.

## Segurança e operação

- **Aplicar a migration antes do merge.** Quando o front passa a consultar uma coluna ou função nova, o banco
  hospedado precisa recebê-la primeiro (`supabase db push --remote --yes`; conferir com
  `supabase migration list --remote`). Na revisão, rodar uma versão do front à frente do banco fez o app não
  achar o perfil e mostrar a tela "Crie sua conta", e outra vez devolveu um erro de permissão ao pedir compra.
- **Rotacionar credenciais usadas em testes.** Durante a configuração do ambiente de teste, um
  token de acesso do Supabase e uma chave SMTP do Brevo foram compartilhados fora dos cofres
  habituais. Revogue ambos (Supabase: *Account → Access Tokens*; Brevo: *SMTP & API → Chaves SMTP*),
  gere novos e atualize o `.env.admin.local`.
- **Login de teste público.** O coordenador de teste (`admin@lab.local`) usa a mesma senha do
  ambiente local, que está no README. Por isso o ambiente de teste na nuvem só pode conter dados
  fictícios. Antes de qualquer uso real, troque a senha ou crie um projeto separado.
- **Migrations manuais.** Aplicar migrations no Supabase hospedado é um passo manual. Automatizar isso no CI
  exigiria guardar um token de acesso como *Secret* do GitHub e é uma decisão em aberto.
- **Projeto gratuito do Supabase pausa por inatividade.** Se o site de teste parar de responder,
  reative o projeto no painel.

## Decisões em aberto

- **Avisar os outros membros do projeto nas compras.** Hoje só o coordenador (pedido novo) e quem fez o pedido
  (aprovado, recusado, comprado, entregue) recebem aviso. Falta decidir se todos os membros do projeto devem saber
  quando um item é comprado ou entregue.
- **Responsáveis pela manutenção verem as peças uns dos outros.** O chamado só mostra as peças que a pessoa pode
  ver; um pedido do estoque geral é visível só para quem pediu e para o coordenador. Se mais de um responsável
  acompanha o mesmo chamado, é preciso dar a eles leitura dos pedidos ligados a chamados (política de leitura no
  banco).
- **Passagens e Diárias como duas rubricas.** Foram criadas separadas. Se no edital elas vêm juntas ("Passagens e
  diárias"), unificar.
- **Chamado e equipamento.** *Iniciar manutenção* coloca o equipamento em manutenção em qualquer chamado, não só nos
  urgentes. Confirmar com quem faz manutenção se isso atende (um conserto pequeno também tira a máquina das reservas).

## Melhorias previstas

**Compras**

- Dar entrada no estoque do Inventário quando um pedido do estoque geral é entregue (abrir o cadastro do item já
  preenchido).
- Comparar o gasto previsto e pago com o valor concedido por rubrica de cada fomento (os dados já existem nos
  projetos), por exemplo "Capital: R$ 8.000 de R$ 20.000".
- Gasto de manutenção por mês e exportação do resumo.
- Usar o campo `MoneyInput` (máscara de centavos) também nos valores do fomento do projeto.

**Avisos**

- Aviso com o app fechado (push): ativo na produção (ver [DEPLOY.md](DEPLOY.md)). No iPhone/iPad só funciona com o app
  adicionado à tela inicial (Compartilhar → Adicionar à Tela de Início); o `manifest.webmanifest` e os ícones já
  existem, mas o ícone é provisório (as 4 cores da paleta) e não troca com o logo enviado em Configurações.
- E-mail como canal extra de aviso (hoje só painel e push).

- Histórico retroativo: as notificações só existem para eventos depois de `20260926`; reservas, chamados e compras
  anteriores não geram histórico (dá para preencher com uma migration, se fizer falta).
- `notifications.read_at` é gravado com o relógio do navegador e pode ficar alguns décimos de segundo antes de
  `created_at`; o ideal é o banco gravar o horário (gatilho `before update`).
- Notificação por assunto, não por evento: desligar "Chamados" também desliga o aviso de mudança de status dos chamados
  que a pessoa abriu.
- Reservas: o painel não mostra mais o "quem aprovou/recusou" nem o horário da reserva (só tipo, projeto e
  equipamento); reintroduzir se os testadores sentirem falta.

**Projetos**

- Não há "dono" do projeto nem como **sair** de um projeto; só coordenadores removem membros (aba Membros).
- Pedidos de entrada: não há lembrete se ninguém decidir e os pedidos antigos cancelados/recusados não têm tela de
  histórico.
- O resumo de projetos mostra o nome e o avatar de quem participa a todos os usuários ativos (decisão tomada).

**Segurança e privacidade (revisar)**

- Qualquer usuário ativo lê o **valor mensal e o nome do contrato** das bolsas (`profile_funding_grants`); a tela de
  perfil não mostra, mas o banco permite. Se for sensível, restringir por RLS ou por função.
- Pedidos de compra visíveis a todos incluem valores estimados e pagos (escolha feita em `20260929`).

**Outros**

- Salvar o idioma escolhido no perfil (`profiles.language`) em vez de só no navegador; usar o idioma também no e-mail
  de convite, que ainda usa a paleta e a fonte antigas.
- O teste 106 do pgTAP falha no banco local (8 períodos em vez de 7); investigar se é dado do ambiente local.
- Strings ainda fixas em português em `MeuPerfil.tsx` ("Presencial:", "Home office:", "Aula:", "presencial") e o rótulo
  "Outro" em `fundingAgencyOptions`; `Pesquisador.habilidades` (em `src/lib/pesquisadores.ts`) está sempre vazio e
  pode ser removido.
- Apagar as branches antigas já mescladas (`feat/compras*`, `feat/chamados-*`, `fix/*`...), se não forem mais úteis.
- Confirmar o resultado do job `database` da CI na `main` depois de cada migration (ele regenera
  `database.types.ts` e falha se houver diferença).

## Rodada 2 (depois do feedback dos testadores)

Planejada na revisão e deixada para depois, para que o uso real indique a prioridade:

1. **Notas por projeto.** Notas simples por projeto, em Markdown (`react-markdown` + `remark-gfm`), com busca e
   fixar no topo; salvamento ao sair do campo e aviso se alguém editou a nota enquanto isso (compara
   `updated_at`). Sem edição simultânea e sem links entre notas.
2. **Estoque único com dois modos.** Itens *por unidade* (rolo, frasco: como hoje) e *por quantidade* (cola,
   papelaria, velcro), com cadastro em um passo ("Adicionar ao estoque" com busca e criação do item na hora),
   estoque mínimo e alerta, entradas e baixas com motivo (`stock_movements`). Só materiais de impressão aparecem na
   compatibilidade de equipamento e na reserva.
3. **Habilidades.** Redesenho adiado: **conversar antes sobre o que mais incomoda**. Fraquezas levantadas: lista
   plana sem busca; habilidades não aparecem nos perfis nem em Pesquisadores (`src/lib/pesquisadores.ts` ainda
   devolve `habilidades: []`); pesquisador não pode propor habilidade; sem níveis nem categorias; modais próprios
   em vez do `Modal` comum; textos sem acento. Direção provável: etiquetas com categoria e nível, visíveis nos cards
   de Pesquisadores, filtro "quem sabe X?" e pedido de nova habilidade com aprovação.

## Limitações conhecidas

- **Teste 106 do pgTAP falha no banco local do desenvolvedor.** Ele cria um período de agenda e espera um estado
  limpo; o banco local tem períodos de uso (por exemplo 7), então a asserção falha. O CI usa banco limpo e não é
  afetado. Para ver os 343 verdes localmente seria preciso um banco de teste separado.
- **Pedidos anteriores à rubrica** aparecem como "Sem rubrica", e pedidos feitos antes do valor unitário guardam o
  total digitado (um deles foi corrigido à mão no hospedado). Ao editar um pedido antigo cujo total não divide
  certinho pela quantidade, o total pode mudar 1 centavo; o total novo aparece antes de salvar.
- **Gasto por equipamento** só existe para pedidos que vieram de um chamado; os marcados à mão como manutenção ficam
  em "Sem equipamento definido".
- **Fotos de chamado:** no máximo 3, reduzidas a 1600 px, em bucket privado (URLs assinadas de 1 hora). O .zip é
  gerado no navegador, sem compressão.
- **Chamado ativo só.** *Aguardando peça* só reage a chamados abertos ou em andamento; um chamado já resolvido ou
  cancelado não muda quando a peça é comprada.
- **`maintenance_blocks` legada.** A tabela de bloqueios de manutenção com data continua existindo e sendo
  respeitada pelas reservas, mas o app não cria mais bloqueios (a manutenção virou estado do equipamento). Pode ser
  removida numa limpeza futura, depois de conferir que não há bloqueios em uso.
- **Consulta a cada 60 s.** Os contadores e avisos usam Realtime; se o canal cair, a consulta periódica mantém tudo
  funcionando, com atraso.

## Qualidade e interface

- **Revisão visual das fontes novas.** Dosis (títulos) e Montserrat (textos) passaram a ser carregadas de verdade, e a
  escala base ficou em `15px`. Conferir, logado, tabelas, menu lateral, formulários e modais em pt/en/es, procurando
  textos cortados ou com quebra de linha inesperada; ajustar `font-size` do `html` em `src/index.css` se preciso.
- **Sem testes de navegador.** A suíte E2E com Playwright foi removida para simplificar o CI. A
  cobertura atual é: testes unitários (Vitest), testes de banco (pgTAP) e teste de concorrência de
  reservas. Na revisão, os fluxos de interface foram conferidos à mão no navegador a cada mudança. Se regressões de
  interface aparecerem com frequência, avaliar uma alternativa leve.
- **Telas estreitas.** O card do equipamento, o painel de chamados e as páginas novas foram conferidos em largura de
  celular, mas as demais telas não passaram por uma revisão sistemática.

## Funcionalidades previstas e ainda não feitas

- **Busca por habilidade.** Prevista na Fase 3 do MVP. Hoje a lista de Pesquisadores filtra só por
  vínculo e não mostra as habilidades de cada pessoa (faz parte do redesenho de Habilidades, na Rodada 2).

## Funcionalidades futuras (pós-MVP)

- Upload de arquivos `.gcode` e `.3mf`.
- Extração automática de metadados de `.gcode`.
- Sugestão automática de horários.
- Relatórios de uso.
- Endereço próprio para o site (domínio do laboratório no GitHub Pages).
