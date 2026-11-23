# Database Schema - LO&P3D Lab Manager

## 1. Visao geral

Este documento descreve o schema de banco de dados do MVP do LO&P3D Lab Manager para Supabase/PostgreSQL. Ele serve como referencia antes da criacao de migrations e politicas de Row Level Security (RLS).

O schema cobre:

- usuarios e perfis;
- convites;
- habilidades;
- idiomas;
- disponibilidade semanal;
- impressoras;
- materiais;
- compatibilidade entre impressoras e materiais;
- reservas de impressoras;
- bloqueios de manutencao.

O Supabase Auth sera a fonte de autenticacao. O PostgreSQL sera a fonte dos dados de dominio da aplicacao.

> **Fonte da verdade:** as migrations em `supabase/migrations/` (34 arquivos, de `20260818` a
> `20260920`). Este documento descreve o resultado delas. A secao 1.1 resume o que mudou depois da
> baseline; onde houver divergencia, vale a migration.

Status do MVP implementado:

- `profiles` contem somente dados compartilhados no diretorio interno;
- CPF, RG, nascimento e endereco ficam isolados em `profile_private_data`;
- convites usam Supabase Auth e `invitations`; o token e gerenciado pelo Auth e nao e persistido no schema publico;
- `languages` e `profile_languages` sao evolucao pos-MVP e ainda nao existem nas migrations;
- bolsas de fomento ficam em `profile_funding_grants` (varias por perfil);
- a configuracao do laboratorio fica em `lab_settings` e `lab_schedule_periods`;
- reservas tem fluxo de aprovacao, rejeicao e ciclo operacional;
- fotos de perfil ficam no bucket `avatars` do Storage;
- RLS, operacao e recuperacao estao detalhadas em `DATABASE_SECURITY.md`.

### 1.1 Atualizacoes posteriores a baseline

| Migration | Mudanca |
| --- | --- |
| `20260819_complete_operational_mvp` | RPCs `update_printer_booking` (edicao de reserva) e `set_printer_booking_status` (mudanca de status pelo coordenador). |
| `20260820_configurable_lab_operation` | `lab_settings.workspace_capacity` e `operating_weekdays`; tabela `lab_schedule_periods` (turnos); `availability_slots.schedule_period_id`; RPCs `update_lab_configuration`, `save_lab_schedule_period`, `replace_profile_availability`. |
| `20260821_configurable_meal_breaks` | Intervalos de almoco e jantar em `lab_settings`; RPC `update_lab_breaks`; turnos nao podem sobrepor os intervalos. |
| `20260822_configurable_booking_approval` | `profiles.requires_booking_approval` (padrao `true`); reservas nascem `pending` ou `approved` conforme essa configuracao. |
| `20260823_realtime_pending_bookings` | `printer_bookings` entra na publicacao `supabase_realtime`. |
| `20260824_profile_funding_grants` | Tabela `profile_funding_grants`; remove `has_funding_grant`, `funding_agency` e `funding_agency_other` de `profiles`; RPC `replace_profile_funding_grants`; `create_profile` e `update_my_profile` perdem os parametros de bolsa. |
| `20260825_profile_avatars` | `profiles.avatar_url`; bucket publico `avatars` (3 MiB; png, jpeg e webp); RPC `set_my_avatar_url`. |
| `20260826_funding_grant_contract_details` | `profile_funding_grants.grant_name`, `weekly_hours` (1 a 60) e `monthly_value` (>= 0). |
| `20260827_booking_rejected_status` | Valor `rejected` em `booking_status`; `rejected_reason` e `rejected_at`. |
| `20260828_booking_rule_fixes` | Transicoes e janela de inicio (1 hora antes); edicao so de reservas `pending` ou `approved`; RPC `reject_printer_booking`. |
| `20260829_booking_approved_at` | `printer_bookings.approved_at` (nulo para reservas aprovadas automaticamente). |
| `20260830_booking_decided_by` | `approved_by` e `rejected_by` (com indices). |
| `20260831_projects_members_funding` | Projetos, membros, agencias de fomento cadastraveis e fomento por projeto com valores por rubrica (secao 3.13). |
| `20260901_project_tasks` | Tarefas do kanban por projeto e seus responsaveis (secao 3.13). |
| `20260902_bookings_require_project` | `printer_bookings.project_id`; `create_printer_booking` e `update_printer_booking` passam a receber o projeto (`p_project_id`) em vez do nome. |
| `20260903_equipment` | Impressoras viram equipamentos: `printers` -> `equipment`, `printer_materials` -> `equipment_materials`, `printer_bookings` -> `equipment_bookings` (e `printer_id` -> `equipment_id`); nova `equipment_types`; material da reserva opcional; RPCs `create_booking`, `update_booking`, `cancel_booking`, `reject_booking`, `set_booking_status` e `replace_equipment_materials` (secao 3.14). |
| `20260904_inventory` | `materials.category` e `materials.unit`; nova `material_spools` (rolos com cor, peso e dono); `equipment_bookings.spool_id` e `consumed_amount`; `create_booking` e `update_booking` ganham `p_spool_id`; RPC `record_booking_usage` (secao 3.15). |
| `20260905_equipment_maintenance` | Manutencao como estado do equipamento, com historico: `equipment_maintenance` e as RPCs `start_equipment_maintenance` e `end_equipment_maintenance` (secao 3.16). |
| `20260906_feedback_reports` | Caixa de sugestoes e erros: `feedback_reports` (secao 3.17). |
| `20260907_maintenance_requests` | Chamados de manutencao e responsaveis pela manutencao: `maintenance_requests`, `profiles.is_maintainer` (secao 3.18). |
| `20260908_maintenance_request_photos_and_urgent_block` | Fotos nos chamados (`photo_paths`, bucket privado `maintenance-photos`) e bloqueio automatico do equipamento por chamado urgente (parcialmente substituido pela migration `20260909`; secao 3.18). |
| `20260909_equipment_stopped_status` | Status `stopped` (Parado) em `equipment_status`; chamado urgente so para o equipamento e "Iniciar manutencao" abre a manutencao (secao 3.18). |
| `20260910_realtime_requests_and_feedback` | `maintenance_requests` e `feedback_reports` na publicacao `supabase_realtime` (avisos em tempo real). |
| `20260911_purchase_requests` | Pedidos de compra: `purchase_requests`, `purchase_status`, funcoes `update_purchase_request` e `set_purchase_status` (secao 3.19). |
| `20260912_purchase_funding_category` | Rubrica do pedido de compra (`purchase_requests.funding_category`) e `update_purchase_request` com o argumento opcional `p_funding_category` (secao 3.19). |
| `20260913_funding_categories_travel` | Rubricas `passagens` e `diarias` em `project_funding_category` (fomentos dos projetos e pedidos de compra). |
| `20260914_purchase_undo` | `set_purchase_status` passa a aceitar as transicoes de volta do coordenador (secao 3.19). |
| `20260915_purchase_urgency` | Urgencia do pedido de compra (`purchase_urgency`, `purchase_requests.urgency`) e `update_purchase_request` com o argumento opcional `p_urgency` (secao 3.19). |
| `20260916_purchase_general_stock` | `purchase_requests.project_id` pode ser nulo: pedido para o estoque geral do laboratorio (secao 3.19). |
| `20260917_purchase_change_project` | `update_purchase_request` passa a poder mover o pedido para outro projeto ou para o estoque geral (argumentos `p_set_project` e `p_project_id`; secao 3.19). |
| `20260918_purchase_from_maintenance` | `purchase_requests.maintenance_request_id`: pedido de peca ligado a um chamado de manutencao (secao 3.19). |
| `20260919_purchase_for_maintenance` | `purchase_requests.for_maintenance`: marca de gasto de manutencao, a parte da rubrica (secao 3.19). |
| `20260920_maintenance_waiting_part` | Situacao `waiting_part` (Aguardando peca) em `maintenance_request_status`, sincronizada com as compras ligadas ao chamado (secao 3.18). |

