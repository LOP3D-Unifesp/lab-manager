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
- convidar pessoas como pesquisador ou coordenador (convite válido por 72 horas, com reenvio e revogação);
- gerenciar usuários e decidir, por pesquisador, se as reservas exigem aprovação;
- configurar o laboratório (capacidade presencial, dias de funcionamento, turnos, intervalos de almoço e jantar e fuso horário);
- cadastrar e editar impressoras;
- cadastrar materiais;
- bloquear horários de manutenção;
- visualizar todas as agendas;
- aprovar ou rejeitar reservas pendentes e acompanhar o ciclo operacional (iniciar, concluir ou marcar como falha);
- editar ou cancelar reservas, quando necessário.

### Pesquisador

Pode:
- aceitar o convite (confirmação explícita) e completar seu perfil;
- editar seu próprio perfil, incluindo foto, Lattes, bolsas de fomento e carga horária;
- cadastrar sua disponibilidade;
- cadastrar suas habilidades;
- visualizar a agenda dos pesquisadores;
- visualizar a agenda das impressoras;
- reservar impressoras;
- cancelar ou editar suas próprias reservas enquanto estiverem pendentes ou aprovadas.

## 4. Vínculo acadêmico

O pesquisador pode ter um vínculo acadêmico ou institucional, mas isso não altera suas permissões.

Opções:
- IC
- Extensão
- Estagiário
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
- busca por habilidade (prevista; ainda não implementada, veja [PENDENCIAS.md](PENDENCIAS.md));
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
- informar material, duração estimada e projeto (escolhido na lista de projetos; o pesquisador só vê os projetos em aberto de que participa, o coordenador vê todos);
- anexar arquivo .gcode ou .3mf em fase futura;
- acompanhar status da reserva;
- aprovação opcional pelo coordenador, com alerta em tempo real de reservas pendentes.

### 5.4 Módulo de projetos

Funcionalidades:
- coordenador cadastra projetos (nome, descrição, situação e período);
- coordenador inclui pesquisadores em cada projeto; um pesquisador pode participar de vários;
- cada projeto tem zero ou vários fomentos (FAPESP, CNPq, FINEP, Embrapii ou outra agência
  cadastrada), com número do processo, vigência e valor concedido por rubrica (capital, custeio,
  bolsas, reserva técnica);
- o pesquisador vê apenas os projetos de que participa;
- kanban de tarefas em cada projeto (A fazer, Em andamento, Em revisão, Concluído), com prazo e um ou
  mais responsáveis, que precisam ser membros do projeto; membros criam e movem tarefas;
- no Dashboard, "Minhas tarefas" mostra só as tarefas atribuídas à pessoa, de todos os projetos, e permite criar e editar tarefas sem sair da página (a tarefa nova já vem atribuída a quem criou);
- em Projetos, a vista "Quadro de tarefas" reúne as tarefas de todos os projetos que a pessoa vê (coordenador: todos), com filtros por projeto, responsável e atrasadas;
- toda nova impressão fica vinculada a um projeto; reservas anteriores mantêm o nome em texto livre.

## 6. Status de reserva

- Pendente
- Aprovada
- Rejeitada (com motivo opcional)
- Em andamento
- Concluída
- Cancelada
- Falhou

Política de aprovação: cada pesquisador tem a configuração "exige aprovação" (ligada por padrão, o
coordenador altera em **Usuários**). Reservas de pesquisadores com a configuração ligada nascem
**Pendentes**; as de coordenadores ou de pesquisadores sem a configuração nascem **Aprovadas**.
Reservas pendentes, aprovadas e em andamento bloqueiam o horário. "Em andamento", "Concluída" e
"Falhou" só podem ser registradas a partir de 1 hora antes do horário da reserva.

## 6.1 Perfil, bolsas e carga horária

O perfil guarda vínculo acadêmico, Lattes, nacionalidade, contato, biografia e foto. A pessoa é
**bolsista** ou **voluntária**: bolsistas cadastram uma ou mais bolsas de fomento (agência, nome,
horas semanais e valor mensal) e a carga horária semanal é a soma das horas das bolsas; voluntários
informam a carga manualmente (1 a 60 horas). Dados pessoais sensíveis (CPF, RG, nascimento e
endereço) ficam isolados e visíveis só ao próprio usuário e ao coordenador.

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