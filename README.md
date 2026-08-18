# LO&P3D Lab Manager

Sistema interno para gestão da agenda de pesquisadores, disponibilidade no laboratório, habilidades técnicas e reservas de impressoras 3D do LO&P3D.

O projeto centraliza informações operacionais do laboratório para que pesquisadores e coordenadores possam visualizar quem estará presente, encontrar pessoas por habilidade, acompanhar impressoras disponíveis e organizar reservas sem conflito de horário.

## Funcionalidades

- Autenticação de usuários com Supabase Auth.
- Perfis de usuário com papéis de coordenador e pesquisador.
- Cadastro e consulta de pesquisadores.
- Registro de habilidades técnicas.
- Agenda de disponibilidade dos pesquisadores no laboratório.
- Cadastro e acompanhamento de impressoras 3D.
- Reservas manuais de impressoras.
- Área de administração para coordenadores.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL

## Requisitos

- Node.js
- npm
- Projeto Supabase configurado

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

4. Gere uma build de produção:

```bash
npm run build
```

## Scripts

- `npm run setup:local`: inicia o Docker, recria o banco local e cria o primeiro coordenador.
- `npm run db:start` / `npm run db:stop`: liga ou desliga o Docker preservando dados.
- `npm run db:reset:local`: apaga e recria explicitamente somente o banco local.
- `npm run db:seed:demo`: adiciona dados fictícios opcionais após o wizard.
- `npm run dev`: inicia o frontend e recusa qualquer URL Supabase hospedada.
- `npm run dev:remote`: inicia deliberadamente contra `.env.remote.local`.
- `npm test`: executa os testes de unidade do dominio.
- `npm run test:db`: executa os testes pgTAP no Supabase local.
- `npm run test:concurrency`: dispara duas reservas simultâneas contra o Supabase local.
- `npm run db:types`: atualiza os tipos TypeScript a partir do banco local.

- `npm run build`: executa a checagem TypeScript e gera a build de produção.
- `npm run preview`: serve localmente a build gerada.

## Estrutura do repositório

```text
.
|-- docs/
|-- src/
|-- supabase/migrations/
|-- index.html
|-- package.json
|-- tailwind.config.ts
|-- tsconfig.json
`-- vite.config.ts
```

- `src/`: código da aplicação React.
- `src/pages/`: páginas principais, como dashboard, pesquisadores, habilidades, agenda, impressoras, reservas, perfil e administração.
- `src/components/`: componentes de layout e interface.
- `src/lib/`: clientes, repositórios e regras de domínio usadas pela aplicação.
- `docs/`: documentação de produto, arquitetura, stack, schema e fluxos.
- `supabase/migrations/`: migrations SQL do banco Supabase/PostgreSQL.

## Documentação

A documentação de apoio fica em `docs/`:

- `docs/PRD.md`: visão de produto, objetivos, perfis de usuário e escopo do MVP.
- `docs/TECH_STACK.md`: tecnologias e estratégia de desenvolvimento.
- `docs/DATABASE_SCHEMA.md`: schema conceitual do banco, regras de integridade e estratégia de RLS.
- `docs/DESIGN_GUIDE.md`: diretrizes visuais e de experiência.
- `docs/USER_FLOWS.md`: fluxos de uso esperados.
- `docs/MVP_PLAN.md`: fases de implementação do MVP.
- `docs/LOCAL_DEVELOPMENT.md`: Docker, wizard, migrations e promoção para o Supabase web.

## Módulos da aplicação

- Dashboard
- Pesquisadores
- Habilidades
- Agenda do laboratório
- Impressoras
- Reservas
- Meu perfil
- Administração

## Licença

Este projeto está licenciado sob os termos descritos em `LICENSE`.
