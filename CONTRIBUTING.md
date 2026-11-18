# Como contribuir

## Fluxo de trabalho

1. Atualize a `main` e crie uma branch curta para a mudança:

   ```bash
   git checkout main && git pull
   git checkout -b feat/nome-da-mudanca
   ```

   Prefixos usuais: `feat/`, `fix/`, `docs/`, `chore/`.

2. Faça commits pequenos, com mensagens no formato `tipo(escopo): resumo`
   (`feat`, `fix`, `docs`, `test`, `ci`, `chore`).
3. Rode as verificações locais (abaixo) antes de abrir o PR.
4. Abra um Pull Request para a `main`. O CI roda sozinho.
5. Com o CI verde, faça o merge. O push na `main` publica o site automaticamente no GitHub Pages.

Nunca commite segredos: arquivos `.env*` são ignorados pelo git e devem continuar assim (veja
[docs/DEPLOY.md](docs/DEPLOY.md)). A pasta `.claude/` (configuração local do Claude Code) também é
ignorada.

## Verificações locais

| Comando | O que valida |
|---|---|
| `npm test` | Testes unitários (Vitest) |
| `npm run build` | Checagem de tipos (TypeScript) e build de produção |
| `npm run test:db` | Testes de banco (pgTAP), regras de segurança e integridade |
| `npm run test:concurrency` | Duas reservas simultâneas: apenas uma deve ser aceita |
| `npm run db:types` | Regenera `src/lib/database.types.ts` a partir do banco local |

Os testes de banco e de concorrência precisam do Supabase local rodando (`npm run db:start`, com o
Docker Desktop aberto).

### Mudanças de banco

- Cada mudança de schema ganha uma **migration nova** em `supabase/migrations/` (nunca edite uma
  migration já mergeada na `main`).
- Rode `npm run setup:local` (recria o banco local) e `npm run test:db`.
- Rode `npm run db:types` e commite o `database.types.ts` atualizado: o CI falha se ele divergir do
  banco.
- A saída de `db:types` depende da versão do Supabase CLI. O projeto usa a **3.2.0**
  (`scoop update supabase` no Windows); o CI fixa a mesma versão.
- Em produção/nuvem as migrations são aplicadas manualmente com `supabase db push`.

## O que o CI executa

Definido em `.github/workflows/ci.yml`:

- **Em Pull Requests:** job `frontend` (auditoria de dependências, testes unitários e build).
- **Em push na `main`:** `frontend` e também o job `database` (Supabase local no Docker, testes
  pgTAP, teste de concorrência e verificação dos tipos gerados).

O job `database` é pesado e só roda depois do merge. Por isso rode `npm run test:db` localmente
quando mexer no banco.

O deploy do site é um workflow separado (`.github/workflows/deploy-pages.yml`).

## Convenções

- Interface e mensagens de erro em português do Brasil.
- Regras de negócio no banco (RPCs e RLS) sempre que afetarem integridade ou segurança; o frontend
  não deve ser a única barreira.
- Funções de domínio puras ficam em `src/lib/domain.ts`, com testes em `src/lib/domain.test.ts`.
- Documentação em `docs/`; pendências conhecidas em [docs/PENDENCIAS.md](docs/PENDENCIAS.md).
