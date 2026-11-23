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

### 5.2 Módulo de equipamentos

Funcionalidades:
- cadastro de equipamentos pelo coordenador, com tipo (impressora 3D, scanner, cortadora a laser,
  ferramentas, computador ou outro tipo cadastrado), modelo, patrimônio, local e situação;
- cadastro de materiais;
- definição de compatibilidade entre impressora e material (só para tipos que usam material);
- visualização da agenda dos equipamentos;
- reserva de qualquer equipamento por horário; o material só é pedido para impressoras;
- manutenção como estado do equipamento: o coordenador coloca em manutenção (sem data de fim, com previsão de volta opcional) e libera depois; início e fim ficam no histórico.

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

### 5.5 Módulo de inventário

Funcionalidades:
- página Inventário com as abas **Estoque** e **Materiais**;
- cada item de estoque (um rolo de filamento, um frasco de resina...) tem material, cor, fabricante, quantidade
  inicial e atual, local e dono: um projeto ou o estoque geral do laboratório; filtros por material, dono, situação e "pouco restante" (até 20%);
- o coordenador cadastra itens, ajusta a quantidade depois de medir e marca itens vazios;
- o catálogo de materiais é editável (categoria, unidade em g ou ml, arquivar);
- na reserva de uma impressora, o campo opcional **Item do estoque** lista só os itens do material escolhido que são do
  projeto da reserva ou do estoque geral;
- ao concluir uma impressão com item de estoque, o app pergunta quanto foi usado e abate do item;
- a aba **Insumos** do projeto mostra os itens do projeto e o total consumido por material.

### 5.6 Caixa de sugestões e erros

Funcionalidades:
- botão **Feedback** em todas as telas (canto da tela no desktop; "Enviar feedback" no menu da conta no
  celular), com tipo (erro, sugestão ou outro) e mensagem; a página em que a pessoa está é enviada junto;
- página **Feedback** (coordenador, grupo Gestão) com busca e filtros por tipo e situação, mudança de
  situação (nova, vista, planejada, resolvida, descartada) e nota interna;
- contador de mensagens novas no item do menu do coordenador.

### 5.7 Chamados de manutenção

Funcionalidades:
- o coordenador marca em **Usuários** quem é **responsável pela manutenção**; essas pessoas e o coordenador tratam os chamados e podem colocar equipamentos em manutenção e liberá-los;
- qualquer pessoa usa **Reportar problema** no card do equipamento (descrição e urgência baixa, normal ou urgente) e vê se já existe chamado aberto;
- a aba **Chamados** em Equipamentos lista a fila (urgentes e mais antigos primeiro), com filtros por tipo de equipamento (lembrado para a próxima visita), equipamento, situação e "só os meus", e **ordenação** por prioridade (padrão), mais recentes, mais antigos, equipamento (A–Z) ou situação (a escolha também é lembrada); responsáveis iniciam a manutenção (o equipamento entra em manutenção), devolvem à fila, resolvem (com nota do que foi feito), reabrem ou cancelam; quem abriu só cancela enquanto o chamado está aberto;
- o chamado aceita até 3 fotos (tirar na hora, com a câmera do celular ou a webcam do computador, ou anexar), que ficam visíveis na fila e abrem num visualizador em tela cheia, com zoom (botões, roda do mouse, duplo clique ou pinça), arrasto e navegação entre as fotos;
- chamado **urgente** deixa o equipamento **Parado** na hora (novas reservas deixam de ser aceitas, as futuras não são canceladas); ele só entra em manutenção quando um responsável usa **Iniciar manutenção**, e volta a Ativa se o chamado for cancelado ou resolvido sem isso;
- **Baixar fotos** reúne as fotos do chamado num arquivo .zip;
- o Dashboard tem o bloco **Chamados de manutenção**, logo abaixo de "Minhas tarefas": **Para atender** (responsáveis: chamados abertos e os que assumiram) e **Que eu abri** (qualquer pessoa: os seus que seguem ativos); some quando não há nada;
- o card do equipamento mostra a situação numa caixa padronizada (título e um detalhe curto, igual para **Parado** e **Em manutenção**) e, abaixo, quem abriu cada chamado ativo (nome, data e início da descrição, até 2 chamados), sem repetir o que já está na caixa;
- liberar o equipamento da manutenção resolve os chamados que estavam em andamento; ao resolver um chamado, a caixa "Liberar o equipamento também" faz as duas coisas de uma vez;
- chamados abertos aparecem como contador no item Equipamentos do menu e na campainha, que se organiza em **Pendências** (chamados abertos, com quantos são urgentes, e feedback novo) e **Reservas**; para coordenadores e responsáveis pela manutenção;
- os contadores atualizam em tempo real (sem recarregar a página) e, se a pessoa ativar na campainha, o navegador mostra um **aviso no computador** quando alguém abre um chamado (ou envia feedback, para o coordenador) enquanto o app está em segundo plano; vale só com o app aberto numa aba

### 5.8 Compras

Funcionalidades:
- página **Compras** (grupo Recursos) com o botão **Novo pedido**: projeto ou **Estoque geral do laboratório**, **rubrica** (capital, custeio, passagens, diárias, reserva técnica ou outros, a mesma lista dos fomentos do projeto), item, link (opcional, só http/https), quantidade, **valor unitário** (o app calcula o total estimado = unitário × quantidade e mostra na hora), **urgência** (baixa, normal ou urgente) e observações; o pedido de projeto só pode ser feito em projeto em aberto de que a pessoa participa (o coordenador, em qualquer projeto em aberto); o pedido para o estoque geral qualquer pessoa ativa pode fazer;
- fluxo **Solicitado → Aprovado → Comprado → Entregue**, ou **Recusado** (com motivo) e **Cancelado**; o coordenador aprova, recusa, marca como comprado (informando o valor pago) e como entregue; quem pediu edita (inclusive trocando o projeto ou levando o pedido para o estoque geral) e cancela enquanto ninguém decidiu; o coordenador também **desfaz** cada etapa (desfazer entrega, desfazer compra, voltar para solicitado, reabrir pedido recusado ou cancelado) para corrigir enganos, com confirmação;
- cada pedido é visível para quem pediu, para os membros do projeto e para o coordenador (pedido do estoque geral: só quem pediu e o coordenador);
- a lista mostra primeiro os pedidos que esperam decisão e, dentro de cada etapa, os urgentes antes dos demais; pedidos urgentes ou de baixa urgência ganham uma etiqueta enquanto estão em andamento;
- filtros por situação (padrão: em andamento), projeto, rubrica e "só os meus pedidos"; **Resumo por projeto** com o previsto (ainda não comprado) e o pago (comprado e entregue);
- o link do item abre em outra aba, sem repassar a origem da página;
- o coordenador vê o contador de pedidos aguardando aprovação no item Compras do menu e em **Pendências** na campainha (com quantos são urgentes), e recebe aviso no computador quando chega um pedido novo ("Pedido de compra urgente" quando for o caso);
- quem pediu é avisado das decisões sobre os próprios pedidos (aprovado, recusado com o motivo, comprado, entregue): selo no item Compras do menu, seção **Seus pedidos de compra** na campainha (a novidade fica marcada como "novo" enquanto o painel está aberto) e aviso no computador, em tempo real; o selo some ao abrir a campainha ou a página Compras.

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