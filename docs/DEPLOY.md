# Ambiente de teste na nuvem

O ambiente de teste da equipe é composto por:

- **Frontend** no GitHub Pages: https://lop3d-unifesp.github.io/lab-manager/
- **Backend** em um projeto Supabase hospedado (banco, Auth, Edge Functions e Storage).

Ele usa o mesmo coordenador de teste do ambiente local e deve conter **somente dados fictícios**
(veja [PENDENCIAS.md](PENDENCIAS.md)). Dados do Docker local nunca são copiados para a nuvem.

## Visão geral do fluxo

```text
push na main ─► CI (frontend + banco) ─► passou? ─► .github/workflows/deploy-pages.yml ─► build (modo remote) ─► GitHub Pages
                                                         │
                                       VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
                                                         ▼
                                              Supabase hospedado
```

O workflow roda os testes, gera o build com `VITE_APP_ENV=remote` e `VITE_BASE_PATH=/lab-manager/`
e copia `index.html` para `404.html`, o que faz links diretos como `/convite/aceitar` funcionarem no
Pages (aplicação de página única). Ele dispara **depois que o CI de um push na `main` termina com sucesso** (evento `workflow_run`), publicando o commit exato
que o CI testou; se o CI ficar vermelho (inclusive o job `database`), o site não é publicado até corrigir. Também dá para
publicar manualmente em *Actions → Deploy Pages → Run workflow* (emergência). A publicação leva uns 4 a 5 minutos a mais
porque espera o job do banco.

## Configuração inicial (uma vez)

### 1. GitHub

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → Variables*, criar:
   - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: chave `anon` do projeto (é pública por desenho; a proteção é feita
     pelas políticas RLS). **A chave `service_role` nunca vai para o GitHub.**

### 2. Supabase

```bash
supabase link --project-ref <project-ref>
supabase db push --remote        # aplica as migrations pendentes no projeto vinculado (ou: supabase db reset --linked, que APAGA o banco)
supabase functions deploy        # invite-user, manage-invitation, cleanup-invitations
supabase secrets set PUBLIC_SITE_URL=https://lop3d-unifesp.github.io/lab-manager
```

`supabase db reset --linked` apaga todo o banco do projeto vinculado. Confira o projeto com
`supabase projects list` (o marcador `●` indica o vinculado) antes de rodar.

### 3. Credenciais administrativas locais

Crie o arquivo `.env.admin.local` na raiz do repositório. Ele é ignorado pelo git (`.env.*`) e
**nunca deve ser commitado**. Os scripts remotos o leem automaticamente; variáveis já definidas no
ambiente têm prioridade.

```env
SUPABASE_ACCESS_TOKEN=<token pessoal: supabase.com/dashboard/account/tokens>
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API>
PUBLIC_SITE_URL=https://lop3d-unifesp.github.io/lab-manager
CONFIRM_REMOTE_HOST=<project-ref>.supabase.co

# Coordenador de teste (usado apenas por bootstrap:remote)
BOOTSTRAP_ADMIN_EMAIL=admin@lab.local
BOOTSTRAP_ADMIN_NAME=Administrador
BOOTSTRAP_ADMIN_PASSWORD=<mesma senha do ambiente local>

# Opcional: SMTP próprio (veja a seção de e-mail abaixo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login SMTP>
SMTP_PASS=<chave SMTP>
SMTP_FROM_EMAIL=contato@lop3d.com.br
SMTP_FROM_NAME=LOP3D Unifesp
```

Todos os scripts remotos exigem `CONFIRM_REMOTE_HOST` igual ao hostname do projeto e recusam
`localhost`.

### 4. Configurar o Auth

```bash
npm run config:remote-auth
```

O comando chama a Management API do Supabase e altera **somente**:

- `Site URL` (sem barra final: o template de convite monta `{{ .SiteURL }}/convite/aceitar`) e a
  lista de redirecionamentos permitidos;
- cadastro público desligado;
- assunto (lido de `supabase/config.toml`) e corpo (`supabase/templates/invite.html`) do e-mail de
  convite;
- SMTP próprio e limite de e-mails por hora, quando `SMTP_HOST` está definido.

Ele não envia o `config.toml` local inteiro, então não sobrescreve outras configurações do projeto.

### 5. Criar o coordenador e os dados de demonstração

```bash
npm run bootstrap:remote         # cria o primeiro coordenador (recusa banco que já tenha perfis)
# entre no site, faça login e conclua o wizard de instalação
npm run db:seed:demo:remote      # impressora, material, habilidade, reserva e manutenção fictícios
```

O seed exige o wizard concluído e é idempotente.

