# User Flows - LO&P3D Lab Manager

## 1. Objetivo do documento

Este documento descreve os fluxos funcionais do MVP do LO&P3D Lab Manager. O objetivo é registrar o comportamento esperado do sistema antes da implementação da autenticação, dos perfis, das agendas, das impressoras e das reservas.

O documento deve orientar a implementação funcional sem definir modelagem de banco, nomes de tabelas, regras de RLS, componentes React ou detalhes internos de infraestrutura.

## 2. Premissas gerais do MVP

- Todos os usuários que acessam informações do sistema devem estar autenticados.
- O sistema possui dois papéis principais: coordenador e pesquisador.
- O coordenador pode convidar pesquisadores, gerenciar impressoras, materiais, bloqueios de manutenção e reservas.
- O pesquisador pode criar e editar o próprio perfil, cadastrar habilidades, informar disponibilidade semanal, consultar agendas e criar reservas manuais.
- O pesquisador só pode gerenciar dados próprios, exceto nas consultas compartilhadas permitidas pelo sistema.
- A reserva de impressora no MVP é manual e deve conter impressora, projeto, material, data, horário inicial e duração estimada.
- O sistema deve impedir conflitos de horário para a mesma impressora.
- Upload de arquivos, parser de `.gcode`, parser de `.3mf`, sugestão automática de horário, relatórios avançados e integração direta com impressoras estão fora do MVP inicial.
- Status de reserva previstos: `Pendente`, `Aprovada`, `Em andamento`, `Concluída`, `Cancelada` e `Falhou`.
- Status de impressora previstos: `Ativa`, `Em manutenção`, `Indisponível` e `Desativada`.

## 3. Papéis envolvidos

**Coordenador:** usuário responsável pela administração operacional do laboratório. Pode convidar pesquisadores, gerenciar cadastros administrativos, bloquear impressoras para manutenção e editar ou cancelar reservas quando necessário.

**Pesquisador:** usuário convidado para usar o sistema. Pode manter seu perfil, informar habilidades e disponibilidade, consultar informações do laboratório e reservar impressoras conforme as regras do MVP.

**Usuário autenticado:** qualquer coordenador ou pesquisador com acesso ativo ao sistema.

**Sistema:** comportamento automatizado do produto, incluindo validações, prevenção de conflitos, mensagens de erro e atualização de status.

## 4. Convenções dos fluxos

- Cada fluxo descreve uma jornada funcional, não uma tela específica.
- Os passos devem representar ações do ator principal e respostas relevantes do sistema.
- Regras gerais compartilhadas ficam nas premissas para evitar repetição.
- Estados de erro devem registrar apenas falhas relevantes para o fluxo.
- Quando um fluxo mencionar consulta, edição ou cadastro, entende-se que o sistema deve apresentar feedback claro de sucesso ou erro.

## 5. Fluxos funcionais

### 5.1 Usuários e perfis

### Fluxo 1 - Coordenador convida pesquisador

**Objetivo:**  
Permitir que o coordenador convide uma pessoa para acessar o sistema como pesquisador.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.
- A pessoa a ser convidada ainda não possui acesso ativo ao sistema.

**Passos:**  
1. O coordenador inicia a criação de um convite.
2. O coordenador informa os dados necessários para identificar o pesquisador convidado.
3. O sistema valida se o coordenador tem permissão para convidar usuários.
4. O sistema registra o convite como pendente.
5. O sistema disponibiliza o convite para que o pesquisador possa aceitar e criar seu perfil.

**Resultado esperado:**  
O convite fica disponível para o pesquisador convidado iniciar o cadastro de perfil.

**Regras de negócio:**  
- Apenas coordenadores podem convidar pesquisadores.
- Um convite deve estar associado a um pesquisador específico.
- Convites pendentes devem poder ser identificados como ainda não aceitos.
- Um convite aceito não deve poder ser reutilizado para criar outro perfil.