Resumo dos objetos que mais mudam o entendimento do schema:

- **Reservas (`printer_bookings`):** alem dos campos de 3.11, tem `rejected_reason`, `rejected_at`,
  `rejected_by`, `approved_at`, `approved_by`, `cancelled_at` e `cancelled_by`. A duracao
  estimada vai de 30 a 1440 minutos, em multiplos de 30. Uma exclusao por intervalo
  (`printer_bookings_no_active_overlap`, GiST em `printer_id` e no intervalo da reserva) impede
  sobreposicao entre reservas `pending`, `approved` e `in_progress` da mesma impressora.
- **Transicoes de status:** `pending` para `approved`, `rejected` ou `cancelled`; `approved` para
  `in_progress` ou `cancelled`; `in_progress` para `completed` ou `failed`. `in_progress`,
  `completed` e `failed` so sao aceitos a partir de 1 hora antes de `starts_at`
  (`booking_not_started`). Edicao so em `pending` ou `approved` (`booking_not_editable`).
- **RPCs de reserva:** `create_printer_booking`, `update_printer_booking`, `cancel_printer_booking`,
  `reject_printer_booking(p_booking_id, p_reason)` e `set_printer_booking_status(p_booking_id,
  p_status)` (somente coordenador; registra `approved_at` e `approved_by` ao aprovar).
- **Manutencao:** `create_maintenance_block` e `delete_maintenance_block`; o inicio nao pode estar
  no passado e o bloqueio nao pode sobrepor reservas ativas nem outros bloqueios.
- **Laboratorio:** `lab_settings` guarda tambem `workspace_capacity` (padrao 10),
  `operating_weekdays` (padrao segunda a sexta) e os horarios de almoco (12:00 a 13:30) e jantar
  (17:30 a 19:00). RPCs: `complete_lab_installation`, `update_lab_configuration`,
  `update_lab_breaks`, `save_lab_schedule_period` e `get_public_lab_identity` (anonima; devolve nome,
  sigla, contato de privacidade e validade do convite de 72 horas).
- **Turnos (`lab_schedule_periods`):** `id`, `starts_at`, `ends_at`, `sort_order`, `is_active`,
  `created_by`, `updated_by` e timestamps; `starts_at < ends_at` e unico por intervalo. Turnos ativos
  nao podem se sobrepor entre si nem aos intervalos de almoco e jantar, e deve existir ao menos um
  ativo. A baseline cria seis turnos (08-10, 10-12, 13:30-15:30, 15:30-17:30, 19-21 e 21-23).
- **Disponibilidade:** `availability_slots` referencia o turno por `schedule_period_id`; `starts_at`
  e `ends_at` sao derivados por trigger. Escrita direta e revogada; a gravacao ocorre por
  `replace_profile_availability(p_profile_id, p_slots)`, que exige dia de funcionamento, turno ativo
  e respeita `workspace_capacity` para o modo `onsite`.
- **Convites:** `invitations` tem a regra de um convite pendente por e-mail; objetos de apoio:
  `record_invitation_opened()`, `configure_invitation_cleanup(p_function_url, p_secret)` (somente
  `service_role`) e `private.expire_pending_invitations()`. A validade de 72 horas e uma constante
  (`INVITATION_TTL_HOURS` nas Edge Functions e o valor devolvido por `get_public_lab_identity`), nao
  uma coluna de `lab_settings`.
- **Bolsas (`profile_funding_grants`):** `id`, `profile_id` (cascade), `agency` (`funding_agency`),
  `agency_other`, `grant_name`, `weekly_hours`, `monthly_value` e `created_at`. `agency_other` e
  obrigatorio so para `other`. Leitura por qualquer usuario ativo; escrita pelo dono ou coordenador,
  via `replace_profile_funding_grants(p_profile_id, p_grants)`.
- **Perfil:** alem dos campos de 3.1, `profiles` tem `weekly_workload_hours` (1 a 60), `lattes_url`,
  `requires_booking_approval` e `avatar_url`. Um trigger impede que o proprio usuario altere seu
  `role`. As RPCs de perfil sao `create_profile` e `update_my_profile`.

Convencoes gerais:

- Chaves primarias usam `uuid`.
- Campos de data/hora de eventos absolutos usam `timestamptz`.
- Campos de horario recorrente semanal usam `time`.
- Tabelas principais devem ter `created_at timestamptz` e `updated_at timestamptz`.
- Reservas canceladas ou finalizadas permanecem no historico.
- As migrations em `supabase/migrations/` sao a fonte da verdade para SQL, RPCs e politicas RLS.

## 2. Enums sugeridos

### `user_role`

Papeis de acesso do sistema.

- `coordinator`
- `researcher`

### `academic_affiliation`

Vinculo academico ou institucional do pesquisador. Nao altera permissoes.

- `ic`
- `extension`
- `intern`
- `tcc`
- `masters`
- `phd`
- `postdoc`
- `visitor`
- `technician`
- `faculty`
- `other`

Observacao:

- `intern` representa Estagiario.

### `funding_agency`

Agencia responsavel pela bolsa de fomento.

- `cnpq`
- `fapesp`
- `capes`
- `sus`
- `fap`
- `other`

### `invitation_status`

Status de um convite.

- `pending`
- `accepted`
- `expired`
- `revoked`

### `printer_status`

Status operacional de uma impressora.

- `active`
- `maintenance`
- `unavailable`
- `disabled`

### `booking_status`

Status de uma reserva.

- `pending`
- `approved`
- `rejected`
- `in_progress`
- `completed`
- `cancelled`
- `failed`

Novas reservas iniciam como `pending` quando o pesquisador tem `profiles.requires_booking_approval`
(padrao `true`) e como `approved` para coordenadores ou pesquisadores sem essa exigencia. O status
`rejected` registra a recusa pelo coordenador e nao bloqueia o horario. Detalhes e transicoes na
secao 1.1.

### `weekday`

Nao deve ser criado como enum. A disponibilidade semanal deve usar `weekday integer`, com valores de `0` a `6`.

Convencao recomendada:

- `0`: domingo
- `1`: segunda-feira
- `2`: terca-feira
- `3`: quarta-feira
- `4`: quinta-feira
- `5`: sexta-feira
- `6`: sabado

## 3. Tabelas

### 3.1 `profiles`

Finalidade: armazenar os dados de dominio dos usuarios autenticados, incluindo papel de acesso, dados de identificacao e vinculo academico.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do perfil. Deve ser igual a `auth.users.id`. |
| `full_name` | `text` | Sim | Nome completo do usuario. |
| `email` | `text` | Sim | Email principal do usuario. |
| `role` | `user_role` | Sim | Papel de acesso no sistema. |
| `academic_affiliation` | `academic_affiliation` | Nao | Vinculo academico ou institucional. |
| `weekly_workload_hours` | `integer` | Nao | Carga horaria semanal (1 a 60). Bolsistas: soma das horas das bolsas; voluntarios: valor manual. |
| `lattes_url` | `text` | Nao | Link do curriculo Lattes. |
| `requires_booking_approval` | `boolean` | Sim | Se `true` (padrao), as reservas da pessoa nascem `pending`. |
| `avatar_url` | `text` | Nao | URL da foto no bucket `avatars`. |
| `nationality_country_code` | `char(2)` | Nao | Codigo ISO 3166-1 alpha-2 da nacionalidade ou pais principal do pesquisador. Exemplos: `CL`, `BR`, `DE`. |
| `phone` | `text` | Nao | Telefone de contato. |
| `bio` | `text` | Nao | Resumo do pesquisador. |
| `is_active` | `boolean` | Sim | Indica se o perfil esta ativo. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- `id` referencia `auth.users.id`.

Campos obrigatorios:

- `id`
- `full_name`
- `email`
- `role`
- `requires_booking_approval`
- `is_active`
- `created_at`
- `updated_at`

Campos opcionais:

- `academic_affiliation`
- `weekly_workload_hours`, `lattes_url` e `avatar_url`
- `nationality_country_code`
- `phone`
- `bio`

