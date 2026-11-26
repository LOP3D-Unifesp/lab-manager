# Seguranca e operacao do banco

Este documento e o mapa de revisao do banco. As migrations em
`supabase/migrations` sao a fonte executavel; `DATABASE_SCHEMA.md` descreve o dominio.

## Mapa do banco

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : autentica
  PROFILES ||--|| PROFILE_PRIVATE_DATA : protege_PII
  PROFILES ||--o{ INVITATIONS : cria
  PROFILES ||--o{ PROFILE_SKILLS : possui
  SKILLS ||--o{ PROFILE_SKILLS : classifica
  PROFILES ||--o{ PROFILE_FUNDING_GRANTS : possui_bolsas
  PROFILES ||--o{ AVAILABILITY_SLOTS : informa
  LAB_SCHEDULE_PERIODS ||--o{ AVAILABILITY_SLOTS : define_turno
  LAB_SETTINGS ||--o{ LAB_SCHEDULE_PERIODS : configura
  PROFILES ||--o{ PRINTER_BOOKINGS : reserva
  PRINTERS ||--o{ PRINTER_BOOKINGS : recebe
  MATERIALS ||--o{ PRINTER_BOOKINGS : utiliza
  PRINTERS ||--o{ PRINTER_MATERIALS : aceita
  MATERIALS ||--o{ PRINTER_MATERIALS : compativel
  PRINTERS ||--o{ MAINTENANCE_BLOCKS : bloqueia
```

Fotos de perfil ficam no bucket publico `avatars` do Storage (3 MiB; png, jpeg e webp); cada
usuario escreve somente na propria pasta `<profile_id>/`.

`profiles` contem somente dados usados no diretorio interno autenticado. CPF, RG,
nascimento e endereco ficam em `profile_private_data`. Idiomas e proficiencia estao
fora do MVP e nao possuem tabelas nesta versao.

## Matriz de permissoes

| Recurso | Anonimo | Sem perfil/inativo | Pesquisador ativo | Coordenador ativo |
| --- | --- | --- | --- | --- |
| Diretorio de perfis | Nao | Nao | Leitura | Leitura e administracao |
| Dados privados | Nao | Somente o proprio registro | Somente o proprio registro | Leitura para suporte administrativo |
| Habilidades proprias | Nao | Nao | Leitura e edicao propria | Administracao |
| Bolsas de fomento | Nao | Nao | Leitura; edicao propria via RPC | Leitura e edicao via RPC |
| Fotos de perfil | Leitura publica (bucket) | Escrita propria | Escrita propria | Escrita propria |
| Disponibilidade | Nao | Nao | Leitura e edicao propria via RPC | Leitura e edicao de qualquer perfil via RPC |
| Equipamentos/materiais | Nao | Nao | Leitura | Administracao |
| Reservas | Nao | Nao | Leitura, criacao, edicao e cancelamento proprios via RPC (conforme `requires_booking_approval`) | Aprovacao, rejeicao, edicao, cancelamento e ciclo operacional via RPC |
| Manutencao | Nao | Nao | Leitura | Criacao/remocao via RPC |
| Aviso de privacidade | Leitura minima | Leitura minima | Leitura minima | Leitura minima |
| Convites | Nao | Nao | Nao | Edge Functions e leitura de auditoria |
| Configuracao de funcionamento | Somente identidade publica minima (`get_public_lab_identity`) | Somente identidade publica minima | Leitura | Capacidade, turnos e intervalos validados transacionalmente via RPC |
| Pedidos de compra | Nao | Nao | Leitura de todos; pedir para os proprios projetos (ou estoque geral) | Leitura, edicao e decisao via RPC |
| Notificacoes e preferencias | Nao | Nao | Leitura, "lido" e exclusao das proprias; preferencias proprias | Idem (so as proprias) |
| Assinaturas de push | Nao | Nao | Leitura e exclusao das proprias; registro via RPC | Idem (so as proprias) |
| Resumo de projetos | Nao | Nao | Leitura de todos (sem financiamento, tarefas nem compras); pedir para entrar | Leitura e decisao dos pedidos |
| Pedidos de entrada em projetos | Nao | Nao | Le os proprios e os do projeto em que participa; decide como membro | Leitura e decisao |

As escritas em `availability_slots` são realizadas pela RPC `replace_profile_availability`.
Ela serializa alteracoes concorrentes, valida dias/turnos ativos e impede ocupação presencial
acima de `workspace_capacity`.

As RPCs `save_lab_schedule_period` e `update_lab_breaks` compartilham um bloqueio transacional e
impedem sobreposicao entre turnos ativos e os intervalos configuraveis de almoco e jantar.
`update_lab_configuration` e `replace_profile_availability` compartilham outro bloqueio e recusam
reduzir a capacidade abaixo da ocupacao presencial ja cadastrada (`workspace_capacity_below_occupancy`).

As reservas usam as RPCs `create_printer_booking`, `update_printer_booking`, `cancel_printer_booking`,
`reject_printer_booking` e `set_printer_booking_status`. A aprovacao e a mudanca de status so podem ser
feitas por coordenadores; `in_progress`, `completed` e `failed` so sao aceitos a partir de 1 hora antes
do inicio. A tabela `printer_bookings` esta na publicacao `supabase_realtime`: mudancas sao enviadas
aos clientes sujeitas a RLS, e qualquer usuario ativo le todas as reservas (incluindo o motivo de
rejeicao).

Comentarios de tarefa (`project_task_comments`): leitura e criacao por coordenador ou membro do projeto, sempre em nome
proprio (a coluna do autor nao e aceita do cliente); edicao so pelo autor e apenas do texto e das mencoes; exclusao pelo
autor ou por coordenador. Mencionar alguem de fora do projeto nao gera aviso nem da acesso.

Notificacoes (`notifications`) so sao criadas por gatilhos `security definer`; o cliente nao insere e so altera `read_at`.
A chamada da Edge Function `send-push` usa um segredo compartilhado guardado em `private.push_config`, tabela fechada para
`anon` e `authenticated`. O resumo de projetos (`list_project_directory`) e as funcoes de pedido de entrada sao
`security definer` e conferem o perfil ativo; `projects` e `project_members` continuam sem leitura para quem nao participa.

RLS continua sendo aplicada quando o navegador chama a Data API diretamente. Operacoes
que alteram varias linhas ou validam concorrencia sao expostas somente como funcoes transacionais.

## Revisao de minimizacao de dados

O diretorio autenticado expoe apenas os campos usados na operacao do laboratorio: nome, email,
papel, vinculo, bolsas de fomento (agencia, nome da bolsa, horas semanais e valor mensal), carga
horaria, Lattes, foto, nacionalidade, telefone e bio. Nascimento,
CPF, RG e endereco permanecem em `profile_private_data`, legiveis somente pelo titular e por
coordenadores para suporte administrativo. Nenhum desses campos e exposto anonimamente.

Antes da producao, o responsavel institucional deve registrar aceite explicito para:

1. necessidade de telefone, nacionalidade e informacoes de fomento (inclusive valores mensais das bolsas) no diretorio compartilhado;
2. necessidade de coordenadores lerem documentos e endereco;
3. prazo de retencao e processo de correcao/exclusao desses dados;
4. texto do aviso de privacidade e contato institucional configurado;
5. uso de dados reais somente depois da validacao em staging.

O frontend aceita redirecionamento pos-login apenas para caminhos internos sem barras invertidas.
Essa validacao reduz o risco de redirecionamento aberto enquanto o projeto permanece no React
Router 6. A atualizacao para React Router 7 deve ser tratada separadamente, pois e uma migracao
incompativel; o projeto nao usa hidratacao SSR, relacionada ao segundo alerta moderado conhecido.

## Fluxo de convite

1. Um coordenador autenticado chama a Edge Function `invite-user`.
2. A funcao valida o JWT e o papel no banco usando o cliente administrativo.
3. Ela exige contato institucional de privacidade, valida o papel solicitado, cria uma linha
   `pending` com validade de 72 horas e usa o Supabase Auth para enviar o email.
4. O template aponta para uma pagina intermediaria. Abertura ou pre-carga nao consome o token;
   somente o botao de aceite chama `verifyOtp` e registra `opened_at`.
5. O usuario autenticado chama `create_profile`; a funcao usa `auth.uid()`, o email do JWT e o papel
   armazenado no convite, sem aceitar o papel enviado pelo navegador durante o cadastro.
6. Perfil publico, dados privados e consumo do convite acontecem na mesma transacao. O email
   duplicado e removido de `invitations`.
7. `manage-invitation` invalida o usuario Auth anterior antes de reenviar ou revogar. Reenvios tem
   intervalo minimo de cinco minutos.
8. O Cron chama `cleanup-invitations` a cada hora. Ele anonimiza expirados e repete de forma
   idempotente a exclusao definitiva de identidades incompletas.

Segredos `SUPABASE_SERVICE_ROLE_KEY` nunca pertencem ao frontend. Configure na Edge Function
`PUBLIC_SITE_URL`. O bearer do Cron e a URL da funcao ficam criptografados no Supabase Vault. No
projeto hospedado, mantenha cadastro publico desabilitado em Auth.

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

1. Gere backup do banco remoto antes de aplicar as migrations.
2. Valide as migrations em um projeto Supabase de staging recriado do zero.
3. Aplique com `supabase db push` apenas depois do CI verde.
4. Publique as Edge Functions `invite-user`, `manage-invitation` e `cleanup-invitations`, configure
   `PUBLIC_SITE_URL`, o template com `TokenHash` e o Cron.
5. Teste convite, cadastro, perfil privado e duas reservas conflitantes em staging.

O passo a passo da nuvem (variaveis, `config:remote-auth`, SMTP e solucao de problemas) esta em
[DEPLOY.md](DEPLOY.md). Hoje as migrations hospedadas sao aplicadas manualmente; veja
[PENDENCIAS.md](PENDENCIAS.md).

Migrations aplicadas nao devem ser editadas. Se houver falha antes do commit da migration, o
PostgreSQL desfaz a transacao. Depois da publicacao, crie uma migration compensatoria. Para perda
ou corrupcao, restaure o backup em um projeto separado e valide antes de promover a restauracao.

## Primeiro coordenador

Em ambiente totalmente vazio, o primeiro coordenador deve ser criado por `setup:local` ou
`bootstrap:remote`, nunca pelo navegador. Depois do login, ele conclui o wizard transacional do
laboratorio. Os demais usuarios entram por convite.

A baseline (`20260818`) ja esta na `main` e nao deve ser reescrita; as 12 migrations seguintes
(ate `20260830`) a estendem. Correcoes futuras entram como migrations incrementais novas.