**Estados de erro:**  
- Usuário sem permissão tenta criar convite.
- Dados obrigatórios do convite não são informados.
- Já existe convite pendente ou perfil ativo para a mesma pessoa.
- O sistema não consegue registrar o convite.

### Fluxo 2 - Pesquisador aceita convite e cria perfil

**Objetivo:**  
Permitir que o pesquisador convidado aceite o convite e crie seu perfil inicial.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- Existe um convite válido e pendente para o pesquisador.
- O pesquisador ainda não possui perfil ativo criado a partir desse convite.

**Passos:**  
1. O pesquisador acessa o convite recebido.
2. O sistema verifica se o convite é válido e ainda está pendente.
3. O pesquisador informa os dados obrigatórios do perfil.
4. O pesquisador confirma a criação do perfil.
5. O sistema cria o perfil do pesquisador.
6. O sistema marca o convite como aceito.

**Resultado esperado:**  
O pesquisador passa a ter um perfil ativo e pode acessar as funcionalidades permitidas ao seu papel.

**Regras de negócio:**  
- Um convite válido só pode ser aceito uma vez.
- O perfil inicial deve conter os dados mínimos necessários para identificação do pesquisador.
- O vínculo acadêmico pode ser informado, mas não altera permissões.
- O perfil criado a partir de convite recebe o papel de pesquisador.

**Estados de erro:**  
- Convite inválido, expirado, inexistente ou já aceito.
- Dados obrigatórios do perfil não são informados.
- O pesquisador tenta criar mais de um perfil com o mesmo convite.
- O sistema não consegue concluir a criação do perfil.

### Fluxo 3 - Pesquisador edita perfil

**Objetivo:**  
Permitir que o pesquisador atualize seus próprios dados de perfil.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- O pesquisador está autenticado.
- O pesquisador possui perfil ativo.

**Passos:**  
1. O pesquisador acessa seu perfil.
2. O sistema apresenta os dados atuais.
3. O pesquisador altera as informações permitidas.
4. O pesquisador salva as alterações.
5. O sistema valida os dados informados.
6. O sistema atualiza o perfil.

**Resultado esperado:**  
O perfil do pesquisador é atualizado e passa a exibir as novas informações.

**Regras de negócio:**  
- O pesquisador só pode editar o próprio perfil.
- O pesquisador não pode alterar o próprio papel de acesso.
- Campos obrigatórios devem permanecer preenchidos.
- O vínculo acadêmico pode ser alterado sem impacto nas permissões.

**Estados de erro:**  
- Pesquisador tenta editar perfil de outro usuário.
- Dados obrigatórios ficam vazios ou inválidos.
- Perfil não encontrado ou inativo.
- O sistema não consegue salvar as alterações.

### 5.2 Habilidades e disponibilidade

### Fluxo 4 - Pesquisador cadastra habilidades

**Objetivo:**  
Permitir que o pesquisador associe habilidades técnicas ao próprio perfil.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- O pesquisador está autenticado.
- O pesquisador possui perfil ativo.

**Passos:**  
1. O pesquisador acessa a área de habilidades.
2. O sistema apresenta as habilidades disponíveis para seleção.
3. O pesquisador seleciona uma ou mais habilidades.
4. O pesquisador confirma o cadastro.
5. O sistema associa as habilidades selecionadas ao perfil do pesquisador.

**Resultado esperado:**  
As habilidades do pesquisador ficam visíveis nas consultas permitidas pelo sistema.

**Regras de negócio:**  
- O pesquisador só pode alterar as habilidades do próprio perfil.
- A mesma habilidade não deve ser associada mais de uma vez ao mesmo pesquisador.
- Habilidades devem ser usadas para facilitar a busca por competência técnica.

**Estados de erro:**  
- Pesquisador tenta alterar habilidades de outro usuário.
- Habilidade selecionada não está disponível.
- Tentativa de cadastrar habilidade duplicada para o mesmo perfil.
- O sistema não consegue salvar as alterações.

