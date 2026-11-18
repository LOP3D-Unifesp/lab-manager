# Tech Stack - LO&P3D Lab Manager

## Frontend

- React 18 com Vite e TypeScript.
- React Router para as rotas (`src/routes.tsx`).
- Tailwind CSS para estilos e lucide-react para ícones.
- A agenda do laboratório é uma grade própria (Tailwind), sem biblioteca de calendário.
- Cliente `@supabase/supabase-js`; tipos do banco gerados em `src/lib/database.types.ts`.

## Backend (Supabase)

- **PostgreSQL** com RLS e funções RPC para as regras de negócio (reservas, disponibilidade,
  instalação, perfil). Veja [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) e
  [DATABASE_SECURITY.md](DATABASE_SECURITY.md).
- **Auth** com login por e-mail e senha; cadastro público desligado, acesso somente por convite.
- **Edge Functions** (`supabase/functions/`): `invite-user`, `manage-invitation` (reenviar e revogar)
  e `cleanup-invitations` (limpeza horária de convites expirados, agendada por Cron).
- **Realtime** na tabela de reservas, usado no alerta de reservas pendentes do coordenador.
- **Storage** para fotos de perfil (bucket `avatars`). O upload de arquivos `.gcode` e `.3mf` é
  futuro.

## Ambientes

- **Local:** Supabase CLI 3.2 ou superior com Docker (`npm run setup:local`) e Mailpit para ver os
  e-mails de convite. Veja [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).
- **Teste na nuvem:** frontend no GitHub Pages e projeto Supabase hospedado, com Brevo como SMTP.
  Veja [DEPLOY.md](DEPLOY.md).

## Testes

- **Vitest** para as regras de domínio e utilitários (`npm test`).
- **pgTAP** para segurança e integridade do banco (`npm run test:db`).
- **Teste de concorrência** de reservas simultâneas (`npm run test:concurrency`).
- Não há testes de navegador (a suíte E2E com Playwright foi removida; veja
  [PENDENCIAS.md](PENDENCIAS.md)).

## CI/CD

- **GitHub Actions** (`.github/workflows/`): `ci.yml` (frontend em PRs; banco também em push na
  `main`) e `deploy-pages.yml` (publicação no GitHub Pages a cada push na `main`).
- Fluxo de contribuição em [../CONTRIBUTING.md](../CONTRIBUTING.md).

## Controle de versão

- GitHub: `LOP3D-Unifesp/lab-manager`. Trabalho em branches curtas com Pull Request para a `main`.

## Estratégia de desenvolvimento

O projeto é desenvolvido em etapas pequenas, com commits separados por funcionalidade e mudanças de
banco sempre em migrations novas. O histórico de fases e a situação atual estão em
[MVP_PLAN.md](MVP_PLAN.md).

Evoluções futuras previstas: upload de `.gcode` e `.3mf`, extração de metadados do `.gcode`,
sugestão de horários e relatórios de uso.