Indices recomendados:

- indice unico em `email`;
- indice em `role`;
- indice em `nationality_country_code`, se houver busca ou filtros por nacionalidade;
- indice em `is_active`;
- indice para busca por `full_name`, se necessario.

Regras de integridade:

- `profiles.id` deve ser igual ao `auth.users.id`.
- `email` deve ser unico.
- `role` deve ser `coordinator` ou `researcher`.
- Bolsas de fomento ficam em `profile_funding_grants` (secao 1.1); uma pessoa pode ter varias.
- `weekly_workload_hours`, quando informado, fica entre 1 e 60.
- `nationality_country_code` deve usar dois caracteres no padrao ISO 3166-1 alpha-2.
- `nationality_country_code` representa nacionalidade ou pais principal do pesquisador, nao residencia atual nem instituicao de vinculo.
- Pesquisadores nao podem alterar o proprio `role`.
- Perfis inativos nao devem ser tratados como pesquisadores disponiveis nas consultas operacionais.

### 3.1.1 `profile_private_data`

Finalidade: isolar dados pessoais que nao pertencem ao diretorio compartilhado do laboratorio.

Campos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `profile_id` | `uuid` | Sim | Perfil dono dos dados e chave primaria. |
| `birth_date` | `date` | Nao | Data de nascimento. |
| `cpf` | `text` | Nao | CPF normalizado com 11 digitos. |
| `rg` | `text` | Nao | Documento de identidade. |
| `postal_code` | `text` | Nao | CEP ou codigo postal. |
| `street` | `text` | Nao | Logradouro. |
| `address_number` | `text` | Nao | Numero. |
| `address_complement` | `text` | Nao | Complemento. |
| `neighborhood` | `text` | Nao | Bairro. |
| `city` | `text` | Nao | Cidade de residencia. |
| `state` | `text` | Nao | Estado de residencia. |
| `country` | `text` | Nao | Pais de residencia. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Somente o proprio usuario e coordenadores podem ler esses dados. Escritas do usuario passam
pelas funcoes transacionais de criacao e atualizacao do perfil; nao ha escrita direta pelo frontend.

### 3.1.2 `lab_settings`

Finalidade: representar a configuracao unica do laboratorio administrado por uma instalacao.
Nao existe `lab_id` nas demais tabelas porque multitenancy fica fora do MVP.

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---:|---|
| `id` | `boolean` | Sim | Chave singleton, sempre `true`. |
| `name` | `text` | Apos setup | Nome institucional do laboratorio. |
| `acronym` | `text` | Apos setup | Sigla exibida na navegacao. |
| `timezone` | `text` | Sim | Fuso IANA usado pela instalacao. |
| `workspace_capacity` | `integer` | Sim | Limite de pessoas presenciais por turno. |
| `operating_weekdays` | `integer[]` | Sim | Dias da semana em que a agenda recorrente fica ativa. |
| `lunch_starts_at` / `lunch_ends_at` | `time` | Sim | Intervalo configurável de almoço. |
| `dinner_starts_at` / `dinner_ends_at` | `time` | Sim | Intervalo configurável de jantar. |
| `privacy_contact_email` | `text` | Apos setup | Contato institucional exibido no convite e no aviso publico de privacidade. |
| `setup_completed_at` | `timestamptz` | Nao | Preenchido somente pela conclusao atomica do wizard. |
| `created_by` | `uuid` | Nao | Primeiro coordenador que concluiu o setup. |
| `updated_by` | `uuid` | Nao | Ultimo coordenador que alterou a configuracao. |
| `created_at` | `timestamptz` | Sim | Data de criacao da linha singleton. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Usuarios ativos podem consultar a configuracao. Somente coordenadores podem conclui-la ou altera-la,
sempre pelas RPCs protegidas.

### 3.1.3 `lab_schedule_periods`

Catálogo ordenado dos turnos recorrentes do laboratório. Cada disponibilidade referencia um
identificador estável; alterações de início e fim são propagadas sem perder as seleções dos
pesquisadores. Turnos inativos permanecem preservados e não aparecem na agenda. Turnos ativos
não podem se sobrepor aos intervalos de almoço e jantar configurados em `lab_settings`.

### 3.2 `invitations`

Finalidade: registrar convites criados por coordenadores para entrada de pesquisadores ou novos
coordenadores no sistema.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do convite. |
| `email` | `text` | Enquanto pendente | Email da pessoa convidada; removido ao aceitar, expirar ou revogar. |
| `role` | `user_role` | Sim | Papel que sera aplicado ao perfil no aceite. |
| `status` | `invitation_status` | Sim | Status do convite. |
| `invited_by` | `uuid` | Sim | Coordenador que criou o convite. |
| `auth_user_id` | `uuid` | Nao | Usuario criado pelo Supabase Auth ao enviar o convite. |
| `accepted_by` | `uuid` | Nao | Perfil criado ao aceitar o convite. |
| `expires_at` | `timestamptz` | Sim | Data obrigatoria de expiracao. |
| `opened_at` | `timestamptz` | Nao | Momento da confirmacao explicita do link, antes do cadastro. |
| `last_sent_at` | `timestamptz` | Sim | Ultimo envio, usado no prazo e no limite de reenvio. |
| `send_count` | `integer` | Sim | Quantidade de envios do convite. |
| `accepted_at` | `timestamptz` | Nao | Data de aceite. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- `invited_by` referencia `profiles.id`;
- `accepted_by` referencia `profiles.id`.

Campos obrigatorios:

- `id`
- `role`
- `status`
- `invited_by`
- `expires_at`
- `last_sent_at`
- `send_count`
- `created_at`
- `updated_at`

Campos opcionais:

- `accepted_by`
- `accepted_at`
- `auth_user_id`
- `email` depois que o convite deixa de estar pendente
- `opened_at`

Indices recomendados:

- indice em `email`;
- indice composto em `email, status`;
- indice em `expires_at`;
- indice em `invited_by`.

Regras de integridade:

- O token e seu hash sao gerenciados internamente pelo Supabase Auth e nao sao persistidos nas tabelas publicas.
- O sistema nao tera cadastro publico aberto.
- O coordenador cria um convite para um email especifico.
- A Edge Function solicita ao Supabase Auth o link de convite e salva apenas o estado de auditoria.
- O Auth provisiona uma identidade pendente, mas nenhum perfil e criado antes do aceite.
- Abrir a pagina intermediaria nao confirma o token; `verifyOtp` roda somente apos o botao de aceite.
- Antes de permitir o perfil, o sistema valida `status`, `expires_at`, `auth_user_id` e o email obtido do JWT.
- Se o convite for valido, o pesquisador pode criar sua conta no Supabase Auth.
- Apos a conta ser criada e autenticada, o sistema cria o `profile` vinculado a `auth.users.id`.
- O `profile` deve herdar ou validar o email do convite.
- Sem convite valido, o sistema nao deve permitir criacao de perfil.
- Usuarios autenticados sem `profile` valido nao devem acessar areas internas do sistema.
- Todo convite expira 72 horas depois do ultimo envio.
- Apenas convites `pending` e nao expirados podem ser aceitos.
- Convites aceitos nao podem ser reutilizados.
- Nao deve existir mais de um convite `pending` ativo para o mesmo email.
- `accepted_by` e `accepted_at` devem ser preenchidos quando o convite for aceito.
- Convites aceitos removem o email duplicado e usam `accepted_by` para identificacao historica.
- Convites expirados ou revogados removem o email e a identidade Auth incompleta; a limpeza horaria
  e idempotente e repete exclusoes que falharam.
- Reenvio so ocorre depois de cinco minutos, invalida o token anterior e incrementa `send_count`.
- Apenas coordenadores podem criar, revogar ou gerenciar convites.

### 3.3 `skills`

Finalidade: armazenar o catalogo de habilidades tecnicas que podem ser associadas aos pesquisadores.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador da habilidade. |
| `name` | `text` | Sim | Nome da habilidade. |
| `description` | `text` | Nao | Descricao da habilidade. |
| `is_active` | `boolean` | Sim | Indica se a habilidade pode ser usada em novas associacoes. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- nenhuma.

