# User Flows - LO&P3D Lab Manager

## 1. Objetivo do documento

Este documento descreve os fluxos funcionais do LO&P3D Lab Manager. O objetivo é registrar o comportamento esperado do sistema para autenticação, perfis, agendas, impressoras, reservas e configuração do laboratório. Ele foi atualizado para refletir o que está implementado; itens previstos e ainda não feitos estão marcados.

O documento deve orientar a implementação funcional sem definir modelagem de banco, nomes de tabelas, regras de RLS, componentes React ou detalhes internos de infraestrutura.

## 2. Premissas gerais do MVP

- Todos os usuários que acessam informações do sistema devem estar autenticados.
- O sistema possui dois papéis principais: coordenador e pesquisador.
- O acesso ao sistema é somente por convite; não existe cadastro público.
- O coordenador pode convidar pessoas (como pesquisador ou coordenador), configurar o laboratório, gerenciar impressoras, materiais, bloqueios de manutenção e decidir sobre reservas.
- O pesquisador pode criar e editar o próprio perfil, cadastrar habilidades, informar disponibilidade semanal, consultar agendas e criar reservas manuais.
- O pesquisador só pode gerenciar dados próprios, exceto nas consultas compartilhadas permitidas pelo sistema.
- A reserva de impressora no MVP é manual e deve conter impressora, projeto, material, data, horário inicial e duração estimada.
- O sistema deve impedir conflitos de horário para a mesma impressora.
- Upload de arquivos, parser de `.gcode`, parser de `.3mf`, sugestão automática de horário, relatórios avançados e integração direta com impressoras estão fora do MVP inicial.
- Status de reserva: `Pendente`, `Aprovada`, `Rejeitada`, `Em andamento`, `Concluída`, `Cancelada` e `Falhou`.
- Reservas `Pendente`, `Aprovada` e `Em andamento` bloqueiam o horário da impressora.
- Status de impressora previstos: `Ativa`, `Parado` (chamado urgente aberto), `Em manutenção`, `Indisponível` e `Desativada`.

## 3. Papéis envolvidos

**Coordenador:** usuário responsável pela administração operacional do laboratório. Pode convidar usuários, configurar o laboratório, decidir sobre reservas, gerenciar cadastros administrativos, bloquear impressoras para manutenção e editar ou cancelar reservas quando necessário.

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

### Fluxo 1 - Coordenador convida usuário

**Objetivo:**
Permitir que o coordenador convide uma pessoa para acessar o sistema como pesquisador ou coordenador.

**Ator principal:**
Coordenador.

**Pré-condições:**
- O coordenador está autenticado.
- O laboratório concluiu a instalação e possui um e-mail de contato para privacidade.
- A pessoa a ser convidada ainda não possui acesso ativo ao sistema.

**Passos:**
1. O coordenador acessa **Usuários → Convites** e inicia um convite.
2. O coordenador informa o e-mail da pessoa e escolhe o papel (pesquisador ou coordenador).
3. O sistema valida a permissão e envia o e-mail de convite.
4. O sistema registra o convite como pendente, com validade de 72 horas.
5. Enquanto o convite estiver pendente, o coordenador pode reenviá-lo (após um intervalo mínimo) ou revogá-lo.

**Resultado esperado:**
A pessoa recebe um e-mail com o link do convite e o convite aparece na lista como pendente.

**Regras de negócio:**
- Apenas coordenadores podem convidar usuários.
- O papel é definido no convite e não pode ser alterado pelo convidado.
- Um convite é válido por 72 horas; depois disso expira.
- Convites podem estar `Pendentes`, `Aceitos`, `Expirados` ou `Revogados`.
- Um convite aceito não pode ser reutilizado.
- Convites expirados ou revogados têm a identidade técnica pendente e o e-mail descartados automaticamente.

