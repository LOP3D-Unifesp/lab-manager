# Seguranca e operacao do banco

Este documento e o mapa de revisao do banco do MVP. As migrations em
`supabase/migrations` sao a fonte executavel; `DATABASE_SCHEMA.md` descreve o dominio.

## Mapa do banco

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : autentica
  PROFILES ||--|| PROFILE_PRIVATE_DATA : protege_PII
  PROFILES ||--o{ INVITATIONS : cria
  PROFILES ||--o{ PROFILE_SKILLS : possui
  SKILLS ||--o{ PROFILE_SKILLS : classifica
  PROFILES ||--o{ AVAILABILITY_SLOTS : informa
  PROFILES ||--o{ PRINTER_BOOKINGS : reserva
  PRINTERS ||--o{ PRINTER_BOOKINGS : recebe
  MATERIALS ||--o{ PRINTER_BOOKINGS : utiliza
  PRINTERS ||--o{ PRINTER_MATERIALS : aceita
  MATERIALS ||--o{ PRINTER_MATERIALS : compativel
  PRINTERS ||--o{ MAINTENANCE_BLOCKS : bloqueia
```

`profiles` contem somente dados usados no diretorio interno autenticado. CPF, RG,
nascimento e endereco ficam em `profile_private_data`. Idiomas e proficiencia estao
fora do MVP e nao possuem tabelas nesta versao.

## Matriz de permissoes

| Recurso | Anonimo | Sem perfil/inativo | Pesquisador ativo | Coordenador ativo |
| --- | --- | --- | --- | --- |
| Diretorio de perfis | Nao | Nao | Leitura | Leitura e administracao |
| Dados privados | Nao | Somente o proprio registro | Somente o proprio registro | Leitura para suporte administrativo |
| Habilidades proprias | Nao | Nao | Leitura e edicao propria | Administracao |
| Disponibilidade | Nao | Nao | Leitura e edicao propria via RPC | Administracao via RPC |
| Impressoras/materiais | Nao | Nao | Leitura | Administracao |
| Reservas | Nao | Nao | Leitura, criacao e cancelamento permitido via RPC | Mesmas RPCs com privilegio administrativo |
| Manutencao | Nao | Nao | Leitura | Criacao/remocao via RPC |
| Convites | Nao | Nao | Nao | Edge Function e leitura de auditoria |

RLS continua sendo aplicada quando o navegador chama a Data API diretamente. Operacoes
que alteram varias linhas ou validam concorrencia sao expostas somente como funcoes transacionais.

## Fluxo de convite

1. Um coordenador autenticado chama a Edge Function `invite-user`.
2. A funcao valida o JWT e o papel no banco usando o cliente administrativo.
3. Ela cria uma linha `pending` em `invitations` e usa o Supabase Auth para enviar o email.
4. O usuario autenticado chama `create_profile`; a funcao usa `auth.uid()` e o email do JWT.
5. Perfil publico, dados privados e consumo do convite acontecem na mesma transacao.

Segredos `SUPABASE_SERVICE_ROLE_KEY` nunca pertencem ao frontend. Configure na Edge Function
`PUBLIC_SITE_URL` e, opcionalmente, `INVITATION_TTL_HOURS` (padrao: 24). No projeto hospedado,
mantenha cadastro publico desabilitado em Auth.

## Aplicar e validar

Requisitos: Docker e Supabase CLI.

```bash
supabase start
supabase db reset
supabase test db
npm test
npm run build
```

O reset recria um banco local vazio e aplica todas as migrations em ordem. Para atualizar os
tipos depois de alterar o schema, execute `npm run db:types` e revise o diff gerado.

## Publicacao e recuperacao

1. Gere backup do banco remoto antes de aplicar a migration.
2. Valide a migration em um projeto Supabase de staging recriado do zero.
3. Aplique com `supabase db push` apenas depois do CI verde.
4. Publique a Edge Function `invite-user` e configure seus segredos.
5. Teste convite, cadastro, perfil privado e duas reservas conflitantes em staging.

Migrations aplicadas nao devem ser editadas. Se houver falha antes do commit da migration, o
PostgreSQL desfaz a transacao. Depois da publicacao, crie uma migration compensatoria. Para perda
ou corrupcao, restaure o backup em um projeto separado e valide antes de promover a restauracao.

## Primeiro coordenador

Em ambiente totalmente vazio, o primeiro coordenador deve ser criado por `setup:local` ou
`bootstrap:remote`, nunca pelo navegador. Depois do login, ele conclui o wizard transacional do
laboratorio. Os demais usuarios entram por convite.

O MVP possui uma baseline consolidada. Depois que ela for publicada na `main`, nao deve ser
reescrita: correcoes futuras entram como migrations incrementais novas.