Campos obrigatorios:

- `id`
- `name`
- `is_active`
- `created_at`
- `updated_at`

Campos opcionais:

- `description`

Indices recomendados:

- indice unico em `name`;
- indice em `is_active`.

Regras de integridade:

- `name` deve ser unico.
- Habilidades inativas nao devem ser oferecidas para novas associacoes.
- Habilidades inativas podem permanecer associadas para preservar historico e consultas existentes.

### 3.4 `profile_skills`

Finalidade: representar a relacao muitos-para-muitos entre perfis e habilidades.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `profile_id` | `uuid` | Sim | Perfil do pesquisador. |
| `skill_id` | `uuid` | Sim | Habilidade associada. |
| `created_at` | `timestamptz` | Sim | Data de criacao da associacao. |

Chave primaria:

- chave primaria composta por `profile_id, skill_id`.

Chaves estrangeiras:

- `profile_id` referencia `profiles.id`;
- `skill_id` referencia `skills.id`.

Campos obrigatorios:

- `profile_id`
- `skill_id`
- `created_at`

Campos opcionais:

- nenhum.

Indices recomendados:

- indice em `skill_id`;
- indice em `profile_id`;
- chave unica composta em `profile_id, skill_id`, caso nao seja usada como PK composta.

Regras de integridade:

- A mesma habilidade nao pode ser associada mais de uma vez ao mesmo perfil.
- Pesquisadores so podem alterar habilidades do proprio perfil.
- Consultas por habilidade devem considerar apenas perfis ativos.

### 3.5 `languages`

Finalidade: armazenar o catalogo de idiomas que pesquisadores podem associar aos seus perfis. Idiomas nao devem ser tratados como `skills`, porque representam capacidade de comunicacao, nao habilidade tecnica.

Idiomas sao uma evolucao pos-MVP para suportar pesquisadores internacionais. Esta secao preserva a proposta conceitual, mas as tabelas ainda nao existem nas migrations.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do idioma. |
| `name` | `text` | Sim | Nome do idioma. |
| `iso_code` | `text` | Nao | Codigo ISO 639-1 quando possivel. Exemplos: `pt`, `es`, `en`, `de`, `fr`, `it`. |
| `is_active` | `boolean` | Sim | Indica se o idioma pode ser usado em novas associacoes. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- nenhuma.

Campos obrigatorios:

- `id`
- `name`
- `is_active`
- `created_at`
- `updated_at`

Campos opcionais:

- `iso_code`

Indices recomendados:

- indice unico em `name`;
- indice unico em `iso_code` quando preenchido;
- indice em `is_active`.

Regras de integridade:

- `name` deve ser unico.
- `iso_code` deve usar ISO 639-1 quando houver codigo aplicavel.
- Idiomas inativos nao devem ser oferecidos para novas associacoes.
- Idiomas nao devem ser misturados com habilidades tecnicas em `skills`.

### 3.6 `profile_languages`

Finalidade: representar a relacao muitos-para-muitos entre perfis e idiomas falados.

Esta tabela fica reservada para o pos-MVP e ainda nao existe nas migrations.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `profile_id` | `uuid` | Sim | Perfil do pesquisador. |
| `language_id` | `uuid` | Sim | Idioma associado ao perfil. |
| `created_at` | `timestamptz` | Sim | Data de criacao da associacao. |

Chave primaria:

- chave primaria composta por `profile_id, language_id`.

Chaves estrangeiras:

- `profile_id` referencia `profiles.id`;
- `language_id` referencia `languages.id`.

Campos obrigatorios:

- `profile_id`
- `language_id`
- `created_at`

Campos opcionais:

- nenhum no MVP.

Indices recomendados:

- indice em `language_id`;
- indice em `profile_id`;
- chave unica composta em `profile_id, language_id`, caso nao seja usada como PK composta.

Regras de integridade:

- O mesmo idioma nao pode ser associado mais de uma vez ao mesmo perfil.
- Pesquisadores so podem alterar idiomas do proprio perfil.
- Consultas por idioma devem considerar apenas perfis ativos.
- O MVP nao deve incluir nivel de proficiencia.
- `proficiency_level` pode ser adicionado futuramente em `profile_languages`, se o produto passar a diferenciar fluencia, leitura, escrita ou conversacao.

### 3.7 `availability_slots`

Finalidade: registrar a disponibilidade semanal planejada dos pesquisadores no laboratorio.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador da faixa de disponibilidade. |
| `profile_id` | `uuid` | Sim | Pesquisador dono da disponibilidade. |
| `weekday` | `integer` | Sim | Dia da semana, de `0` a `6`. |
| `starts_at` | `time` | Sim | Horario inicial da faixa semanal. |
| `ends_at` | `time` | Sim | Horario final da faixa semanal. |
| `work_mode` | `text` | Sim | Modo da faixa: `onsite`, `remote` ou `aula`. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- `profile_id` referencia `profiles.id`.

Campos obrigatorios:

- `id`
- `profile_id`
- `weekday`
- `starts_at`
- `ends_at`
- `work_mode`
- `created_at`
- `updated_at`

Campos opcionais:

- nenhum.

Indices recomendados:

- indice em `profile_id`;
- indice composto em `weekday, starts_at, ends_at`;
- indice composto em `profile_id, weekday`.

Regras de integridade:

- `weekday` deve estar entre `0` e `6`.
- `starts_at` deve ser anterior a `ends_at`.
- `work_mode` deve ser `onsite`, `remote` ou `aula`.
- Os turnos sao linhas de `lab_schedule_periods`, referenciadas por `schedule_period_id`; `starts_at` e `ends_at` sao derivados do turno. Nao existe coluna `periodo`.
- O sistema deve evitar faixas duplicadas ou incoerentes para o mesmo pesquisador.
- A disponibilidade representa planejamento, nao confirmacao real de presenca.
- Pesquisadores so podem alterar a propria disponibilidade.

> **Nomes depois de `20260903`:** as secoes 3.8 a 3.12 foram escritas quando o laboratorio so tinha
> impressoras. Leia `printers` como `equipment`, `printer_materials` como `equipment_materials`,
> `printer_bookings` como `equipment_bookings`, `printer_id` como `equipment_id` e `printer_status` como
> `equipment_status`. O que mudou de regra esta na secao 3.14.

### 3.8 `printers`

Finalidade: armazenar o cadastro das impressoras 3D gerenciadas pelo laboratorio.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador da impressora. |
| `name` | `text` | Sim | Nome ou identificacao principal da impressora. |
| `model` | `text` | Nao | Modelo da impressora. |
| `location` | `text` | Nao | Localizacao no laboratorio. |
| `status` | `printer_status` | Sim | Status operacional da impressora. |
| `notes` | `text` | Nao | Observacoes administrativas. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- nenhuma.

Campos obrigatorios:

- `id`
- `name`
- `status`
- `created_at`
- `updated_at`

Campos opcionais:

- `model`
- `location`
- `notes`

Indices recomendados:

- indice unico em `name`;
- indice em `status`;
- indice em `location`, se a consulta por local for relevante.

Regras de integridade:

- `name` deve identificar a impressora de forma clara.
- Apenas coordenadores podem cadastrar ou editar impressoras.
- Impressoras com status `active` podem aparecer para novas reservas.
- Impressoras com status `maintenance`, `unavailable` ou `disabled` nao devem aceitar novas reservas.
- Impressoras `disabled` nao aparecem para novas reservas, mas permanecem preservadas no historico.

### 3.9 `materials`

Finalidade: armazenar o catalogo tecnico simples de materiais usados nas impressoes 3D, para compatibilidade com impressoras e selecao em reservas. Exemplos: `PLA`, `PETG`, `PA`, `TPU`.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do material. |
| `name` | `text` | Sim | Nome do material. |
| `description` | `text` | Nao | Descricao ou observacoes sobre o material. |
| `is_active` | `boolean` | Sim | Indica se o material esta disponivel para novas associacoes e reservas. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- nenhuma.