**Estados de erro:**
- Usuário sem permissão tenta criar convite.
- Instalação incompleta ou contato de privacidade não informado.
- E-mail inválido, ou já existe convite pendente ou perfil ativo para a mesma pessoa.
- Limite de envio de e-mails do provedor atingido.
- O sistema não consegue registrar ou enviar o convite.

### Fluxo 2 - Convidado aceita o convite e cria o perfil

**Objetivo:**
Permitir que a pessoa convidada aceite o convite e complete seu perfil inicial.

**Ator principal:**
Pessoa convidada.

**Pré-condições:**
- Existe um convite válido e pendente para a pessoa.

**Passos:**
1. A pessoa abre o link recebido por e-mail e vê a página **Revise antes de aceitar**, com a identidade do laboratório e o aviso de privacidade.
2. Abrir a página não confirma o convite nem cria sessão.
3. A pessoa clica em **Aceitar convite**; o sistema valida o convite e cria uma sessão.
4. A pessoa define uma senha.
5. A pessoa preenche o perfil (nome, vínculo acadêmico, bolsas ou carga horária, contato e dados pessoais) e confirma.
6. O sistema cria o perfil com o papel definido no convite e marca o convite como aceito.

**Resultado esperado:**
A pessoa passa a ter um perfil ativo e acessa as funcionalidades do seu papel.

**Regras de negócio:**
- Um convite válido só pode ser aceito uma vez.
- O aceite exige confirmação explícita, para que a pré-visualização do e-mail não consuma o link.
- O vínculo acadêmico pode ser informado, mas não altera permissões.
- Quem sai antes de concluir o perfil tem a identidade incompleta descartada automaticamente após a expiração do convite.

**Estados de erro:**
- Link incompleto, convite inválido, expirado, revogado ou já usado (a mensagem orienta pedir novo convite).
- Senha fora das regras mínimas ou confirmação diferente.
- Dados obrigatórios do perfil não são informados.
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

### Fluxo 3.1 - Pesquisador informa vínculo de bolsa e carga horária

**Objetivo:**
Registrar se a pessoa é bolsista ou voluntária e qual é a sua carga horária semanal.

**Ator principal:**
Pesquisador (também no cadastro inicial do perfil).

**Passos:**
1. No perfil, a pessoa escolhe **Bolsista** ou **Voluntário**.
2. Se for bolsista, cadastra uma ou mais bolsas (agência, nome da bolsa, horas semanais e valor mensal); a carga horária é a soma das horas das bolsas.
3. Se for voluntário, informa manualmente a carga horária semanal (1 a 60 horas); as bolsas são removidas ao salvar.
4. O sistema salva o perfil e usa a carga horária como meta na agenda semanal.

**Regras de negócio:**
- A carga horária semanal vai de 1 a 60 horas; sem valor, não há meta.
- Agência "outra" exige o nome da agência.
- A lista de pesquisadores mostra "Voluntário" para quem tem carga mas nenhuma bolsa.

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
3. O pesquisador escolhe, para cada dia de funcionamento e turno, o modo: presencial, home office ou aula (ou nenhum).
4. O pesquisador confirma o cadastro ou a atualização.
5. O sistema valida os turnos e a capacidade presencial.
6. O sistema salva a disponibilidade semanal.

**Resultado esperado:**  
A disponibilidade semanal do pesquisador fica registrada e pode ser usada na consulta de presença no laboratório.

**Regras de negócio:**  
- O pesquisador só pode alterar a própria disponibilidade.
- Os dias e turnos disponíveis são os configurados pelo coordenador (Fluxo 19).
- O número de pessoas presenciais em um turno não pode ultrapassar a capacidade presencial do laboratório.
- O sistema evita turnos duplicados ou incoerentes para o mesmo pesquisador.
- A agenda mostra as horas agendadas contra a carga horária semanal do perfil.
- A disponibilidade representa planejamento e não confirmação automática de presença real.

**Estados de erro:**  
- Capacidade presencial do turno já atingida.
- Dia ou turno fora do funcionamento do laboratório.
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