## Testar localmente contra a nuvem

```bash
npm run dev:remote
```

Usa o `.env.remote.local` (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`). **O banco é o mesmo da
equipe**: o que você criar ou apagar aparece no Pages. Os e-mails de convite abrem o link do Pages,
não o `localhost`; para testar o aceite localmente, troque o início da URL do link por
`http://localhost:5173`.

Para um fluxo sem riscos, use o ambiente local com Docker (veja
[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)).

## E-mail de convites (SMTP)

O serviço de e-mail padrão do Supabase limita o envio a poucos e-mails por hora. Ao estourar o
limite, o app mostra o erro *Edge Function returned a non-2xx status code* (nos logs do Auth:
`429 over_email_send_rate_limit`). Para o ambiente de teste foi configurado o **Brevo** como SMTP
próprio:

1. Crie a conta no Brevo e confirme o remetente (e-mail ou domínio).
2. Em *SMTP & API → SMTP* copie o servidor (`smtp-relay.brevo.com`), a porta (`587`), o **login**
   (diferente do e-mail da conta, algo como `xxxx@smtp-brevo.com`) e gere uma chave SMTP.
3. Preencha as variáveis `SMTP_*` no `.env.admin.local` e rode `npm run config:remote-auth`.

O script informa o remetente e o limite configurados ao final. O limite padrão do script é 100
e-mails por hora (`SMTP_RATE_LIMIT_PER_HOUR` ajusta).

**Remetente e entregabilidade:** os convites saem de `contato@lop3d.com.br`, com o domínio
`lop3d.com.br` autenticado no Brevo. O site continua no GitHub Pages; o domínio é usado só para o
e-mail. Se trocar o remetente, atualize `SMTP_FROM_EMAIL` no `.env.admin.local` e rode
`npm run config:remote-auth`.

## Avisos com o app fechado (push)

Opcional. Sem isto, o aviso no computador só aparece com o app aberto numa aba. O fluxo é: o banco cria a notificação,
um trigger chama a Edge Function `send-push` e ela entrega o aviso às assinaturas do navegador (Web Push).

1. Gere um par de chaves VAPID (uma vez): `npx web-push generate-vapid-keys`. A chave **privada** nunca vai para o
   repositório.
2. Segredos da função (Supabase → Edge Functions → Secrets, ou `supabase secrets set`):
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (ex.: `mailto:contato@seu-lab.org`) e
   `PUSH_WEBHOOK_SECRET` (um texto aleatório de 24+ caracteres).
3. Publique a função: `supabase functions deploy send-push`.
4. Diga ao banco onde chamar a função (SQL Editor, uma vez por ambiente; a tabela só é legível pelo dono do banco):

   ```sql
   insert into private.push_config (function_url, secret)
   values ('https://<ref-do-projeto>.supabase.co/functions/v1/send-push', '<o mesmo PUSH_WEBHOOK_SECRET>');
   ```

5. No GitHub: Settings → Secrets and variables → Actions → Variables → `VITE_VAPID_PUBLIC_KEY` = a chave
   **pública**. O próximo deploy do Pages já inclui o service worker (`sw.js`).
6. Em cada navegador: sino → "Receber avisos no computador". Para testar, feche o app e gere um evento (por exemplo,
   um pedido de compra) com outra conta.

Sem a linha em `private.push_config` (como no banco local e na CI) nenhum push é enviado e nada mais muda.

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Link do convite abre o login em vez da tela de aceite | `Site URL` com barra final (link `//convite/aceitar`) | Rodar `npm run config:remote-auth` (grava sem barra final) |
| `Edge Function returned a non-2xx status code` ao convidar | Limite de e-mails do Supabase | Configurar SMTP próprio ou esperar 1 hora |
| Página em branco ou 404 ao recarregar uma rota no Pages | `404.html` ausente no deploy | Conferir o passo `cp dist/index.html dist/404.html` no workflow |
| `VITE_SUPABASE_URL nao foi configurada` no site publicado | Variáveis do repositório ausentes | Criar as *Variables* e rodar o workflow de novo |
| Site não responde | Projeto Supabase gratuito pausado | Reativar o projeto no painel |

Os logs do projeto (Auth, Edge Functions, API) ficam em *Logs* no painel do Supabase.

## Migrations

Migrations não são aplicadas automaticamente. Depois de mergear mudanças de banco na `main`, rode
`supabase db push --remote` manualmente, depois de conferir o `project-ref` vinculado (`supabase migration list --remote`
mostra o que está pendente). Sem `--remote`, esta versão do CLI age no banco **local**. Antes de promover: faça backup,
valide em um banco vazio e execute `npm run test:db`.
