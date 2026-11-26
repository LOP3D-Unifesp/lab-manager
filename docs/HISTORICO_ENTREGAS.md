# Histórico de entregas (PRs #47 a #98)

O que foi entregue depois do MVP, em ordem. O que ainda falta está em [PENDENCIAS.md](PENDENCIAS.md); o desenho do
banco, em [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (seções 3.20 e 3.21) e [DATABASE_SECURITY.md](DATABASE_SECURITY.md).

## Interface, idiomas e identidade

| PR | Entrega |
| --- | --- |
| #47 | Revisão de UI/UX com componentes reutilizáveis (`Input`, `Select`, `Field`, `Alert`, `EmptyState`, `Modal`...), acentuação e diagramação corrigidas, **idiomas pt-BR, inglês e espanhol** (`src/i18n`), **modo claro e escuro** (`src/lib/theme.tsx`) e **nomes do banco traduzidos** (tipos de equipamento, habilidades, catálogos: `name_en` e `name_es`). |
| #48 | **Identidade visual**: paleta `#0095d9`, `#00a651`, `#ec008c` e `#ffcb05`, fontes Dosis (títulos) e Montserrat (textos) e novo [DESIGN_GUIDE.md](DESIGN_GUIDE.md). |
| #49 | **Logo e favicon** do laboratório em Configurações (claro, escuro e ícone da aba, com prévia e botão salvar), menu lateral mais largo, barras de rolagem finas, seta dos menus afastada da borda, tela de login maior e idioma/tema no topo. |
| #50 | **Prioridade nas tarefas** (baixa, normal, urgente, editável no cartão), **filtro por prioridade em Compras** e **fotos no feedback** (até 3, visíveis ao autor e aos coordenadores). |
| #51 | Correção do job `database` da CI: `database.types.ts` alinhado ao que o gerador produz. |

## Notificações

| PR | Entrega |
| --- | --- |
| #52 | Sino mais claro: item reutilizável (`NotificationItem`), tempo relativo ("há 2 h"), "Ver mais". |
| #53 | **Notificações no banco** (`notifications`): histórico, "lido" sincronizado entre aparelhos, "Marcar tudo como lido" e a página `/notificacoes`. |
| #54 | **Aviso com o app fechado** (Web Push): service worker `public/sw.js`, assinaturas, Edge Function `send-push`. |
| #55 | **Preferências por assunto** (no sino e no computador) em Meu perfil; os avisos do navegador passam a sair das notificações. |
| #56 | `manifest.webmanifest` e ícones (provisórios) para instalar o app e receber push no iPhone/iPad. |

## Pessoas, compras e projetos

| PR | Entrega |
| --- | --- |
| #57 | **Perfil clicável em Pesquisadores**: card enxuto (foto, nome, vínculo, e-mail e presença) e página `/pesquisadores/:id` com contato, bio, habilidades, bolsas e carga e agenda semanal só leitura. |
| #58 | **Pedidos de compra visíveis para todos** os usuários ativos (só leitura); o nome do projeto vem de `get_purchase_project_names`. |
| #59 | Avisos de compra e de chamado só para quem deve receber (novos: coordenadores, e mantenedores nos chamados; mudança de status: quem abriu); abrir Compras não marca a novidade como lida; "Minhas tarefas" sempre visível no Dashboard. |
| #60 | **Pedidos de entrada em projetos**: aba "Todos os projetos", resumo para quem não participa, pedido com mensagem, decisão por coordenadores e membros, avisos e assunto "Projetos" nas preferências. |
| #61 | Seção "Projetos" no perfil do pesquisador. |
| #62 | Esta documentação. |

## Bolsas, perfis e projetos (PRs #63 a #75)

| PR | Entrega |
| --- | --- |
| #71 | **Termo de outorga**: um PDF por bolsa (só a dona e os coordenadores veem), com visualizador na própria página. |
| #72 a #75 | Bolsas de fomento reformuladas em Meu perfil, cards de Pesquisadores e de Projetos padronizados e responsivos, botão de copiar e-mail, selo de presença no mesmo lugar e máscara de valor (centavos) em bolsas e no fomento dos projetos. |

## Tarefas: reforma completa (PRs #76 a #91)

| PR | Entrega |
| --- | --- |
| #76 | Prioridade **Alta** (baixa, normal, alta, urgente), **lixeira com confirmação** (só quem criou e coordenadores), **arquivar** sem perder a tarefa, filtros em "Minhas tarefas" (Início) e **aviso ao receber uma tarefa**. Migration `20261004`. |
| #77 | **Checklist** (subtarefas), **reordenar cartões** (arrastar, botões ↑/↓ no toque) e quadros **atualizados ao vivo** (Realtime). Migration `20261005`. |
| #78 | Ordem valendo para a coluna inteira (projetos juntos), **trocar a tarefa de projeto** e correção de soltar acima do primeiro cartão. Migration `20261006`. |
| #79 | Descrição com **edição direta e formatação** (barra, atalhos `**negrito**`, `*itálico*`, `-` e `1.` para listas, código). |
| #80 | Correção do job `database` da CI (`database.types.ts` igual ao gerado). |
| #81, #82 | **Cronômetro** nas tarefas (trabalho, revisão e total), com segundos andando ao vivo. Migration `20261007`. |
| #83 | **Tempo por pessoa** (modal da tarefa) e relatório de tempo no Analytics (meu tempo; coordenador: por pessoa e por projeto). Migration `20261008`. |
| #84 | **Tempo até concluir** a tarefa (criação até Finalizado), no cartão, no modal e no Analytics. Migration `20261009`. |
| #85 | **Timers independentes por pessoa**: várias pessoas na mesma tarefa, ao mesmo tempo ou em horários diferentes. Migration `20261010`. |
| #86 | **Proteções contra timer esquecido**: aviso (sino e push), pausa automática por limite de horas e no fim do turno de cada pessoa, parada ao sair do projeto; limites ajustáveis em Administração. Migration `20261011`. |
| #87, #88 | Cartões de tarefa mais limpos (um só grupo de pessoas, ações ao passar o mouse, prioridade discreta) e "N trabalhando agora". |
| #89 | Quadro com as 4 colunas lado a lado (rolagem horizontal em tela estreita) e modal ajustado a telas pequenas. |
| #90 | **Deploy só depois do CI**: o site é publicado quando o CI da `main` (inclusive o job do banco) passa. |
| #91 | Trechos de tempo **só para consulta**: ninguém ajusta um trecho registrado (evita adulterar o tempo). Migration `20261012`. |
| #92 | Documentação da reforma de tarefas e a ideia do timer em modo Pomodoro. |

## Manutenção e avisos (PRs #93 a #98)

| PR | Entrega |
| --- | --- |
| #93 | **Chamados para quem cuida da manutenção**: todos os não encerrados na Início, atualizados ao vivo; mudança de situação avisa também os responsáveis; preferências com textos por perfil; botão **Abrir chamado** na aba Chamados e no atalho da Início; **equipamento na compra de manutenção**, com ou sem chamado; filtros da aba Chamados cabendo no celular. Migrations `20261013` e `20261014`. |
| #94 | **Sino conforme as preferências** (assunto desligado sai das pendências e da contagem); assunto próprio **Tarefas**, com pendências e aviso de mudança de situação a quem criou e aos responsáveis. Migration `20261015`. |
| #95 | Na Início, a lista de chamados é de quem está marcado na manutenção e vem antes das tarefas só quando há algo para atender (o coordenador sem a marcação vê a contagem e os seus); **tarefas urgentes** nas pendências, mesmo sem prazo; aviso de tipo desconhecido mostra um texto genérico. |
| #96 | **Sino só com os não lidos**; avisos que esperam ação saem quando o assunto se resolve (reserva, chamado, compra, pedido de entrada e tarefa); lidos guardados por 30 dias. Migration `20261016`. |
| #97 | **Publicação em merges seguidos**: o push novo cancela o CI anterior, e publicação pulada não cancela outra em andamento. |
| #98 | **Push e aviso no computador com detalhes** (assunto, contexto e trecho da descrição); o app pede o service worker novo a cada abertura. Migration `20261017`. |

## Como está no ar

- Migrations `20260921` a `20261017` aplicadas no Supabase hospedado (produção).
- Edge Function `send-push` publicada, com os segredos VAPID e do webhook; a variável `VITE_VAPID_PUBLIC_KEY` está nas
  variáveis de Actions do repositório (passo a passo em [DEPLOY.md](DEPLOY.md)).
- Contas e papéis: o aviso de pedido de compra novo vai só para coordenadores; chamado novo, para coordenadores e
  mantenedores; mudança de situação de chamado, para quem abriu e os mantenedores; de compra, para quem pediu; de
  tarefa, para quem criou e os responsáveis; ninguém é avisado da própria ação.

## Como cada PR foi verificado

**PRs #93 a #98 (26/11/2026):** Vitest, build, pgTAP no banco local (todos passando, 477 no #98) e, nas mudanças de
tela, conferência no navegador com contas de teste locais. O push com detalhes foi conferido no site publicado pela
equipe. O ajuste de publicação do #97 rodou no merge dele e no do #98; merges quase simultâneos ainda não se repetiram.

O teste do pgTAP que falhava em bancos locais com períodos de agenda a mais ("new period appears in active schedule")
foi corrigido: agora confere só o período criado por ele.

**PRs anteriores:**
`tsc`, testes (Vitest), build e pgTAP no banco local (`supabase test db`). O teste 106 do pgTAP ("new period appears in
active schedule", 8 em vez de 7) falha no banco local e já falhava antes dessas mudanças; parece vir dos dados do
ambiente local. As telas logadas **não** foram conferidas no navegador pelo assistente (o preview não tem login): ver a
lista em [PENDENCIAS.md](PENDENCIAS.md).