> **Situação: prevista, ainda não implementada.** Hoje a lista de Pesquisadores filtra por vínculo e não exibe habilidades. Veja [PENDENCIAS.md](PENDENCIAS.md).

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
3. O pesquisador escolhe o projeto (entre os projetos em aberto de que participa) e informa material, data, horário inicial e duração estimada. Para impressoras, pode escolher também o rolo (do projeto ou do estoque geral).
4. O sistema calcula o horário final da reserva.
5. O sistema valida a disponibilidade da impressora no período.
6. O sistema valida a compatibilidade entre material e impressora.
7. O pesquisador confirma a reserva.
8. O sistema registra a reserva: como `Pendente`, se o pesquisador exige aprovação, ou como `Aprovada`, caso contrário (coordenadores e pesquisadores sem essa exigência).

**Resultado esperado:**  
A reserva é criada e passa a aparecer na agenda da impressora e em **Minhas reservas**. Se ficar `Pendente`, os coordenadores recebem um alerta em tempo real.

**Regras de negócio:**  
- O pesquisador só pode criar reserva para si mesmo.
- A exigência de aprovação é uma configuração por pesquisador, ligada por padrão e alterada pelo coordenador em **Usuários**.
- A duração vai de 30 minutos a 24 horas, em múltiplos de 30 minutos.
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
- A reserva está `Pendente` ou `Aprovada`.

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
- O pesquisador só pode cancelar a própria reserva se ela estiver `Pendente` ou `Aprovada`.
- O cancelamento não deve apagar a reserva do histórico.
- Reservas canceladas não devem bloquear novos agendamentos.

**Estados de erro:**  
- Pesquisador tenta cancelar reserva de outro usuário.
- Reserva já está `Em andamento`.
- Reserva já está `Concluída`.
- Reserva já está `Falhou`.
- Reserva já está `Cancelada` ou `Rejeitada`.
- Reserva não encontrada.
- O sistema não consegue cancelar a reserva.

### 5.5 Administração operacional

### Fluxo 14c - Pedir e acompanhar uma compra

**Ator principal:** pesquisador (ou coordenador).

**Passos:**
1. Em **Compras**, a pessoa usa **Novo pedido**, escolhe para quem é a compra (um projeto ou o **estoque geral do laboratório**) e a **rubrica** (capital para equipamento e material permanente; custeio para consumo e serviços; passagens; diárias), descreve o item, marca **Gasto de manutenção** quando for peça ou reparo (já vem marcado nos pedidos feitos a partir de um chamado), escolhe a **urgência** (baixa, normal ou urgente; urgente sobe o pedido na fila do coordenador), cola o link, informa a quantidade e o valor de uma unidade (o app calcula o total) e envia. O pedido nasce *Solicitado*.
2. O coordenador vê o pedido (selo no menu e na campainha) e escolhe **Aprovar** ou **Recusar** (com motivo opcional).
3. Aprovado, o coordenador compra e usa **Marcar como comprado**, informando o valor pago (já vem preenchido com o estimado).
4. Quando o item chega, usa **Marcar como entregue**.

**Regras de negócio:**
- Só é possível pedir para projeto em aberto do qual a pessoa é membro; o coordenador pede para qualquer projeto em aberto. Para o estoque geral qualquer pessoa ativa pode pedir.
- Quem pediu edita (inclusive trocando o projeto ou o estoque geral, para um destino que a pessoa poderia pedir) e cancela enquanto o pedido está *Solicitado*; depois da decisão só o coordenador mexe (e pode cancelar um pedido aprovado).
- O coordenador pode voltar uma etapa (desfazer entrega, desfazer compra, voltar para solicitado) e reabrir pedidos recusados ou cancelados; ao desfazer a compra, o valor pago e a data são apagados.
- O pedido é visível para quem pediu, os membros do projeto e o coordenador; o do estoque geral, só para quem pediu e o coordenador.