Campos obrigatorios:

- `id`
- `name`
- `is_active`
- `created_at`
- `updated_at`

Campos opcionais:

- `description`

Indices recomendados:

- indice unico em `name`;
- indice em `is_active`.

Regras de integridade:

- `name` deve ser unico.
- Materiais sao catalogo tecnico simples no MVP.
- O MVP nao tera controle de estoque, quantidade, lote, fabricante, cor, peso, secagem, custo ou movimentacao.
- Campos de rolos ou lotes fisicos, como `lot_number`, `opened_on`, `manufacturer`, `color`, `weight_grams` ou `last_dried_on`, nao devem ser adicionados a `materials` no MVP.
- Materiais inativos nao devem ser usados em novas reservas.

### 3.10 `printer_materials`

Finalidade: representar quais materiais sao compativeis com cada impressora.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `printer_id` | `uuid` | Sim | Impressora. |
| `material_id` | `uuid` | Sim | Material compativel. |
| `created_at` | `timestamptz` | Sim | Data de criacao da associacao. |

Chave primaria:

- chave primaria composta por `printer_id, material_id`.

Chaves estrangeiras:

- `printer_id` referencia `printers.id`;
- `material_id` referencia `materials.id`.

Campos obrigatorios:

- `printer_id`
- `material_id`
- `created_at`

Campos opcionais:

- nenhum.

Indices recomendados:

- indice em `printer_id`;
- indice em `material_id`;
- chave unica composta em `printer_id, material_id`, caso nao seja usada como PK composta.

Regras de integridade:

- A mesma compatibilidade nao pode ser cadastrada mais de uma vez.
- Apenas coordenadores podem alterar compatibilidades.
- Reservas devem aceitar apenas materiais compativeis com a impressora selecionada.
- Compatibilidades com impressoras ou materiais inativos nao devem ser oferecidas em novos fluxos de reserva.

### 3.11 `printer_bookings`

Finalidade: registrar reservas manuais de impressoras para projetos dos pesquisadores.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador da reserva. |
| `printer_id` | `uuid` | Sim | Impressora reservada. |
| `profile_id` | `uuid` | Sim | Pesquisador responsavel pela reserva. |
| `material_id` | `uuid` | Sim | Material selecionado para a reserva. |
| `project_id` | `uuid` | Nao | Projeto da impressao (`projects.id`, `RESTRICT`). Obrigatorio em reservas novas; nulo so nas reservas anteriores a `20260902`. |
| `project_name` | `text` | Sim | Copia do nome do projeto no momento da reserva (nas reservas antigas, o texto livre original). |
| `starts_at` | `timestamptz` | Sim | Inicio da reserva. |
| `ends_at` | `timestamptz` | Sim | Fim calculado da reserva. |
| `estimated_duration_minutes` | `integer` | Sim | Duracao estimada informada no MVP para calcular `ends_at`. |
| `status` | `booking_status` | Sim | Status da reserva. |
| `notes` | `text` | Nao | Observacoes da reserva. |
| `cancelled_at` | `timestamptz` | Nao | Data de cancelamento. |
| `cancelled_by` | `uuid` | Nao | Usuario que cancelou a reserva. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- `printer_id` referencia `printers.id`;
- `profile_id` referencia `profiles.id`;
- `material_id` referencia `materials.id`;
- `cancelled_by` referencia `profiles.id`.

Campos obrigatorios:

- `id`
- `printer_id`
- `profile_id`
- `material_id`
- `project_name`
- `starts_at`
- `ends_at`
- `estimated_duration_minutes`
- `status`
- `created_at`
- `updated_at`

Campos opcionais:

- `notes`
- `cancelled_at`
- `cancelled_by`

Indices recomendados:

- indice em `printer_id`;
- indice em `profile_id`;
- indice em `material_id`;
- indice em `status`;
- indice composto em `printer_id, starts_at, ends_at`;
- indice composto em `profile_id, starts_at`;
- indice parcial futuro para reservas ativas, se usado em migrations.

Regras de integridade:

- `starts_at` deve ser anterior a `ends_at`.
- `estimated_duration_minutes` e obrigatorio no MVP, porque a reserva manual exige duracao estimada para calcular `ends_at`.
- Novas reservas iniciam como `pending` ou `approved` conforme `profiles.requires_booking_approval` (secao 1.1).
- Reservas com status `pending`, `approved` ou `in_progress` bloqueiam o horario.
- Reservas com status `cancelled`, `completed` ou `failed` nao bloqueiam o horario.
- Reservas da mesma impressora nao podem se sobrepor quando estiverem ativas.
- O material da reserva deve ser compativel com a impressora em `printer_materials`.
- A impressora deve estar `active` para aceitar novas reservas.
- Impressoras `maintenance`, `unavailable` ou `disabled` nao devem aceitar novas reservas.
- O pesquisador so pode criar reserva para si mesmo.
- O pesquisador so pode cancelar reservas proprias em status permitido.
- Coordenadores podem editar ou cancelar reservas de qualquer pesquisador.
- Cancelamentos devem alterar o status para `cancelled`, nao apagar a reserva.

### 3.12 `maintenance_blocks`

Finalidade: registrar periodos em que uma impressora fica bloqueada para manutencao.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do bloqueio. |
| `printer_id` | `uuid` | Sim | Impressora bloqueada. |
| `created_by` | `uuid` | Sim | Coordenador que criou o bloqueio. |
| `starts_at` | `timestamptz` | Sim | Inicio do bloqueio. |
| `ends_at` | `timestamptz` | Sim | Fim do bloqueio. |
| `reason` | `text` | Sim | Motivo do bloqueio. |
| `notes` | `text` | Nao | Observacoes adicionais. |
| `created_at` | `timestamptz` | Sim | Data de criacao. |
| `updated_at` | `timestamptz` | Sim | Data da ultima atualizacao. |

Chave primaria:

- `id`

Chaves estrangeiras:

- `printer_id` referencia `printers.id`;
- `created_by` referencia `profiles.id`.

Campos obrigatorios:

- `id`
- `printer_id`
- `created_by`
- `starts_at`
- `ends_at`
- `reason`
- `created_at`
- `updated_at`

Campos opcionais:

- `notes`

Indices recomendados:

- indice em `printer_id`;
- indice em `created_by`;
- indice composto em `printer_id, starts_at, ends_at`;

Regras de integridade:

- `starts_at` deve ser anterior a `ends_at`.
- Apenas coordenadores podem criar, editar ou remover bloqueios.
- Bloqueios de manutencao impedem novas reservas no mesmo periodo.
- Manutencao nao pode coexistir com reservas ativas no mesmo periodo.
- A criacao de bloqueio deve falhar se houver reserva ativa sobreposta para a mesma impressora.

### 3.13 Projetos, membros e fomento

Finalidade: cadastrar os projetos do laboratorio, quem participa de cada um e o fomento recebido.
O coordenador gerencia tudo; cada pesquisador enxerga apenas os projetos de que e membro.

- `projects`: `name` (unico sem diferenciar maiusculas), `description`, `status` (`project_status`:
  `planning`, `active`, `paused`, `completed`, `archived`), `starts_on`, `ends_on`, `created_by`.
  Nao ha exclusao: projetos encerrados ficam `archived`.
- `project_members`: chave `(project_id, profile_id)`. Um pesquisador pode estar em varios projetos.
- `funding_agencies`: `acronym` (unico), `name`, `is_active`. Vem com FAPESP, CNPq, FINEP,
  Embrapii e CAPES; o coordenador cadastra outras. Independente do enum `funding_agency`, que
  continua valendo so para as bolsas por pessoa (`profile_funding_grants`).
- `project_funding`: um projeto pode ter zero ou varios fomentos (`agency_id`, `process_number`,
  `grant_name`, vigencia).
