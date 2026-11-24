# Histórico de entregas (PRs #47 a #62)

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

## Como está no ar

- Migrations `20260921` a `20261001` aplicadas no Supabase hospedado (produção).
- Edge Function `send-push` publicada, com os segredos VAPID e do webhook; a variável `VITE_VAPID_PUBLIC_KEY` está nas
  variáveis de Actions do repositório (passo a passo em [DEPLOY.md](DEPLOY.md)).
- Contas e papéis: o aviso de pedido de compra novo vai só para coordenadores; chamado novo, para coordenadores e
  mantenedores; mudanças de status, só para quem abriu ou pediu; ninguém é avisado da própria ação.

## Como cada PR foi verificado

`tsc`, testes (Vitest), build e pgTAP no banco local (`supabase test db`). O teste 106 do pgTAP ("new period appears in
active schedule", 8 em vez de 7) falha no banco local e já falhava antes dessas mudanças; parece vir dos dados do
ambiente local. As telas logadas **não** foram conferidas no navegador pelo assistente (o preview não tem login): ver a
lista em [PENDENCIAS.md](PENDENCIAS.md).