### Fluxo 5 - Pesquisador cadastra disponibilidade semanal

**Objetivo:**  
Permitir que o pesquisador informe os dias e horários em que pretende estar no laboratório.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- O pesquisador está autenticado.
- O pesquisador possui perfil ativo.

**Passos:**  
1. O pesquisador acessa sua disponibilidade semanal.
2. O sistema apresenta os períodos já cadastrados, se existirem.
3. O pesquisador informa dias da semana e faixas de horário.
4. O pesquisador confirma o cadastro ou a atualização.
5. O sistema valida as faixas de horário.
6. O sistema salva a disponibilidade semanal.

**Resultado esperado:**  
A disponibilidade semanal do pesquisador fica registrada e pode ser usada na consulta de presença no laboratório.

**Regras de negócio:**  
- O pesquisador só pode alterar a própria disponibilidade.
- Cada faixa deve ter horário inicial anterior ao horário final.
- O sistema deve evitar faixas duplicadas ou incoerentes para o mesmo pesquisador.
- A disponibilidade representa planejamento e não confirmação automática de presença real.

**Estados de erro:**  
- Horário inicial igual ou posterior ao horário final.
- Dia da semana ou horário obrigatório não informado.
- Pesquisador tenta alterar disponibilidade de outro usuário.
- O sistema não consegue salvar a disponibilidade.

### Fluxo 6 - Usuário consulta quem estará no laboratório

**Objetivo:**  
Permitir que usuários autenticados consultem quais pesquisadores estão previstos para estar no laboratório em uma data ou período.

**Ator principal:**  
Usuário autenticado.

**Pré-condições:**  
- O usuário está autenticado.
- Existem pesquisadores com disponibilidade cadastrada.

**Passos:**  
1. O usuário acessa a agenda do laboratório.
2. O usuário seleciona uma data ou período de consulta.
3. O sistema verifica as disponibilidades cadastradas.
4. O sistema lista os pesquisadores previstos para o período selecionado.
5. O usuário consulta os dados resumidos de presença planejada.

**Resultado esperado:**  
O usuário visualiza quem está previsto para estar no laboratório no período consultado.

**Regras de negócio:**  
- A consulta deve considerar a disponibilidade semanal cadastrada pelos pesquisadores.
- A consulta deve exibir apenas informações necessárias para organização do laboratório.
- A ausência de disponibilidade cadastrada não deve ser interpretada como presença.

**Estados de erro:**  
- Data ou período de consulta inválido.
- Nenhum pesquisador encontrado para o período selecionado.
- O sistema não consegue carregar a agenda do laboratório.

### Fluxo 7 - Usuário busca pesquisador por habilidade

**Objetivo:**  
Permitir que usuários autenticados encontrem pesquisadores com habilidades específicas.

**Ator principal:**  
Usuário autenticado.

**Pré-condições:**  
- O usuário está autenticado.
- Existem pesquisadores com habilidades cadastradas.

**Passos:**  
1. O usuário acessa a busca por habilidade.
2. O usuário informa ou seleciona uma habilidade.
3. O sistema pesquisa pesquisadores associados à habilidade.
4. O sistema exibe os pesquisadores encontrados.
5. O usuário consulta informações básicas dos pesquisadores listados.

**Resultado esperado:**  
O usuário encontra pesquisadores que podem ajudar em uma competência técnica específica.

**Regras de negócio:**  
- A busca deve considerar apenas habilidades associadas a perfis ativos.
- O resultado deve priorizar clareza sobre quem possui a habilidade buscada.
- A busca por habilidade não altera permissões nem agenda de pesquisadores.

**Estados de erro:**  
- Habilidade não informada.
- Nenhum pesquisador encontrado para a habilidade buscada.
- O sistema não consegue carregar os resultados.

### 5.3 Impressoras e materiais

### Fluxo 8 - Coordenador cadastra impressora