### Fluxo 14b - Reportar problema e tratar chamado de manutenção

**Passos:**  
1. Qualquer pessoa abre **Reportar problema** no card do equipamento, descreve o problema, escolhe a urgência e, se quiser, tira ou anexa até 3 fotos. Em chamado **urgente**, o equipamento fica **Parado** (sem novas reservas) assim que o chamado é enviado. Se já houver chamados abertos, o diálogo avisa.
2. O chamado entra na aba **Chamados** como *Aberto* e aparece como pendência (menu e campainha) para coordenadores e responsáveis pela manutenção.
3. Um responsável usa **Iniciar manutenção**: o chamado vira *Em andamento* e o equipamento (ativo ou parado) entra em **Em manutenção**, com início registrado. Se o chamado urgente for cancelado ou resolvido sem a manutenção começar, o equipamento volta a *Ativa* sozinho.
3b. Se a máquina precisa de uma peça, o responsável usa **Pedir peça** no chamado: o pedido de compra já vem preenchido e fica ligado ao chamado, que passa a mostrar a situação da peça.
4. Ao terminar, usa **Resolver** (com nota opcional; a caixa "Liberar o equipamento também" já vem marcada) ou **Liberar equipamento**, que também resolve os chamados em andamento.
5. A aba **Chamados** filtra por tipo de equipamento (a escolha fica salva), equipamento e "só os meus" e ordena por prioridade, data, equipamento ou situação (a escolha fica salva); **Baixar fotos** gera um .zip com as fotos do chamado.

**Regras de negócio:**
- Quem abriu só cancela o próprio chamado enquanto está *Aberto*; chamado cancelado não volta.
- Responsáveis também podem devolver à fila e reabrir chamados resolvidos.

### Fluxo 14 - Coordenador bloqueia impressora para manutenção

**Objetivo:**  
Permitir que o coordenador bloqueie uma impressora em um período específico para manutenção.

**Ator principal:**  
Coordenador.

**Pré-condições:**  
- O coordenador está autenticado.
- A impressora está cadastrada.

**Passos:**  
1. Na página **Equipamentos**, o coordenador escolhe o equipamento e abre **Colocar em manutenção**.
2. O coordenador informa o motivo e, se quiser, uma previsão de volta e observações. Não é preciso saber quando termina.
3. O sistema lista as reservas futuras do equipamento; o coordenador pode marcar para cancelá-las junto.
4. O sistema coloca o equipamento em manutenção **agora** e registra o início.
5. O equipamento deixa de aceitar novas reservas e o card mostra "Em manutenção desde…" com o motivo.
6. Quando o reparo termina, o coordenador usa **Liberar equipamento** (e pode anotar o que foi feito); o sistema registra o fim e o equipamento volta a aceitar reservas.

**Resultado esperado:**
O equipamento fica fora de novas reservas enquanto estiver em manutenção, e cada parada fica registrada com início, fim, motivo e quem fez.

**Regras de negócio:**
- Coordenadores e responsáveis pela manutenção (marcados em Usuários) colocam equipamentos em manutenção e os liberam.
- Não há data de fim: a manutenção dura até a liberação. A previsão de volta é informativa.
- Cada equipamento tem no máximo uma manutenção em aberto.
- O histórico (início, fim, duração, motivo, quem iniciou e quem liberou) é guardado e consultável em **Histórico** no card, com contagem de paradas e duração média.
- Reservas em andamento não são canceladas automaticamente; as pendentes ou aprovadas que ainda não começaram podem ser canceladas na hora de colocar em manutenção.
- O estado "Em manutenção" não é escolhido no formulário de edição do equipamento: ele só muda por Colocar em manutenção e Liberar.

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
- Só reservas `Pendentes` ou `Aprovadas` podem ser editadas ou canceladas.

