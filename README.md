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

## Configuração local

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo de ambiente a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Preencha as variáveis no arquivo `.env`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

5. Gere uma build de produção:

```bash
npm run build
```

## Scripts

- `npm run dev`: inicia o servidor local do Vite.
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