- `project_funding_items`: valor **concedido** por rubrica (`project_funding_category`: `capital`,
  `custeio`, `bolsas`, `reserva_tecnica`, `outros`), com `amount >= 0`. O total do fomento e a soma
  dos itens. Gastos e prestacao de contas ficam para um modulo financeiro futuro.

Acesso (RLS): leitura por coordenador ou membro ativo (`private.can_read_project`); escrita direta
em `projects` e `funding_agencies` so por coordenador; membros e fomento so pelas RPCs
`replace_project_members` e `replace_project_funding` (coordenador, transacionais).

Kanban de tarefas:

- `project_tasks`: `project_id`, `title`, `description`, `status` (`task_status`: `todo`, `in_progress`,
  `review`, `done`), `position`, `due_on`, `created_by`. O trigger `append_task_to_column` coloca a
  tarefa no fim da coluna quando ela e criada ou muda de coluna.
- `project_task_assignees`: varios responsaveis por tarefa. Uma FK composta com `project_members`
  garante que so membros do projeto sejam responsaveis, e sair do projeto remove a pessoa das tarefas.
- Acesso: membros e coordenadores leem, criam e movem tarefas do projeto; so o criador ou um
  coordenador exclui. Os responsaveis mudam pela RPC `set_task_assignees`.
- O Dashboard mostra "Minhas tarefas": so as atribuidas a quem esta logado, de todos os projetos.

Impressoes: toda reserva nova pertence a um projeto. As RPCs `create_printer_booking` e
`update_printer_booking` recebem `p_project_id` e gravam `project_name` como copia do nome. O
coordenador pode escolher qualquer projeto em aberto (`planning`, `active` ou `paused`); o pesquisador,
so projetos em aberto de que e membro. Erros: `project_required` e `project_not_available`. Ao editar,
manter o projeto atual da reserva e sempre permitido, mesmo que ele tenha sido concluido depois.

### 3.14 Equipamentos e tipos

Finalidade: o laboratorio tem mais que impressoras, e todo equipamento pode ser reservado por horario.

- `equipment_types`: `name` (unico sem diferenciar maiusculas), `uses_material`, `is_active`. Vem com
  Impressora 3D (`uses_material = true`), Scanner 3D, Cortadora a laser, Bancada e ferramentas e
  Computador; o coordenador cadastra outros. Qualquer usuario ativo le.
- `equipment`: ganha `type_id` (obrigatorio, `RESTRICT`) e `asset_tag` (patrimonio ou identificacao,
  opcional). Os equipamentos que ja existiam ficaram como Impressora 3D.
- `equipment_materials`: compatibilidade de material, so faz sentido para tipos que usam material.
- `equipment_bookings.material_id` passou a ser anulavel. `create_booking` e `update_booking` exigem
  material (`material_required`) e compatibilidade (`incompatible_material`) apenas quando o tipo do
  equipamento usa material; para os demais, o material e ignorado e gravado como nulo.
- Ordem dos parametros: `create_booking(p_equipment_id, p_project_id, p_starts_at,
  p_estimated_duration_minutes, p_material_id, p_notes)`; `update_booking` acrescenta `p_booking_id` no
  inicio. Erros novos: `equipment_unavailable` e `equipment_not_found` (antes `printer_*`).

### 3.15 Inventario de insumos

Finalidade: saber que rolos existem, quanto resta de cada um e de quem sao. Os MVP anteriores tratavam
`materials` so como catalogo tecnico; agora ele continua sendo o catalogo (o que e: PLA, PETG, resina) e
cada unidade fisica (um rolo de filamento, um frasco de resina) e um item de estoque, guardado em `material_spools`.

- `materials`: ganha `category` (`material_category`: `filament`, `resin`, `powder`, `other`) e `unit`
  (`g` ou `ml`). O coordenador edita e arquiva materiais.
- `material_spools`: `material_id`, `color_name`, `color_hex`, `manufacturer`, `diameter_mm`,
  `lot_number`, `initial_amount`, `current_amount` (de 0 ate o inicial), `status` (`spool_status`:
  `sealed`, `in_use`, `empty`, `discarded`), `project_id` (nulo = estoque geral do laboratorio),
  `storage_location`, `opened_on`, `last_dried_on`, `notes`, `created_by`. O trigger
  `sync_spool_status` marca o rolo como `empty` ao chegar a zero e como `in_use` quando um rolo lacrado
  perde peso. Nao ha exclusao: rolos acabados ficam `empty` ou `discarded`.
- Acesso (RLS): qualquer usuario ativo le o inventario; so o coordenador cadastra e edita rolos.
- `equipment_bookings.spool_id` (opcional) e `consumed_amount`. `create_booking` e `update_booking`
  recebem `p_spool_id` (ultimo parametro) e so o aceitam para equipamentos cujo tipo usa material. O
  rolo precisa ser do material da reserva e do projeto da reserva ou do estoque geral; um rolo novo
  tambem precisa estar `sealed` ou `in_use` e ter saldo. Erro: `spool_not_available`.
- `record_booking_usage(p_booking_id, p_amount)`: coordenador ou dono da reserva informa quanto foi
  usado (reserva em andamento, concluida ou com falha). O valor e abatido do rolo; chamar de novo corrige
  (devolve o anterior antes de aplicar o novo) e o valor e limitado ao que o rolo ainda tem. Erros:
  `usage_not_allowed`, `booking_without_spool` e `invalid_amount`.

### 3.16 Manutencao do equipamento

Ninguem sabe quando um reparo termina, entao a manutencao e um **estado**, nao um bloqueio com data. O
equipamento entra em manutencao agora e continua assim ate ser liberado; cada parada fica registrada.

- `equipment_maintenance`: `equipment_id`, `reason`, `notes`, `expected_return_on` (previsao, apenas
  informativa), `started_at`, `started_by`, `ended_at` (nulo enquanto aberta), `ended_by` e
  `resolution_notes`. Um indice unico parcial garante **no maximo um episodio aberto por equipamento**.
  Leitura para qualquer usuario ativo; escrita so pelas RPCs.
- `start_equipment_maintenance(p_equipment_id, p_reason, p_notes, p_expected_return_on,
  p_cancel_bookings)`: coordenador ou responsavel pela manutencao (`private.can_maintain()`). Cria o episodio, muda `equipment.status` para `maintenance` e,
  com `p_cancel_bookings`, cancela as reservas `pending` e `approved` que ainda nao comecaram (as em
  andamento ficam). Erros: `maintainer_required`, `reason_required`, `maintenance_already_open`,
  `equipment_not_found`.
- `end_equipment_maintenance(p_equipment_id, p_notes)`: coordenador ou responsavel pela manutencao. Fecha o episodio, resolve os chamados `in_progress` do equipamento e volta o
  equipamento para `active`. Um equipamento posto em `maintenance` a mao, sem episodio, tambem e
  liberado. Erro: `not_in_maintenance`.
- Novas reservas continuam bloqueadas porque as funcoes de reserva so aceitam equipamento `active`.
- A tabela `maintenance_blocks` (bloqueio com data, secao 3.12) continua existindo e sendo respeitada
  pelas reservas, mas o app deixou de cria-la.

### 3.17 Feedback (sugestoes e erros)

Finalidade: qualquer pessoa do laboratorio envia uma sugestao ou um erro; a coordenacao le e trata.

- `feedback_reports`: `kind` (`feedback_kind`: `suggestion`, `bug`, `other`), `message` (3 a 4000
  caracteres), `page_path` e `user_agent` (a pagina e o navegador de quem enviou, capturados pelo app, ate
  500 caracteres), `status` (`feedback_status`: `new`, `seen`, `planned`, `done`, `dismissed`),
  `coordinator_note` (nota interna), `created_by` (`ON DELETE SET NULL`), timestamps.
- Acesso (RLS): usuario ativo insere em seu proprio nome, sempre como `new` e sem nota; cada pessoa le o
  que enviou; coordenador le e atualiza tudo (situacao e nota). Ninguem exclui.

### 3.18 Chamados de manutencao

Finalidade: qualquer pessoa avisa que um equipamento tem problema; os responsaveis pela manutencao
iniciam a manutencao e resolvem.

