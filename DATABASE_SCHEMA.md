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

Convencoes gerais:

- Chaves primarias usam `uuid`.
- Campos de data/hora de eventos absolutos usam `timestamptz`.
- Campos de horario recorrente semanal usam `time`.
- Tabelas principais devem ter `created_at timestamptz` e `updated_at timestamptz`.
- Reservas canceladas ou finalizadas permanecem no historico.
- O documento nao define SQL, migrations ou politicas RLS finais.

## 2. Enums sugeridos

### `user_role`

Papeis de acesso do sistema.

- `coordinator`
- `researcher`

### `academic_affiliation`

Vinculo academico ou institucional do pesquisador. Nao altera permissoes.

- `ic`
- `extension`
- `tcc`
- `masters`
- `phd`
- `postdoc`
- `visitor`
- `technician`
- `faculty`
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
- `in_progress`
- `completed`
- `cancelled`
- `failed`

No MVP, novas reservas devem iniciar como `approved`, porque ainda nao havera fluxo de aprovacao manual. O status `pending` fica documentado para um fluxo futuro de aprovacao.

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
- `is_active`
- `created_at`
- `updated_at`

Campos opcionais:

- `academic_affiliation`
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
- `nationality_country_code` deve usar dois caracteres no padrao ISO 3166-1 alpha-2.
- `nationality_country_code` representa nacionalidade ou pais principal do pesquisador, nao residencia atual nem instituicao de vinculo.
- Pesquisadores nao podem alterar o proprio `role`.
- Perfis inativos nao devem ser tratados como pesquisadores disponiveis nas consultas operacionais.

### 3.2 `invitations`

Finalidade: registrar convites criados por coordenadores para entrada de pesquisadores no sistema.

Campos sugeridos:

| Campo | Tipo PostgreSQL | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `id` | `uuid` | Sim | Identificador do convite. |
| `email` | `text` | Sim | Email da pessoa convidada. |
| `token_hash` | `text` | Sim | Hash do token do convite. O token puro nunca deve ser salvo no banco. |
| `status` | `invitation_status` | Sim | Status do convite. |
| `invited_by` | `uuid` | Sim | Coordenador que criou o convite. |
| `accepted_by` | `uuid` | Nao | Perfil criado ao aceitar o convite. |
| `expires_at` | `timestamptz` | Sim | Data obrigatoria de expiracao. |
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
- `email`
- `token_hash`
- `status`
- `invited_by`
- `expires_at`
- `created_at`
- `updated_at`

Campos opcionais:

- `accepted_by`
- `accepted_at`

Indices recomendados:

- indice unico em `token_hash`;
- indice em `email`;
- indice composto em `email, status`;
- indice em `expires_at`;
- indice em `invited_by`.

Regras de integridade:

- O token puro nunca deve ser persistido.
- Todo convite deve ter expiracao obrigatoria em `expires_at`.
- Apenas convites `pending` e nao expirados podem ser aceitos.
- Convites aceitos nao podem ser reutilizados.
- Nao deve existir mais de um convite `pending` ativo para o mesmo email.
- `accepted_by` e `accepted_at` devem ser preenchidos quando o convite for aceito.
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
- O sistema deve evitar faixas duplicadas ou incoerentes para o mesmo pesquisador.
- A disponibilidade representa planejamento, nao confirmacao real de presenca.
- Pesquisadores so podem alterar a propria disponibilidade.

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
| `project_name` | `text` | Sim | Nome ou identificacao do projeto. |
| `starts_at` | `timestamptz` | Sim | Inicio da reserva. |
| `ends_at` | `timestamptz` | Sim | Fim calculado da reserva. |
| `estimated_duration_minutes` | `integer` | Nao | Duracao estimada informada ou derivada. |
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
- `status`
- `created_at`
- `updated_at`

Campos opcionais:

- `estimated_duration_minutes`
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
- No MVP, novas reservas devem iniciar com status `approved`.
- `pending` deve permanecer disponivel para fluxo futuro de aprovacao manual.
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

Observacao para migrations futuras: a prevencao de conflito deve ser garantida no banco, nao apenas no frontend. A implementacao pode usar constraint de exclusao com ranges ou funcao transacional, a ser definida na etapa de migrations.

## 6. Estrategia geral de Row Level Security

Esta secao descreve a estrategia de RLS em nivel conceitual. Nenhuma politica SQL deve ser criada nesta etapa.

Regras gerais:

- Apenas usuarios autenticados podem acessar dados do sistema.
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
- Coordenadores podem administrar o catalogo de idiomas.
- Coordenadores podem gerenciar impressoras, materiais e compatibilidades.
- Coordenadores podem criar e gerenciar bloqueios de manutencao.
- Coordenadores podem editar ou cancelar reservas de qualquer pesquisador.

## 7. Seeds iniciais recomendados

Seeds recomendados para ambiente inicial:

- perfil inicial de coordenador associado a um usuario real do Supabase Auth;
- habilidades iniciais comuns do laboratorio;
- idiomas iniciais: Portugues (`pt`), Espanhol (`es`), Ingles (`en`), Alemao (`de`), Frances (`fr`) e Italiano (`it`);
- materiais tecnicos iniciais, como PLA, PETG, PA, TPU, ABS e resina, se aplicavel;
- impressoras iniciais do laboratorio, se a lista ja estiver disponivel;
- compatibilidades iniciais entre impressoras e materiais.

Os seeds nao devem incluir tokens puros de convite. Caso convites sejam semeados em ambiente de teste, devem usar apenas `token_hash`.

