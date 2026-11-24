# LO&P3D Lab Manager

Sistema interno para gestão da agenda de pesquisadores, disponibilidade no laboratório, habilidades técnicas e reservas de impressoras 3D do LO&P3D.

O projeto centraliza informações operacionais do laboratório para que pesquisadores e coordenadores possam visualizar quem estará presente, encontrar pessoas por habilidade, acompanhar equipamentos, organizar reservas sem conflito de horário, cuidar da manutenção e acompanhar as compras dos projetos.

**Ambiente de teste:** https://lop3d-unifesp.github.io/lab-manager/ (dados fictícios; veja
[docs/DEPLOY.md](docs/DEPLOY.md)).

## Funcionalidades

**Pessoas e acesso**

- Autenticação com Supabase Auth e papéis de coordenador e pesquisador.
- Convites por e-mail com papel predefinido, validade de 72 horas, página de aceite explícita,
  reenvio e revogação.
- Wizard de instalação para o primeiro coordenador (identidade do laboratório e contato de privacidade).
- Área **Usuários** com perfis ativos e convites, separada das configurações do laboratório.
- Perfil com vínculo acadêmico, Lattes, foto, contato e dados pessoais protegidos.
- Bolsas de fomento (agência, valor, horas) e carga horária semanal: **bolsista** soma as horas das
  bolsas; **voluntário** informa a carga manualmente.
- Aviso público de privacidade e descarte automático de identidades incompletas.

**Laboratório**

- Cadastro e consulta de pesquisadores e de habilidades técnicas.
- Agenda de disponibilidade por turno, com modo presencial, home office ou aula.
- Capacidade presencial, dias de funcionamento, turnos, intervalos de almoço e jantar e fuso horário
  configuráveis pelo coordenador (**Administração**).

**Projetos**

- Projetos com membros, fomentos (agência, processo, vigência e valor por rubrica) e quadro de tarefas.
- Em **Projetos**, quadro geral de tarefas; no Dashboard, **Minhas tarefas**.

**Equipamentos, inventário e reservas**

- Cadastro de equipamentos (impressoras, scanners, computadores…), tipos e compatibilidade de materiais.
- **Inventário (Estoque):** rolos, frascos e outros itens, com dono (um projeto ou o estoque geral).
- Reservas sem conflito de horário, com aprovação opcional pelo coordenador.
- Ciclo de vida da reserva: pendente → aprovada → em andamento → concluída ou falhou; também
  rejeitada (com motivo) ou cancelada.
- Telas **Minhas reservas** e **Histórico de reservas** (coordenador).

**Manutenção**

- Manutenção é um **estado do equipamento** (sem data de fim), com histórico de cada parada.
- **Chamados de manutenção:** qualquer pessoa reporta um problema (com urgência e até 3 fotos); responsáveis
  pela manutenção (marcados em Usuários) e o coordenador tratam a fila. Chamado urgente deixa o equipamento
  *Parado*; **Iniciar manutenção** o coloca em manutenção; há *Aguardando peça* e **Pedir peça** (pedido de compra
  ligado ao chamado).

**Compras**

- Pedidos de compra de um projeto ou do estoque geral, com rubrica, urgência, valor unitário e total.
- Fluxo solicitado → aprovado → comprado → entregue (ou recusado/cancelado), com desfazer pelo coordenador.
- Resumos de gasto por projeto e por equipamento (gastos de manutenção).

**Avisos e feedback**

- Selos no menu, campainha organizada e atualização em tempo real (reservas pendentes, chamados, feedback e
  compras para quem trata cada um); aviso do navegador no computador (com o app aberto).
- **Feedback:** caixa de sugestões e erros em todas as telas, tratada pelo coordenador.

## Stack

- React 18, Vite, TypeScript e React Router
- Tailwind CSS e lucide-react
- Supabase: PostgreSQL, Auth, Storage, Realtime e Edge Functions
- Vitest (testes unitários) e pgTAP (testes de banco)
- Docker + Supabase CLI para o ambiente local
- GitHub Actions e GitHub Pages para CI e deploy

## Requisitos

- Node.js 22 e npm
- Docker Desktop em execução
- Supabase CLI 3.2 ou superior (`scoop update supabase` no Windows)

## Configuração local com Docker

1. Instale as dependências:

```bash
npm install
```

2. Inicie e configure o Supabase Docker. Esse comando recria somente o banco local e cria o
   coordenador de desenvolvimento:

```bash
npm run setup:local
```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O acesso inicial é `admin@lab.local` / `LabManager123!`. O navegador será direcionado ao wizard de
instalação. Nos dias seguintes, use `npm run db:start`; os dados só são apagados quando
`npm run db:reset:local` é executado explicitamente.

Convites de desenvolvimento são entregues somente no Mailpit local em
`http://127.0.0.1:55324`; nenhum email real é enviado pelo Docker.

4. Gere uma build de produção:

```bash
npm run build
```

## Ambientes

| Ambiente | Frontend | Banco | E-mails de convite |
|---|---|---|---|
| Local | `npm run dev` (`localhost:5173`) | Supabase no Docker | Mailpit (`127.0.0.1:55324`) |
| Teste na nuvem | GitHub Pages | Supabase hospedado | Brevo (SMTP próprio) |
| Local contra a nuvem | `npm run dev:remote` | Supabase hospedado (o mesmo da equipe) | Brevo |