**Objetivo:**  
Permitir que o coordenador cadastre uma impressora 3D disponível para uso ou gestão no laboratório.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.

**Passos:**  
1. O coordenador inicia o cadastro de impressora.
2. O coordenador informa os dados necessários da impressora.
3. O coordenador define o status inicial da impressora.
4. O sistema valida os dados informados.
5. O sistema registra a impressora.
6. O sistema disponibiliza a impressora para consulta e gestão.

**Resultado esperado:**  
A impressora fica cadastrada e passa a aparecer nas áreas de consulta, agenda e gestão conforme seu status.

**Regras de negócio:**  
- Apenas coordenadores podem cadastrar impressoras.
- A impressora deve ter identificação clara.
- O status inicial deve ser um dos status previstos para impressora.
- Impressoras desativadas ou indisponíveis não devem estar disponíveis para novas reservas.

**Estados de erro:**  
- Usuário sem permissão tenta cadastrar impressora.
- Dados obrigatórios da impressora não são informados.
- Status informado é inválido.
- O sistema não consegue registrar a impressora.

### Fluxo 9 - Coordenador cadastra material

**Objetivo:**  
Permitir que o coordenador cadastre materiais usados nas impressões 3D.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.

**Passos:**  
1. O coordenador inicia o cadastro de material.
2. O coordenador informa os dados necessários do material.
3. O sistema valida as informações.
4. O sistema registra o material.
5. O sistema disponibiliza o material para associação com impressoras e uso em reservas.

**Resultado esperado:**  
O material fica cadastrado e pode ser relacionado às impressoras compatíveis.

**Regras de negócio:**  
- Apenas coordenadores podem cadastrar materiais.
- O material deve ter identificação clara.
- Materiais cadastrados devem poder ser usados na definição de compatibilidade com impressoras.

**Estados de erro:**  
- Usuário sem permissão tenta cadastrar material.
- Dados obrigatórios do material não são informados.
- Já existe material equivalente cadastrado.
- O sistema não consegue registrar o material.

### Fluxo 10 - Coordenador associa materiais compatíveis à impressora

**Objetivo:**  
Permitir que o coordenador defina quais materiais podem ser usados em cada impressora.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.
- Existe pelo menos uma impressora cadastrada.
- Existe pelo menos um material cadastrado.

**Passos:**  
1. O coordenador seleciona uma impressora.
2. O sistema apresenta os materiais disponíveis.
3. O coordenador seleciona os materiais compatíveis com a impressora.
4. O coordenador confirma a associação.
5. O sistema registra a compatibilidade.
6. O sistema passa a considerar essa compatibilidade nas reservas.

**Resultado esperado:**  
A impressora passa a exibir seus materiais compatíveis, e reservas futuras devem respeitar essa relação.

**Regras de negócio:**  
- Apenas coordenadores podem alterar compatibilidades.
- Uma impressora pode ter vários materiais compatíveis.
- Um material pode ser compatível com várias impressoras.
- Reservas não devem aceitar material incompatível com a impressora selecionada.

**Estados de erro:**  
- Usuário sem permissão tenta alterar compatibilidades.
- Impressora não encontrada ou desativada.
- Material não encontrado.
- Tentativa de associar material já compatível sem necessidade.
- O sistema não consegue salvar a associação.

### 5.4 Reservas e conflitos

### Fluxo 11 - Pesquisador cria reserva manual

**Objetivo:**  
Permitir que o pesquisador reserve manualmente uma impressora 3D para um projeto.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- O pesquisador está autenticado.
- O pesquisador possui perfil ativo.
- Existe pelo menos uma impressora ativa.
- Existe material compatível com a impressora escolhida.

