# Desenvolvimento local e instalação

O ambiente de desenvolvimento usa o Supabase CLI e Docker. O frontend iniciado por `npm run dev`
recusa URLs hospedadas, evitando alterações acidentais no projeto web.

## Primeira instalação local

Requisitos: Node.js, npm, Docker Desktop em execução e Supabase CLI disponível pelo `npx`.

```bash
npm install
npm run setup:local
npm run dev
```

O primeiro comando de setup recria o banco local, aplica a baseline e cria exclusivamente no Docker:

- email: `admin@lab.local`
- senha: `LabManager123!`

Depois do login, o coordenador deve concluir o wizard somente com a identidade do laboratório e
um email institucional de contato para privacidade. Materiais, impressoras e compatibilidades são
cadastrados depois, nas telas próprias da aplicação. Convites ficam bloqueados enquanto esse
contato não estiver preenchido.

Mensagens de convite locais não saem para a internet. Consulte-as em
`http://127.0.0.1:55324` (Mailpit). O link abre `/convite/aceitar`, mas apenas o botão
**Aceitar convite** confirma o token. Isso permite abrir ou pré-visualizar a mensagem sem criar
sessão ou consumir o link.

## Rotina diária

```bash
npm run db:start
npm run dev
```

`db:start` e `db:stop` preservam os dados. Somente o comando abaixo apaga o banco local:

```bash
npm run db:reset:local
```

Após concluir o wizard, dados fictícios podem ser adicionados de forma idempotente:

```bash
npm run db:seed:demo
```

## Ambiente remoto

Não existe sincronização automática de dados entre Docker e Supabase web. Migrations sincronizam o
schema; dados locais continuam locais.

Para abrir deliberadamente o frontend contra um projeto hospedado, crie `.env.remote.local`:

```env
VITE_APP_ENV=remote
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Depois execute `npm run dev:remote`. Chaves `service_role` nunca usam prefixo `VITE_`.

## Primeiro coordenador remoto

Em um projeto novo, aplique a baseline e publique a Edge Function antes do bootstrap. Mantenha
`auth.enable_signup=false`, mas deixe o provedor de email habilitado para permitir login e convites.

O comando remoto exige confirmação do hostname e recebe segredos apenas pelo ambiente do processo:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_NAME
BOOTSTRAP_ADMIN_PASSWORD
CONFIRM_REMOTE_HOST
```

Com essas variáveis definidas, execute `npm run bootstrap:remote`. O comando recusa localhost,
hostname divergente, instalação concluída ou banco que já possua perfis. Ele também registra no
Vault os segredos usados pelo Cron de limpeza e agenda `cleanup-expired-invitations` a cada hora.

## Promoção manual dos convites para o Supabase hospedado

O projeto hospedado permanece intocado até esta sequência ser executada deliberadamente:

1. aplicar a baseline em staging e publicar `invite-user`, `manage-invitation` e
   `cleanup-invitations`;
2. manter `verify_jwt=true` nas duas funções administrativas e `verify_jwt=false` apenas na limpeza,
   que valida manualmente o bearer secreto;
3. configurar `PUBLIC_SITE_URL` nas funções com a origem HTTPS da aplicação;
4. no painel Auth, manter cadastro público desabilitado e configurar `Site URL`/redirects;
5. promover `supabase/templates/invite.html` como template de convite. O link deve continuar usando
   `{{ .TokenHash }}` e apontar primeiro para `/convite/aceitar`, nunca diretamente para
   `{{ .ConfirmationURL }}`;
6. executar `npm run bootstrap:remote` uma única vez e verificar o job horário em Cron;
7. testar todo o fluxo em staging antes de repetir em produção.

Não copie usuários, convites nem outros dados do Docker para o projeto hospedado.

## Migrations, seeds e promoção

- `supabase/migrations/20260818000000_initial_mvp_baseline.sql` é a baseline imutável do MVP.
- Depois que ela entrar na `main`, cada mudança de schema ganha uma migration incremental nova.
- `supabase/seed.sql` não contém dados pessoais nem dados de demonstração.
- Antes de promover: faça backup, valide em staging vazio, execute reset/testes locais e revise o diff.
- Aplique migrations hospedadas deliberadamente com o Supabase CLI somente após vincular e conferir o
  `project-ref`. Não automatize a cópia dos dados locais.

Checklist local antes do PR:

```bash
npm run db:reset:local
npm run test:db
npm run test:concurrency
npm test
npm run build
```
