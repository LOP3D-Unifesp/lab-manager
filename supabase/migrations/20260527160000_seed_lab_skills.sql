insert into public.skills (name, description, is_active)
values
  (
    'Impressao 3D',
    'Preparacao de arquivos, fatiamento, escolha de material, operacao de impressoras e acompanhamento das pecas durante a fabricacao.',
    true
  ),
  (
    'Manutencao de impressoras 3D',
    'Calibracao, troca de componentes, limpeza, diagnostico de falhas e manutencao preventiva das impressoras do laboratorio.',
    true
  ),
  (
    'Prototipagem de orteses e proteses',
    'Construcao e ajuste de prototipos funcionais considerando conforto, encaixe, resistencia e necessidades clinicas.',
    true
  ),
  (
    'Modelagem 3D e CAD',
    'Criacao, edicao e adaptacao de modelos digitais para impressao 3D, incluindo ajustes anatomicos e preparo de arquivos.',
    true
  ),
  (
    'Escaneamento 3D',
    'Captura de geometrias, limpeza de malhas, alinhamento de scans e uso de referencias anatomicas no processo de projeto.',
    true
  ),
  (
    'Desenvolvimento web e aplicativos',
    'Programacao de paginas, aplicativos e sistemas digitais para apoiar reservas, registros, organizacao e comunicacao do laboratorio.',
    true
  ),
  (
    'Eletronica e circuitos',
    'Montagem, teste e documentacao de circuitos, sensores, atuadores e conexoes usadas em prototipos assistivos.',
    true
  ),
  (
    'Programacao embarcada',
    'Programacao de Arduino, microcontroladores, sensores e dispositivos fisicos usados em projetos de tecnologia assistiva.',
    true
  ),
  (
    'Avaliacao fisioterapeutica',
    'Avaliacao de mobilidade, dor, amplitude de movimento, funcionalidade e necessidades para adaptacao de orteses e proteses.',
    true
  ),
  (
    'Acompanhamento psicologico',
    'Apoio ao acolhimento, adesao, bem-estar emocional e experiencia do paciente durante o desenvolvimento e uso da tecnologia.',
    true
  ),
  (
    'Comunicacao com pacientes',
    'Entrevista, escuta ativa, orientacao, registro de demandas e traducao das necessidades do paciente para a equipe tecnica.',
    true
  )
on conflict (name) do update
set description = excluded.description,
    is_active = true;
