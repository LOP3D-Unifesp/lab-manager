# MVP Plan - LO&P3D Lab Manager

## Fase 1 - Base do sistema

- Criar projeto React + Vite + TypeScript.
- Configurar Tailwind CSS.
- Configurar Supabase.
- Criar layout principal.
- Criar páginas iniciais:
  - Dashboard
  - Pesquisadores
  - Habilidades
  - Agenda do Laboratório
  - Impressoras
  - Reservas
  - Administração

## Fase 2 - Usuários e perfis

- Implementar autenticação.
- Criar tabela de perfis.
- Diferenciar papéis: coordenador e pesquisador.
- Permitir edição do próprio perfil.
- Permitir cadastro de vínculo acadêmico.

## Fase 3 - Habilidades e disponibilidade

- Criar cadastro de habilidades.
- Permitir que pesquisadores associem habilidades ao próprio perfil.
- Permitir cadastro de disponibilidade semanal.
- Criar visualização de quem estará no laboratório por data.
- Criar busca por habilidade.

## Fase 4 - Impressoras

- Permitir que coordenador cadastre impressoras.
- Criar cadastro de materiais.
- Definir materiais compatíveis com cada impressora.
- Criar tela de visualização das impressoras.

## Fase 5 - Reservas

- Criar reserva manual de impressora.
- Informar projeto, material, data, horário inicial e duração.
- Calcular horário final.
- Evitar conflito com outras reservas.
- Permitir cancelamento da própria reserva.
- Permitir que coordenador gerencie todas as reservas.

## Fase 6 - Pós-MVP

- Upload de .gcode e .3mf.
- Extração automática de metadados de .gcode.
- Sugestão automática de horários.
- Relatórios de uso.
- Histórico de manutenção.