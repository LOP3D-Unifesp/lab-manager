# PRD - LO&P3D Lab Manager

## 1. Visão geral

O LO&P3D Lab Manager é um sistema interno para organização da agenda de pesquisadores, disponibilidade no laboratório, habilidades técnicas e reservas de impressoras 3D do Laboratório de Órteses e Próteses 3D.

O sistema deve permitir que todos os usuários autenticados visualizem quem estará no laboratório, quais habilidades cada pesquisador possui e quais impressoras estão disponíveis para uso.

## 2. Objetivos

- Organizar a presença dos pesquisadores no laboratório.
- Facilitar a busca por pessoas com habilidades específicas.
- Centralizar a agenda das impressoras 3D.
- Evitar conflitos de reserva de impressoras.
- Permitir que o coordenador gerencie usuários, impressoras, materiais e bloqueios de manutenção.
- Futuramente, permitir upload de arquivos .gcode e .3mf para estimativa automática de impressão.

## 3. Perfis de usuário

O sistema terá dois papéis principais:

### Coordenador

Pode:
- convidar pesquisadores;
- gerenciar usuários;
- cadastrar e editar impressoras;
- cadastrar materiais;
- bloquear horários de manutenção;
- visualizar todas as agendas;
- editar ou cancelar reservas, quando necessário.

### Pesquisador

Pode:
- criar perfil a partir de convite;
- editar seu próprio perfil;
- cadastrar sua disponibilidade;
- cadastrar suas habilidades;
- visualizar a agenda dos pesquisadores;
- visualizar a agenda das impressoras;
- reservar impressoras;
- cancelar ou editar suas próprias reservas, conforme regra definida.

## 4. Vínculo acadêmico

O pesquisador pode ter um vínculo acadêmico ou institucional, mas isso não altera suas permissões.

Opções:
- IC
- Extensão
- TCC
- Mestrado
- Doutorado
- Pós-doc
- Visitante
- Técnico
- Docente
- Outro

## 5. Módulos do sistema

### 5.1 Módulo de pesquisadores

Funcionalidades:
- cadastro de perfil;
- cadastro de disponibilidade semanal;
- cadastro de habilidades;
- busca por habilidade;
- visualização de quem estará no laboratório em determinada data.

### 5.2 Módulo de impressoras

Funcionalidades:
- cadastro de impressoras pelo coordenador;
- cadastro de materiais;
- definição de compatibilidade entre impressora e material;
- visualização da agenda das impressoras;
- reserva de impressora;
- bloqueio de horários para manutenção.

### 5.3 Módulo de reservas

Funcionalidades:
- criar reserva;
- evitar conflito de horários;
- vincular reserva a uma impressora;
- informar material, duração estimada e projeto;
- anexar arquivo .gcode ou .3mf em fase futura;
- acompanhar status da reserva.

## 6. Status de reserva

- Pendente
- Aprovada
- Em andamento
- Concluída
- Cancelada
- Falhou

## 7. Status de impressora

- Ativa
- Em manutenção
- Indisponível
- Desativada

## 8. MVP inicial

O primeiro MVP deve conter:

- autenticação;
- perfis de usuário;
- papéis de coordenador e pesquisador;
- cadastro de disponibilidade;
- cadastro de habilidades;
- visualização da agenda dos pesquisadores;
- cadastro de impressoras;
- cadastro de materiais;
- agenda das impressoras;
- reserva manual de impressora;
- prevenção de conflito de horário.

Fora do MVP inicial:

- parser de .gcode;
- parser de .3mf;
- sugestão automática de horário;
- relatórios avançados;
- integração direta com impressoras.