O guia completo da nuvem (variáveis, funções, Auth, SMTP e solução de problemas) está em
[docs/DEPLOY.md](docs/DEPLOY.md). Pendências conhecidas estão em
[docs/PENDENCIAS.md](docs/PENDENCIAS.md).

## Scripts

Ambiente local:

- `npm run setup:local`: inicia o Docker, recria o banco local e cria o primeiro coordenador.
- `npm run db:start` / `npm run db:stop`: liga ou desliga o Docker preservando dados.
- `npm run db:reset:local`: apaga e recria explicitamente somente o banco local.
- `npm run db:seed:demo`: adiciona impressora, material, habilidade, disponibilidade, reserva e manutenção fictícios após o wizard.
- `npm run dev`: inicia o frontend e recusa qualquer URL Supabase hospedada.
- `npm run db:types`: atualiza os tipos TypeScript a partir do banco local.

Qualidade:

- `npm test` / `npm run test:watch`: testes unitários do domínio.
- `npm run test:db`: executa os testes pgTAP no Supabase local.
- `npm run test:concurrency`: dispara duas reservas simultâneas contra o Supabase local.
- `npm run build`: executa a checagem TypeScript e gera a build de produção.
- `npm run preview`: serve localmente a build gerada.

Nuvem (exigem `.env.admin.local`, veja [docs/DEPLOY.md](docs/DEPLOY.md)):

- `npm run dev:remote`: inicia o frontend deliberadamente contra `.env.remote.local`.
- `npm run bootstrap:remote`: cria o primeiro coordenador no projeto hospedado.
- `npm run config:remote-auth`: configura Site URL, redirects, template de convite e SMTP no Auth hospedado.
- `npm run db:seed:demo:remote`: dados fictícios no projeto hospedado.

## Estrutura do repositório

```text
.
|-- .github/workflows/   CI e deploy no GitHub Pages
|-- docs/                documentação de produto, arquitetura e operação
|-- scripts/             automação local e da nuvem (Supabase, bootstrap, seed)
|-- src/
|   |-- components/      layout, perfil, reservas e componentes de interface
|   |-- lib/             clientes Supabase, repositórios e regras de domínio
|   `-- pages/           telas da aplicação
|-- supabase/
|   |-- functions/       Edge Functions (convites)
|   |-- migrations/      migrations SQL
|   |-- templates/       template do e-mail de convite
|   `-- tests/database/  testes pgTAP
|-- CONTRIBUTING.md
|-- index.html
|-- package.json
`-- vite.config.ts
```

## Documentação

- `CONTRIBUTING.md`: fluxo de branch, PR, CI e verificações locais.
- `docs/PRD.md`: visão de produto, objetivos, perfis de usuário e escopo.
- `docs/USER_FLOWS.md`: fluxos de uso.
- `docs/DESIGN_GUIDE.md`: diretrizes visuais e de experiência.
- `docs/TECH_STACK.md`: tecnologias e arquitetura.
- `docs/DATABASE_SCHEMA.md`: schema do banco, regras de integridade e RPCs.
- `docs/DATABASE_SECURITY.md`: RLS, permissões, privacidade e operação.
- `docs/MVP_PLAN.md`: fases do MVP e situação atual.
- `docs/LOCAL_DEVELOPMENT.md`: Docker, wizard, migrations e rotina local.
- `docs/DEPLOY.md`: ambiente de teste na nuvem (GitHub Pages + Supabase).
- `docs/PENDENCIAS.md`: o que falta fazer, decisões em aberto e limitações conhecidas.
- `docs/MVP_PLAN.md`: fases e o que já foi entregue (inclui a revisão antes dos testes).

## Telas

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Dashboard | todos |
| `/pesquisadores` | Pesquisadores | todos |
| `/habilidades` | Habilidades | todos |
| `/agenda` | Agenda do Laboratório | todos |
| `/projetos`, `/projetos/:id` | Projetos | todos (veem os seus; coordenador, todos) |
| `/equipamentos` | Equipamentos e Chamados (`?vista=chamados`) | todos (gestão: coordenador) |
| `/inventario` | Inventário | todos (gestão: coordenador) |
| `/compras` | Compras | todos |
| `/impressoras` | redireciona para Equipamentos | todos |
| `/reservas` | Reservas | todos |
| `/reservas/minhas` | Minhas reservas | todos |
| `/reservas/historico` | Histórico de reservas | coordenador |
| `/perfil` | Meu perfil | todos |
| `/usuarios`, `/usuarios/convites` | Usuários e convites | coordenador |
| `/feedback` | Feedback (sugestões e erros) | coordenador |
| `/administracao` | Configurações do laboratório | coordenador |
| `/instalacao` | Wizard de instalação | primeiro coordenador |
| `/convite/aceitar` | Aceite de convite | público (com link) |
| `/privacidade` | Aviso de privacidade | público |

## Licença

Este projeto está licenciado sob os termos descritos em `LICENSE`.