- `profiles.is_maintainer` (boolean, padrao `false`): marca quem faz manutencao. So o coordenador altera
  (RLS de `profiles`). `private.can_maintain()` e verdadeira para perfil ativo que seja coordenador ou
  responsavel pela manutencao.
- `maintenance_requests`: `equipment_id` (`ON DELETE RESTRICT`), `requested_by` (`ON DELETE SET NULL`),
  `description` (3 a 2000 caracteres), `urgency` (`maintenance_urgency`: `low`, `normal`, `urgent`),
  `status` (`maintenance_request_status`: `open`, `in_progress`, `waiting_part`, `resolved`, `cancelled`), `assigned_to`,
  `resolution_notes`, `resolved_at`, timestamps.
- Acesso (RLS): usuario ativo le todos (evita chamado duplicado) e insere em seu nome, sempre `open` e sem
  responsavel. Nao ha `update` direto: mudancas de situacao so pela RPC.
- `set_maintenance_request_status(p_request_id, p_status, p_resolution_notes, p_assigned_to)`: coordenador
  ou responsavel faz qualquer transicao (assumir atribui a quem chamou, ou a `p_assigned_to` se for
  responsavel; devolver limpa o responsavel; resolver grava nota e `resolved_at`); quem abriu so cancela
  enquanto `open`. `cancelled` e definitivo. Erros: `maintainer_required`, `request_not_found`,
  `invalid_request_transition`, `invalid_assignee`.
- `waiting_part` (Aguardando peca): o chamado espera uma peca. Um gatilho em `purchase_requests`
  (`purchase_requests_sync_maintenance_request`, via `private.sync_request_waiting_part`) coloca o chamado
  `open` ou `in_progress` em `waiting_part` quando uma compra ligada a ele passa a `purchased` (comprada e ainda
  nao entregue) e o devolve (`in_progress` se tem responsavel, senao `open`) quando essa compra deixa de ser
  `purchased` (entregue ou compra desfeita), sem desfazer o que um responsavel marcou a mao. Quem trata o chamado
  tambem alterna `in_progress` <-> `waiting_part` em `set_maintenance_request_status`. A situacao do equipamento
  nao muda; liberar o equipamento (`end_equipment_maintenance`) resolve tambem os chamados `waiting_part`.
- `photo_paths` (ate 3 caminhos): fotos no bucket privado `maintenance-photos`, uma pasta por autor
  (`<profile_id>/<arquivo>.jpg`, ate 5 MB; jpeg, png ou webp). Usuario ativo envia na propria pasta e le todas
  (o app usa URLs assinadas de 1 hora). O app reduz a foto a 1600 px antes de enviar.
- Gatilho `maintenance_requests_block_on_urgent` (apos insert): chamado `urgent` em equipamento `active`
  muda o status para `stopped` (Parado), sem abrir episodio de manutencao. O equipamento deixa de aceitar
  novas reservas (as funcoes de reserva so aceitam `active`) e as reservas futuras nao sao canceladas.
- Migration `20260909_equipment_stopped_status`: novo valor `stopped` em `equipment_status`. Em
  `set_maintenance_request_status`, passar o chamado para `in_progress` ("Iniciar manutencao") coloca o
  equipamento `active` ou `stopped` em `maintenance` e abre o episodio (motivo `Chamado urgente: ...` ou
  `Chamado: ...`); cancelar ou resolver o ultimo chamado urgente de um equipamento `stopped` o devolve a
  `active`. `end_equipment_maintenance` tambem libera um equipamento `stopped`.

### 3.19 Compras

Finalidade: um membro de projeto pede uma compra (item, link, valor estimado) e a coordenacao aprova,
compra e confirma a entrega.

- `purchase_requests`: `project_id` (`ON DELETE RESTRICT`; nulo = pedido para o **estoque geral** do laboratorio, como os itens do inventario), `requested_by` (`ON DELETE SET NULL`), `item`
  (2 a 200 caracteres), `url` (opcional, so `http`/`https`, ate 2000), `quantity` (1 a 100000),
  `estimated_amount` (total estimado em reais), `funding_category` (rubrica: `capital`, `custeio`,
  `passagens`, `diarias`, `reserva_tecnica` ou `outros`, nunca `bolsas`; obrigatoria em pedido novo, vazia nos anteriores a
  `20260912`), `urgency` (`purchase_urgency`: `low`, `normal` padrao ou `urgent`), `notes` (ate 1000), `status` (`purchase_status`:
  `requested`, `approved`, `rejected`, `purchased`, `delivered`, `cancelled`), `decided_by`, `decided_at`,
  `rejected_reason`, `actual_amount` (valor pago), `purchased_at`, `delivered_at`, timestamps.
- Fluxo: `requested -> approved -> purchased -> delivered`; `requested -> rejected | cancelled`;
  `approved -> cancelled`. O coordenador tambem volta uma etapa para corrigir enganos:
  `delivered -> purchased -> approved -> requested`, `rejected -> requested` e `cancelled -> requested`; voltar
  apaga o que a etapa gravou (data de entrega; valor pago e data da compra; decisao e motivo da recusa).
- Acesso (RLS): le quem pediu, os membros do projeto e o coordenador. Insere quem for membro de um projeto
  em aberto (`planning`, `active` ou `paused`) ou o coordenador; para o estoque geral (sem projeto), qualquer
  usuario ativo, e so o autor e o coordenador enxergam o pedido (`private.can_request_purchase`), sempre em
  nome proprio, como `requested` e sem campos de decisao. Nao ha `update` nem `delete` diretos.
- `update_purchase_request(p_request_id, p_item, p_url, p_quantity, p_estimated_amount, p_notes)`: quem
  pediu (ou o coordenador) edita enquanto o pedido esta `requested`. Erros: `purchase_not_found`,
  `purchase_forbidden`, `purchase_not_editable`, `project_not_available`. Tambem move o pedido para outro projeto
  ou para o estoque geral (`p_set_project` + `p_project_id`, nulo = estoque geral), desde que o autor possa
  pedir para o destino (`private.can_request_purchase`).
- `set_purchase_status(p_request_id, p_status, p_reason, p_actual_amount)`: o coordenador aprova, recusa (com
  motivo opcional), marca como comprado (`actual_amount`, padrao o valor estimado) e entregue; quem pediu so
  cancela enquanto `requested`. Erros: `coordinator_required`, `invalid_purchase_transition`,
  `purchase_not_found`.
- `maintenance_request_id` (opcional, `ON DELETE SET NULL`): o pedido de uma peca feito a partir de um chamado de
  manutencao; o chamado lista as pecas pedidas (as que a pessoa pode ver) e a compra mostra para que equipamento e.
- `for_maintenance` (boolean, padrao `false`): gasto de manutencao (pecas, reparos), independente da rubrica, para
  acompanhar quanto se gasta com manutencao. Um gatilho (`private.purchase_maintenance_flag`) forca `true` quando
  `maintenance_request_id` esta preenchido; nos demais pedidos o autor marca enquanto o pedido esta `requested`
  (`p_for_maintenance` em `update_purchase_request`; nulo mantem o valor atual).
- A tabela esta na publicacao `supabase_realtime` (aviso ao coordenador).

## 4. Relacionamentos principais

- `profiles.id` e igual a `auth.users.id`.
- `profiles` armazena papel de acesso e dados de perfil.
- `invitations.invited_by` aponta para o coordenador que criou o convite.
- `invitations.accepted_by` aponta para o perfil criado ou associado no aceite.
- `profiles` tem relacao N:N com `skills` por meio de `profile_skills`.
- `profiles` tem relacao N:N com `languages` por meio de `profile_languages`.
- `profiles` tem relacao 1:N com `availability_slots`.
- `printers` tem relacao N:N com `materials` por meio de `printer_materials`.
- `profiles` tem relacao 1:N com `printer_bookings`.
- `printers` tem relacao 1:N com `printer_bookings`.
- `materials` tem relacao 1:N com `printer_bookings`.
- `printers` tem relacao 1:N com `maintenance_blocks`.

