# MVP Plan - LO&P3D Lab Manager

Legenda: **Concluída** (implementada), **Parcial** (há itens pendentes, listados) e **Futura**.
Pendências detalhadas em [PENDENCIAS.md](PENDENCIAS.md).

## Fase 1 - Base do sistema — Concluída

- Projeto React + Vite + TypeScript, Tailwind CSS e Supabase configurados.
- Layout principal e páginas: Dashboard, Pesquisadores, Habilidades, Agenda do Laboratório,
  Impressoras, Reservas e Administração.

## Fase 2 - Usuários e perfis — Concluída

- Autenticação, tabela de perfis e papéis de coordenador e pesquisador.
- Edição do próprio perfil e cadastro de vínculo acadêmico.
- Além do planejado: foto de perfil, Lattes, bolsas de fomento, carga horária (bolsista ou
  voluntário) e dados pessoais isolados.

## Fase 3 - Habilidades e disponibilidade — Parcial

- Concluído: cadastro de habilidades; pesquisadores associam habilidades ao próprio perfil;
  disponibilidade semanal por turno (presencial, home office ou aula) com capacidade presencial;
  visualização de quem estará no laboratório na Agenda do Laboratório.
- **Pendente:** busca por habilidade. A lista de Pesquisadores filtra apenas por vínculo e não exibe
  as habilidades de cada pessoa (`src/lib/pesquisadores.ts` ainda devolve `habilidades: []`).

## Fase 4 - Impressoras — Concluída

- Cadastro de impressoras e de materiais, compatibilidade entre eles e tela de visualização.
- Manutenção por equipamento (hoje como estado com histórico; ver Fase 8).

## Fase 5 - Reservas — Concluída (e estendida)

- Reserva manual com projeto, material, data, horário inicial e duração; cálculo do horário final;
  prevenção de conflito (também sob concorrência); cancelamento da própria reserva; gestão pelo
  coordenador.
- Além do planejado: aprovação opcional, rejeição com motivo, ciclo de vida (em andamento,
  concluída, falhou), regra de início até 1 hora antes do horário, alerta em tempo real de reservas
  pendentes, telas Minhas reservas e Histórico de reservas.

## Fase 6 - Operação e entrega — Concluída

Itens que não estavam no plano inicial e foram necessários para operar o sistema:

- Wizard de instalação e configurações do laboratório (capacidade, dias, turnos, intervalos, fuso).
- Convites por e-mail (papel, 72 horas, aceite explícito, reenvio e revogação) e área Usuários.
- Aviso de privacidade e descarte automático de identidades incompletas.
- Ambiente local com Docker e ambiente de teste na nuvem (GitHub Pages + Supabase).
- CI (GitHub Actions) com testes unitários, de banco e de concorrência.

## Fase 8 - Revisão antes dos testes — Concluída

Rodada feita antes de abrir o sistema para os testadores (PRs 20 a 45). Antes dela, os PRs 13 a 19 já tinham
trazido Equipamentos, Inventário (Estoque), o quadro geral de tarefas e o menu agrupado por finalidade.
Cada PR atualizou os documentos do produto (PRD, fluxos, schema e guia de design).

### Limpeza e manutenção como estado do equipamento (PRs 20, 28, 32)

- Removidos "Registrar horário" (Agenda do Laboratório) e "Bloquear manutenção" (Reservas): o primeiro
  duplicava o Meu perfil; o segundo exigia data de fim, que ninguém sabe.
- Manutenção virou um **estado do equipamento**, sem data de fim, com **histórico** (início, fim, duração,
  motivo, quem iniciou e liberou) e, ao colocar em manutenção, aviso das reservas futuras com opção de cancelá-las.
- Situação **Parado** (chamado urgente aberto): o equipamento deixa de aceitar reservas até um responsável
  iniciar a manutenção; se o chamado é cancelado ou resolvido antes disso, volta a *Ativa* sozinho.
- Caixas de situação do card padronizadas (mesma estrutura em Parado e Em manutenção).

### Chamados de manutenção (PRs 22 a 27, 28, 30 a 32, 42, 43 e 45)