**Passos:**  
1. O pesquisador inicia a criação de reserva.
2. O pesquisador seleciona a impressora.
3. O pesquisador informa projeto, material, data, horário inicial e duração estimada.
4. O sistema calcula o horário final da reserva.
5. O sistema valida a disponibilidade da impressora no período.
6. O sistema valida a compatibilidade entre material e impressora.
7. O pesquisador confirma a reserva.
8. O sistema registra a reserva com status inicial previsto para o MVP.

**Resultado esperado:**  
A reserva é criada e passa a aparecer na agenda da impressora e na lista de reservas do pesquisador.

**Regras de negócio:**  
- O pesquisador só pode criar reserva para si mesmo.
- A impressora deve estar apta para receber reservas no período escolhido.
- O material selecionado deve ser compatível com a impressora.
- O horário final deve ser calculado a partir do horário inicial e da duração estimada.
- A reserva não pode conflitar com outra reserva ou bloqueio da mesma impressora.

**Estados de erro:**  
- Dados obrigatórios da reserva não são informados.
- Duração estimada inválida.
- Impressora indisponível, em manutenção ou desativada.
- Material incompatível com a impressora.
- Conflito de horário identificado.
- O sistema não consegue registrar a reserva.

### Fluxo 12 - Sistema impede conflito de reserva

**Objetivo:**  
Garantir que duas reservas ou bloqueios não ocupem o mesmo período da mesma impressora.

**Ator principal:**  
Sistema.

**Pré-condições:**  
- Uma criação ou edição de reserva está em andamento.
- A reserva possui impressora, data, horário inicial e horário final calculado.

**Passos:**  
1. O sistema recebe os dados da reserva pretendida.
2. O sistema identifica a impressora e o intervalo solicitado.
3. O sistema verifica reservas existentes para a mesma impressora.
4. O sistema verifica bloqueios de manutenção para a mesma impressora.
5. O sistema compara os intervalos de horário.
6. Se houver sobreposição, o sistema impede a confirmação.
7. Se não houver sobreposição, o sistema permite a continuidade do fluxo.

**Resultado esperado:**  
Reservas conflitantes são bloqueadas antes de serem confirmadas.

**Regras de negócio:**  
- A validação de conflito deve considerar apenas a mesma impressora.
- Reservas canceladas não devem bloquear novos agendamentos.
- Reservas em andamento, aprovadas ou pendentes devem bloquear horários sobrepostos.
- Bloqueios de manutenção devem impedir reservas no mesmo período.
- O sistema deve validar conflitos tanto na criação quanto na edição de reservas.

**Estados de erro:**  
- Conflito com reserva existente.
- Conflito com bloqueio de manutenção.
- Intervalo de horário inválido.
- O sistema não consegue verificar a agenda da impressora.

### Fluxo 13 - Pesquisador cancela própria reserva

**Objetivo:**  
Permitir que o pesquisador cancele uma reserva própria quando ela ainda puder ser cancelada.

**Ator principal:**  
Pesquisador.

**Pré-condições:**  
- O pesquisador está autenticado.
- A reserva pertence ao pesquisador.
- A reserva ainda não está `Em andamento`, `Concluída`, `Falhou` ou `Cancelada`.

**Passos:**  
1. O pesquisador acessa suas reservas.
2. O pesquisador seleciona uma reserva própria.
3. O sistema verifica se a reserva pertence ao pesquisador.
4. O sistema verifica se o status da reserva permite cancelamento pelo pesquisador.
5. O pesquisador confirma o cancelamento.
6. O sistema altera o status da reserva para `Cancelada`.
7. O sistema libera o horário para novas reservas.

**Resultado esperado:**  
A reserva própria é cancelada, permanece no histórico e deixa de bloquear o horário da impressora.

**Regras de negócio:**  
- O pesquisador só pode cancelar reservas próprias.
- O pesquisador só pode cancelar a própria reserva se ela ainda não estiver `Em andamento`, `Concluída`, `Falhou` ou `Cancelada`.
- O cancelamento não deve apagar a reserva do histórico.
- Reservas canceladas não devem bloquear novos agendamentos.

