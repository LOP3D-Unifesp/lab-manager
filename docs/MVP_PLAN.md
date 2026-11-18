# MVP Plan - LO&P3D Lab Manager

Legenda: **Concluída** (implementada), **Parcial** (há itens pendentes, listados) e **Futura**.
Pendências detalhadas em [PENDENCIAS.md](PENDENCIAS.md).

## Fase 1 - Base do sistema — Concluída

- Projeto React + Vite + TypeScript, Tailwind CSS e Supabase configurados.
- Layout principal e páginas: Dashboard, Pesquisadores, Habilidades, Agenda do Laboratório,
  Impressoras, Reservas e Administração.

## Fase 2 - Usuários e perfis — Concluída

- Autenticação, tabela de perfis e papéis de coordenador e pesquisador.
- Edição do próprio perfil e cadastro de vínculo acadêmico.
- Além do planejado: foto de perfil, Lattes, bolsas de fomento, carga horária (bolsista ou
  voluntário) e dados pessoais isolados.

## Fase 3 - Habilidades e disponibilidade — Parcial

- Concluído: cadastro de habilidades; pesquisadores associam habilidades ao próprio perfil;
  disponibilidade semanal por turno (presencial, home office ou aula) com capacidade presencial;
  visualização de quem estará no laboratório na Agenda do Laboratório.
- **Pendente:** busca por habilidade. A lista de Pesquisadores filtra apenas por vínculo e não exibe
  as habilidades de cada pessoa (`src/lib/pesquisadores.ts` ainda devolve `habilidades: []`).

## Fase 4 - Impressoras — Concluída

- Cadastro de impressoras e de materiais, compatibilidade entre eles e tela de visualização.
- Bloqueios de manutenção por impressora.

## Fase 5 - Reservas — Concluída (e estendida)

- Reserva manual com projeto, material, data, horário inicial e duração; cálculo do horário final;
  prevenção de conflito (também sob concorrência); cancelamento da própria reserva; gestão pelo
  coordenador.
- Além do planejado: aprovação opcional, rejeição com motivo, ciclo de vida (em andamento,
  concluída, falhou), regra de início até 1 hora antes do horário, alerta em tempo real de reservas
  pendentes, telas Minhas reservas e Histórico de reservas.

## Fase 6 - Operação e entrega — Concluída

Itens que não estavam no plano inicial e foram necessários para operar o sistema:

- Wizard de instalação e configurações do laboratório (capacidade, dias, turnos, intervalos, fuso).
- Convites por e-mail (papel, 72 horas, aceite explícito, reenvio e revogação) e área Usuários.
- Aviso de privacidade e descarte automático de identidades incompletas.
- Ambiente local com Docker e ambiente de teste na nuvem (GitHub Pages + Supabase).
- CI (GitHub Actions) com testes unitários, de banco e de concorrência.

## Fase 7 - Pós-MVP — Futura

- Upload de .gcode e .3mf.
- Extração automática de metadados de .gcode.
- Sugestão automática de horários.
- Relatórios de uso.