**Estados de erro:**  
- Usuário sem permissão tenta editar ou cancelar reserva.
- Reserva não encontrada.
- Novos dados da reserva são inválidos.
- Novo horário conflita com outra reserva ou manutenção.
- Novo material é incompatível com a impressora.
- O sistema não consegue aplicar a alteração.

### Fluxo 16 - Coordenador aprova ou rejeita reserva pendente

**Objetivo:**
Permitir que o coordenador decida sobre reservas que aguardam aprovação.

**Ator principal:**
Coordenador.

**Pré-condições:**
- Existe uma reserva `Pendente`.

**Passos:**
1. O coordenador recebe o alerta de reservas pendentes (sino de notificações, atualizado em tempo real).
2. O coordenador abre a reserva e escolhe **Aprovar** ou **Rejeitar**.
3. Ao rejeitar, pode informar um motivo.
4. O sistema registra a decisão, quem decidiu e quando, e atualiza o status.
5. O pesquisador é notificado da decisão.

**Regras de negócio:**
- Apenas coordenadores decidem sobre reservas.
- `Rejeitada` não bloqueia o horário e não pode ser reaberta (o pesquisador cria uma nova reserva).
- A decisão fica registrada no histórico da reserva.

### Fluxo 17 - Coordenador conduz o ciclo operacional da reserva

**Objetivo:**
Registrar o andamento real de uma impressão.

**Ator principal:**
Coordenador.

**Passos:**
1. Com a reserva `Aprovada`, o coordenador marca **Em andamento**.
2. Ao terminar, marca **Concluída** ou **Falhou**.

**Regras de negócio:**
- As transições permitidas são `Aprovada → Em andamento → Concluída` ou `Falhou`.
- Essas mudanças só são aceitas a partir de 1 hora antes do horário da reserva.
- Reservas encerradas permanecem no **Histórico de reservas**.

### 5.6 Instalação e configuração do laboratório

### Fluxo 18 - Primeiro coordenador conclui a instalação

**Objetivo:**
Preparar um sistema novo para uso.

**Ator principal:**
Primeiro coordenador.

**Passos:**
1. O coordenador entra e é direcionado ao wizard de instalação.
2. Informa o nome e a sigla do laboratório, o fuso horário e um e-mail institucional de contato para privacidade.
3. O sistema marca a instalação como concluída.

**Regras de negócio:**
- Até a instalação ser concluída, pesquisadores veem apenas um aviso de instalação pendente.
- Convites ficam bloqueados enquanto o contato de privacidade não estiver preenchido.
- A instalação só pode ser concluída uma vez.

### Fluxo 19 - Coordenador configura o funcionamento do laboratório

**Objetivo:**
Ajustar a capacidade e o calendário usados nas agendas.

**Ator principal:**
Coordenador.

**Passos:**
1. Em **Administração**, o coordenador ajusta nome, sigla, fuso e contato de privacidade.
2. Define a capacidade presencial e os dias de funcionamento.
3. Cria, edita ou desativa turnos e define os intervalos de almoço e jantar.
4. O sistema valida e aplica as mudanças.

**Regras de negócio:**
- Turnos ativos não podem se sobrepor entre si nem aos intervalos de almoço e jantar.
- Deve existir pelo menos um turno ativo.
- A capacidade não pode ficar abaixo da ocupação presencial já cadastrada.

## 6. Critérios para manter os fluxos objetivos

- Descrever comportamento funcional, não implementação técnica.
- Evitar nomes de tabelas, políticas de acesso, componentes de interface ou detalhes de infraestrutura.
- Manter passos curtos, sequenciais e verificáveis.
- Concentrar regras comuns nas premissas gerais.
- Evitar repetir regras já descritas quando uma referência ao fluxo ou à premissa for suficiente.
- Registrar apenas estados de erro que mudam a experiência ou a regra do fluxo.
- Manter o foco no que está implementado e marcar claramente o que é previsto.
- Usar os status definidos no PRD para reservas e impressoras.