**Estados de erro:**  
- Pesquisador tenta cancelar reserva de outro usuário.
- Reserva já está `Em andamento`.
- Reserva já está `Concluída`.
- Reserva já está `Falhou`.
- Reserva já está `Cancelada`.
- Reserva não encontrada.
- O sistema não consegue cancelar a reserva.

### 5.5 Administração operacional

### Fluxo 14 - Coordenador bloqueia impressora para manutenção

**Objetivo:**  
Permitir que o coordenador bloqueie uma impressora em um período específico para manutenção.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.
- A impressora está cadastrada.

**Passos:**  
1. O coordenador seleciona a impressora.
2. O coordenador informa o período de manutenção.
3. O coordenador registra o motivo do bloqueio.
4. O sistema valida o período informado.
5. O sistema verifica se há reservas conflitantes.
6. O sistema registra o bloqueio de manutenção.
7. O sistema impede novas reservas para a impressora no período bloqueado.

**Resultado esperado:**  
A impressora fica bloqueada para novas reservas durante o período de manutenção.

**Regras de negócio:**  
- Apenas coordenadores podem bloquear impressoras para manutenção.
- O bloqueio deve ter período definido.
- Bloqueios de manutenção devem impedir novas reservas no mesmo intervalo.
- O status da impressora pode indicar manutenção quando aplicável.
- Reservas já existentes no período devem ser tratadas pelo coordenador antes ou durante o bloqueio, conforme necessidade operacional.

**Estados de erro:**  
- Usuário sem permissão tenta criar bloqueio.
- Impressora não encontrada.
- Período de manutenção inválido.
- Conflito com reserva existente que exige decisão do coordenador.
- O sistema não consegue registrar o bloqueio.

### Fluxo 15 - Coordenador edita ou cancela reservas

**Objetivo:**  
Permitir que o coordenador ajuste ou cancele reservas quando necessário para a operação do laboratório.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.
- Existe uma reserva registrada.

**Passos:**  
1. O coordenador acessa a lista ou agenda de reservas.
2. O coordenador seleciona uma reserva.
3. O coordenador escolhe editar dados permitidos ou cancelar a reserva.
4. Se editar, o sistema valida os novos dados e verifica conflitos de horário.
5. Se cancelar, o sistema solicita confirmação da ação.
6. O sistema aplica a alteração solicitada.
7. O sistema mantém a reserva no histórico.

**Resultado esperado:**  
A reserva é editada ou marcada como `Cancelada`, sem ser apagada do histórico.

**Regras de negócio:**  
- Apenas coordenadores podem editar ou cancelar reservas de qualquer pesquisador.
- Edições de data, horário, duração, impressora ou material devem respeitar as regras de conflito e compatibilidade.
- Cancelar uma reserva deve alterar seu status, não remover seu registro histórico.
- A reserva não deve ser apagada do histórico em nenhuma edição ou cancelamento.
- Reservas canceladas deixam de bloquear o horário da impressora.

**Estados de erro:**  
- Usuário sem permissão tenta editar ou cancelar reserva.
- Reserva não encontrada.
- Novos dados da reserva são inválidos.
- Novo horário conflita com outra reserva ou manutenção.
- Novo material é incompatível com a impressora.
- O sistema não consegue aplicar a alteração.

## 6. Critérios para manter os fluxos objetivos

- Descrever comportamento funcional, não implementação técnica.
- Evitar nomes de tabelas, políticas de acesso, componentes de interface ou detalhes de infraestrutura.
- Manter passos curtos, sequenciais e verificáveis.
- Concentrar regras comuns nas premissas gerais.
- Evitar repetir regras já descritas quando uma referência ao fluxo ou à premissa for suficiente.
- Registrar apenas estados de erro que mudam a experiência ou a regra do fluxo.
- Preservar o escopo do MVP e não incluir funcionalidades pós-MVP.
- Usar os status definidos no PRD para reservas e impressoras.