- Responsáveis pela manutenção marcados em **Usuários** (o coordenador já pode tratar chamados).
- **Reportar problema** (todos): descrição, urgência e até 3 fotos (câmera do celular, webcam do computador ou
  arquivo; reduzidas a 1600 px). Visualizador de fotos com zoom, arrasto e pinça; **Baixar fotos** (.zip).
- Aba **Chamados** em Equipamentos: filtros (tipo de equipamento lembrado, equipamento, situação, "só os meus"),
  **ordenação** (prioridade, mais recentes, mais antigos, equipamento, situação) e ações: **Iniciar manutenção**
  (coloca o equipamento em manutenção), **Aguardar peça** e **Retomar manutenção**, devolver à fila, resolver (com
  opção de liberar o equipamento junto), reabrir e cancelar.
- **Pedir peça** no chamado: abre o pedido de compra já preenchido e ligado ao chamado; o chamado mostra a situação
  da peça. Quando a peça é **comprada**, o chamado passa sozinho para **Aguardando peça**, e volta quando ela é entregue.
- Bloco **Chamados de manutenção** no Dashboard (Para atender / Que eu abri) e, no card do equipamento, quem abriu
  cada chamado.

### Avisos (PRs 22, 29, 33, 36 e 37)

- Selos no menu lateral e campainha organizada em **Pendências**, **Seus pedidos de compra** e **Reservas**.
- Atualização em tempo real (Supabase Realtime, com consulta a cada 60 s como plano B) e **aviso do navegador no
  computador**, que o usuário liga na campainha; funciona só com o app aberto numa aba.
- Quem recebe: coordenador e responsáveis (chamados), coordenador (feedback e pedidos de compra novos, com
  contagem de urgentes) e quem fez o pedido de compra (aprovado, recusado, comprado, entregue).

### Feedback (PR 21)

- Caixa de sugestões e erros em todas as telas (envia a página e o navegador junto) e página **Feedback** para o
  coordenador, com filtros, situação e nota interna.

### Compras (PRs 33 a 41, 44)

- Pedido de compra para um **projeto** ou para o **estoque geral do laboratório**, com **rubrica** (capital,
  custeio, passagens, diárias, reserva técnica ou outros), **urgência**, link (só http/https), quantidade e
  **valor unitário** (o total é calculado e mostrado na hora), com máscara de centavos nos campos de valor.
- Fluxo solicitado → aprovado → comprado (com valor pago) → entregue, recusa com motivo, cancelamento e
  **desfazer** cada etapa pelo coordenador. Quem pediu edita (inclusive trocando o projeto) enquanto ninguém decidiu.
- Visibilidade: quem pediu, membros do projeto e coordenador (estoque geral: só quem pediu e o coordenador).
- Página com **Resumo por projeto**, filtros (situação, projeto, rubrica, tipo de compra, "só os meus"), ordem por
  prioridade e etiqueta de urgência.
- **Gastos de manutenção:** marca à parte da rubrica; peças pedidas por um chamado entram sozinhas. O resumo mostra
  o previsto e o pago, no total e por equipamento.

### Banco e qualidade

- 16 migrations novas (`20260905` a `20260920`), todas aplicadas no Supabase hospedado. Detalhe em
  `DATABASE_SCHEMA.md` (seções 3.16 a 3.19).
- Testes: 162 unitários (Vitest) e 343 asserções de banco (pgTAP). No banco local do desenvolvedor o teste 106
  (período de agenda) falha por haver dados de uso; o CI usa banco limpo (ver PENDENCIAS.md).
- Cada mudança foi verificada no navegador com dados temporários, removidos depois.

## Fase 9 - Rodada 2 (depois do feedback dos testadores) — Planejada

Detalhada em [PENDENCIAS.md](PENDENCIAS.md): notas simples por projeto, estoque único com dois modos (por unidade e
por quantidade) e redesenho de Habilidades (a conversar antes).

## Fase 7 - Pós-MVP — Futura

- Upload de .gcode e .3mf.
- Extração automática de metadados de .gcode.
- Sugestão automática de horários.
- Relatórios de uso.