## 8. Testes e validacoes futuras

Validacoes a cobrir quando migrations, policies e camada de aplicacao forem implementadas:

- criar perfil apenas quando `profiles.id` corresponder a `auth.users.id`;
- impedir aceite de convite expirado, aceito, revogado ou com token invalido;
- impedir convite pendente duplicado para o mesmo email;
- impedir disponibilidade com `weekday` fora de `0..6`;
- impedir disponibilidade com horario inicial maior ou igual ao horario final;
- impedir habilidade duplicada para o mesmo perfil;
- validar `nationality_country_code` com dois caracteres ISO 3166-1 alpha-2;
- impedir idioma duplicado para o mesmo perfil;
- impedir associacao nova com idioma inativo;
- confirmar que usuarios autenticados conseguem consultar idiomas de perfis ativos;
- confirmar que pesquisadores so alteram os proprios idiomas;
- confirmar que coordenadores administram o catalogo de idiomas;
- impedir material duplicado para a mesma impressora;
- impedir reserva com material incompativel;
- impedir reserva sobre reserva ativa;
- impedir reserva sobre bloqueio de manutencao;
- impedir bloqueio de manutencao sobre reserva ativa;
- impedir novas reservas em impressoras `maintenance`, `unavailable` ou `disabled`;
- confirmar que impressora `disabled` nao aparece para nova reserva, mas reservas historicas continuam consultaveis.

## 9. Assumptions fechadas

- `profiles.id` sera igual a `auth.users.id`.
- Convites usarao `email` e `token_hash`.
- Token puro de convite nunca sera salvo no banco.
- Convites terao expiracao obrigatoria via `expires_at`.
- `weekday` sera inteiro de `0` a `6`.
- Reservas e bloqueios usarao `starts_at timestamptz` e `ends_at timestamptz`.
- No MVP, novas reservas comecam como `approved`.
- `pending` fica reservado para fluxo futuro de aprovacao.
- Manutencao nao pode coexistir com reservas ativas no mesmo periodo.
- Materiais serao catalogo tecnico simples no MVP, sem controle de estoque.
- `materials` continua sendo usado por `printer_materials` e `printer_bookings`.
- Cadastro de rolos, lotes fisicos, fabricante, cor, peso e secagem fica fora do MVP.
- Impressoras `disabled` nao aparecem para novas reservas, mas permanecem no historico.
- O MVP registra nacionalidade ou pais principal em `nationality_country_code`, nao residencia ou instituicao.
- Idiomas indicam apenas quais idiomas a pessoa fala.
- Nao havera `proficiency_level` no MVP.
- `proficiency_level` fica reservado como evolucao futura em `profile_languages`.
- Idiomas nao sao habilidades tecnicas e nao entram em `skills`.
- Nao havera upload `.gcode` ou `.3mf` no schema do MVP.
- Nao havera historico detalhado de manutencao alem dos bloqueios.
- Nao havera migrations ou SQL nesta etapa.

## 10. Evolucao futura: controle de estoque de materiais

Esta secao documenta uma evolucao futura fora do MVP. Ela nao deve gerar migrations, SQL executavel ou implementacao nesta etapa.

No MVP, `materials` permanece como catalogo tecnico simples usado para compatibilidade com impressoras e reservas. O controle de estoque de rolos, lotes ou unidades fisicas pode ser modelado futuramente com uma tabela separada.

### Tabela futura `material_inventory`

Finalidade futura: representar rolos, lotes ou unidades fisicas de material, registrando dados operacionais como lote, fabricante, cor, peso, secagem e local de armazenamento.

Campos futuros sugeridos:

| Campo | Tipo PostgreSQL sugerido | Descricao |
| --- | --- | --- |
| `id` | `uuid` | Identificador do item de estoque. |
| `material_id` | `uuid` | Material tecnico associado em `materials.id`. |
| `lot_number` | `text` | Numero do lote informado pelo fabricante. |
| `opened_on` | `date` | Data de abertura do rolo, lote ou unidade fisica. |
| `manufacturer` | `text` | Fabricante do material. |
| `color` | `text` | Cor do material. |
| `initial_weight_grams` | `integer` | Peso inicial em gramas. |
| `current_weight_grams` | `integer` | Peso atual estimado em gramas. |
| `last_dried_on` | `date` | Data da ultima secagem. |
| `storage_location` | `text` | Local de armazenamento. |
| `status` | `text` | Estado operacional futuro, como disponivel, em uso, vazio, descartado ou indisponivel. |
| `description` | `text` | Observacoes adicionais do item fisico. |
| `created_at` | `timestamptz` | Data de criacao. |
| `updated_at` | `timestamptz` | Data da ultima atualizacao. |

Regras futuras sugeridas:

- `material_id` deve referenciar `materials.id`.
- Cada item pode representar um rolo, lote ou unidade fisica de material.
- `initial_weight_grams` e `current_weight_grams` devem ser positivos quando preenchidos.
- `current_weight_grams` nao deve exceder `initial_weight_grams`.
- `last_dried_on` registra a ultima secagem do item fisico.
- `status` podera indicar estados como disponivel, em uso, vazio, descartado ou indisponivel.
- Reservas poderao futuramente vincular opcionalmente um item especifico de `material_inventory`.
- Reservas poderao futuramente consumir saldo ou peso do item fisico.
- A regra atual do MVP permanece: o material escolhido na reserva deve existir em `printer_materials` para a impressora selecionada.