## 5. Regras de integridade e conflito

Todo intervalo de reserva ou manutencao deve respeitar:

```text
starts_at < ends_at
```

A regra de sobreposicao entre intervalos deve ser:

```text
starts_at < existing.ends_at AND ends_at > existing.starts_at
```

Reservas ativas da mesma impressora nao podem se sobrepor. Para fins de conflito, reservas ativas sao aquelas com status:

- `pending`
- `approved`
- `in_progress`

Reservas com os status abaixo nao bloqueiam novos horarios:

- `cancelled`
- `completed`
- `failed`

Regras obrigatorias:

- novas reservas nao podem sobrepor reservas ativas da mesma impressora;
- novas reservas nao podem sobrepor bloqueios de manutencao da mesma impressora;
- bloqueios de manutencao nao podem sobrepor reservas ativas da mesma impressora;
- manutencao nao pode coexistir com reservas ativas no mesmo periodo;
- material escolhido na reserva deve existir em `printer_materials` para a impressora selecionada;
- impressoras `disabled`, `unavailable` ou `maintenance` nao devem aceitar novas reservas;
- impressoras `disabled` permanecem disponiveis para historico, mas nao para novas reservas.

Estrategia preferencial para o MVP: a prevencao de conflito deve ser garantida no banco por funcao transacional/RPC no Supabase/PostgreSQL, nao apenas no frontend. A funcao deve validar conflitos com `printer_bookings` ativos e `maintenance_blocks` da mesma impressora antes de inserir ou alterar uma reserva.

Melhoria futura: uma constraint de exclusao com ranges pode substituir ou complementar a funcao transacional, mas nao e obrigatoria para o MVP inicial.

## 6. Estrategia geral de Row Level Security

Esta secao descreve a estrategia de RLS em nivel conceitual. Nenhuma politica SQL deve ser criada nesta etapa.

Regras gerais:

- Apenas usuarios autenticados podem acessar dados do sistema.
- Usuarios autenticados sem `profile` valido nao devem acessar areas internas do sistema.
- `auth.uid()` deve ser comparado a `profiles.id` para identificar o usuario atual.
- Permissoes administrativas devem consultar `profiles.role = 'coordinator'`.
- Pesquisadores nao podem alterar o proprio `role`.

Leitura:

- Usuarios autenticados podem ler perfis basicos ativos necessarios para agenda, habilidades e organizacao do laboratorio.
- Usuarios autenticados podem ler habilidades, idiomas de perfis ativos, disponibilidade, impressoras consultaveis, materiais e agendas de impressoras.
- Reservas historicas podem ser consultadas conforme necessidade operacional, preservando dados sensiveis fora do MVP.

Escrita por pesquisadores:

- Pesquisadores podem editar apenas o proprio perfil, exceto o campo `role`.
- Pesquisadores podem gerenciar apenas as proprias habilidades.
- Pesquisadores podem gerenciar apenas os proprios idiomas.
- Pesquisadores podem gerenciar apenas a propria disponibilidade.
- Pesquisadores podem criar reservas apenas para si mesmos.
- Pesquisadores podem cancelar apenas reservas proprias em status permitido.

Escrita por coordenadores:

- Coordenadores podem criar e gerenciar convites.
- Coordenadores podem gerenciar perfis, respeitando restricoes de integridade.
- O catalogo de idiomas fica reservado para o pos-MVP.
- Coordenadores podem gerenciar impressoras, materiais e compatibilidades.
- Coordenadores podem criar e gerenciar bloqueios de manutencao.
- Coordenadores podem editar ou cancelar reservas de qualquer pesquisador.

## 7. Seeds iniciais recomendados

Seeds recomendados para ambiente inicial:

- perfil inicial de coordenador associado a um usuario real do Supabase Auth;
- habilidades iniciais comuns do laboratorio;
- materiais tecnicos iniciais, como PLA, PETG, PA, TPU, ABS e resina, se aplicavel;
- impressoras iniciais do laboratorio, se a lista ja estiver disponivel;
- compatibilidades iniciais entre impressoras e materiais.

Seeds de teste podem incluir o estado de auditoria de convites, mas tokens de Auth nunca devem ser persistidos no schema publico.

## 8. Testes e validacoes futuras

Validacoes cobertas pelos testes de banco do MVP:

- criar perfil apenas quando `profiles.id` corresponder a `auth.users.id`;
- impedir aceite de convite expirado, aceito, revogado ou associado a outro usuario/email;
- impedir convite pendente duplicado para o mesmo email;
- impedir disponibilidade com `weekday` fora de `0..6`;
- impedir disponibilidade com horario inicial maior ou igual ao horario final;
- impedir habilidade duplicada para o mesmo perfil;
- validar `nationality_country_code` com dois caracteres ISO 3166-1 alpha-2;
- impedir material duplicado para a mesma impressora;
- impedir reserva com material incompativel;
- impedir reserva sobre reserva ativa;
- impedir reserva sobre bloqueio de manutencao;
- impedir bloqueio de manutencao sobre reserva ativa;
- impedir novas reservas em impressoras `maintenance`, `unavailable` ou `disabled`;
- confirmar que impressora `disabled` nao aparece para nova reserva, mas reservas historicas continuam consultaveis.

## 9. Assumptions fechadas

- `profiles.id` sera igual a `auth.users.id`.
- O sistema nao tera cadastro publico aberto.
- Convites usarao email, usuario do Auth, status e expiracao; o Supabase Auth gerencia o token.
- Token ou hash de convite nunca sera salvo no schema publico.
- Convites terao expiracao obrigatoria via `expires_at`.
- Antes do perfil, o sistema validara usuario do Auth, status, expiracao e email obtido do JWT.
- Contas no Supabase Auth so poderao gerar `profile` quando houver convite valido.
- O `profile` criado no aceite deve herdar ou validar o email do convite.
- Usuarios sem `profile` valido nao acessam areas internas do sistema.
- `weekday` sera inteiro de `0` a `6`.
- Disponibilidade semanal referencia um turno de `lab_schedule_periods` e tem `work_mode`; `starts_at` e `ends_at` sao derivados do turno.
- Reservas e bloqueios usarao `starts_at timestamptz` e `ends_at timestamptz`.
- `estimated_duration_minutes` sera obrigatorio em `printer_bookings` no MVP.
- Novas reservas comecam como `pending` ou `approved` conforme a exigencia de aprovacao do perfil.
- Manutencao nao pode coexistir com reservas ativas no mesmo periodo.
- A estrategia preferencial inicial de conflito sera funcao transacional/RPC no Supabase/PostgreSQL.
- Uma exclusion constraint com `tstzrange` impede sobreposicoes de reservas ativas mesmo fora da RPC.
- Materiais serao catalogo tecnico simples no MVP, sem controle de estoque.
- `materials` continua sendo usado por `printer_materials` e `printer_bookings`.
- Cadastro de rolos, lotes fisicos, fabricante, cor, peso e secagem fica fora do MVP.
- Impressoras `disabled` nao aparecem para novas reservas, mas permanecem no historico.
- O MVP registra nacionalidade ou pais principal em `nationality_country_code`, nao residencia ou instituicao.
- Idiomas indicam apenas quais idiomas a pessoa fala.
- Idiomas, `profile_languages` e `proficiency_level` ficam reservados para o pos-MVP.
- Idiomas nao sao habilidades tecnicas e nao entram em `skills`.
- Nao havera upload `.gcode` ou `.3mf` no schema do MVP.
- Nao havera historico detalhado de manutencao alem dos bloqueios.
- A baseline inicial (`20260818`) e imutavel; mudancas de schema entram em migrations incrementais (hoje ate `20260920`).

## 10. Inventario de insumos

O controle de estoque que esta secao previa como evolucao futura (`material_inventory`) foi implementado
como `material_spools` e descrito na secao 3.15. Ficam para o futuro: custo e compra de insumos,
alertas por e-mail de estoque baixo e controle de secagem automatico.
