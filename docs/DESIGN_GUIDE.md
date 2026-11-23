# Design Guide - LO&P3D Lab Manager

## 1. Contexto visual

O LO&P3D Lab Manager é um sistema interno para organização da agenda de pesquisadores, habilidades e reservas de impressoras 3D do Laboratório de Órteses e Próteses 3D.

A identidade visual deve transmitir clareza, organização e confiabilidade institucional. A interface deve ser adequada para uso cotidiano em um laboratório acadêmico, com leitura rápida, ações evidentes e boa usabilidade em dispositivos móveis.

A interface deve ser:

- institucional;
- limpa;
- técnica;
- acessível;
- responsiva;
- mobile first;
- adequada para uso em laboratório acadêmico.

## 2. Abordagem mobile first

O sistema deve ser projetado primeiro para celular e depois expandido para tablet e desktop. As decisões de layout, navegação e densidade de informação devem partir da experiência móvel.

Pesquisadores devem conseguir pelo celular:

- consultar quem estará no laboratório;
- consultar habilidades dos pesquisadores;
- buscar ajuda por habilidade;
- visualizar agenda das impressoras;
- criar ou visualizar reservas.

No mobile, as telas devem priorizar tarefas rápidas, cards legíveis, botões grandes e fluxos simples. Em tablet e desktop, a interface pode ganhar mais colunas, tabelas completas, sidebar e maior densidade de informação.

## 3. Fonte

A fonte principal do sistema deve ser Dosis:

```css
font-family: "Dosis", system-ui, sans-serif;
```

> **Situação atual:** a fonte está configurada no Tailwind (`tailwind.config.ts`) e em `src/index.css`,
> mas o `index.html` ainda não a carrega de nenhum servidor de fontes; sem ela instalada no
> dispositivo, o navegador usa o fallback. Veja [PENDENCIAS.md](PENDENCIAS.md).

Caso a fonte externa ainda não esteja configurada, usar o fallback:

```css
font-family: system-ui, sans-serif;
```

A tipografia deve manter boa legibilidade, com tamanhos generosos e hierarquia clara.

## 4. Paleta institucional do LO&P3D

Usar a paleta institucional abaixo como base visual do sistema:

- Azul: `#0095d9`
- Verde: `#00a651`
- Amarelo: `#ffcb05`
- Fundo claro: `#f8fafc`
- Superfície: `#ffffff`
- Borda: `#dbe3ea`
- Texto principal: `#102033`
- Texto secundário: `#5f6b7a`
- Perigo/erro: `#dc2626`

Tokens CSS sugeridos:

```css
:root {
  --color-primary: #0095d9;
  --color-success: #00a651;
  --color-warning: #ffcb05;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #dbe3ea;
  --color-text: #102033;
  --color-muted: #5f6b7a;
  --color-danger: #dc2626;
}
```

O azul deve ser usado como cor primária de navegação e ação principal. O verde deve representar confirmação, disponibilidade ou estados positivos. O amarelo deve indicar alerta ou atenção, sempre com texto escuro. O vermelho deve ser reservado para erros, cancelamentos, falhas e ações destrutivas.

## 5. Contraste e acessibilidade

A interface deve seguir boas práticas compatíveis com WCAG.

Regras obrigatórias:

- evitar textos menores que `16px`;
- usar botões grandes;
- garantir foco visível;
- permitir navegação por teclado;
- usar labels em campos de formulário;
- não depender apenas de cor para indicar status;
- badges devem sempre conter texto;
- não usar texto branco sobre o amarelo `#ffcb05`;
- amarelo `#ffcb05` deve usar texto escuro;
- elementos clicáveis devem ter área mínima confortável.

Todos os componentes interativos devem ter estados de foco, hover, ativo e desabilitado. Indicadores de status devem combinar cor, texto e, quando fizer sentido, ícone.

## 6. Tamanhos mínimos

Tamanhos mínimos recomendados:

- Texto comum: `18px`
- Texto secundário: `16px`
- Labels: `17px`
- Botões: `18px`
- Títulos de página: `30px` em mobile e `32px` em desktop
- Subtítulos: `22px` em mobile e `24px` em desktop
- Títulos de cards: `20px`
- Texto de tabelas ou listas: `17px`
- Badges de status: `16px`

Evitar interfaces compactas demais. O sistema será usado em contexto de laboratório, onde leitura rápida e toque confortável são mais importantes do que máxima densidade visual em mobile.

## 7. Botões

Todos os botões devem seguir uma base consistente:

- altura mínima de `44px`;
- padding de `12px 20px`;
- fonte de `18px`;
- peso `600`;
- borda arredondada de `12px`;
- largura total em mobile quando for ação principal.

Tipos de botão:

- Primário: fundo azul `#0095d9`, texto branco.
- Secundário: fundo branco, borda azul `#0095d9`, texto azul.
- Confirmação: fundo verde `#00a651`, texto branco.
- Alerta: fundo amarelo `#ffcb05`, texto escuro.
- Perigo: fundo vermelho `#dc2626`, texto branco.
- Fantasma: fundo transparente, texto azul ou escuro.

Botões devem ter rótulos claros e orientados à ação, como "Criar reserva", "Salvar perfil", "Ver agenda" ou "Cancelar reserva".

## 8. Layout responsivo

### Mobile

No mobile, a interface deve priorizar simplicidade e acesso rápido às ações principais.

Padrões:

- cabeçalho superior;
- menu recolhível ou barra inferior;
- cards em coluna única;
- formulários em coluna única;
- botões grandes;
- listagens como cards ou listas;
- calendário em visualização simplificada.

### Tablet

No tablet, o sistema pode ampliar a área útil sem perder clareza.

Padrões:

- grid de duas colunas quando fizer sentido;
- navegação compacta;
- cards maiores;
- calendário semanal simplificado.

### Desktop

No desktop, o sistema deve aproveitar melhor o espaço horizontal.

Padrões:

- sidebar fixa à esquerda;
- área principal ampla;
- cards em grid;
- tabelas completas;
- calendário semanal ou mensal;
- maior densidade de informação.

## 9. Navegação

### Mobile

No mobile, priorizar acesso rápido a:

- Dashboard;
- Agenda;
- Equipamentos;
- Reservas.

As demais seções (Projetos, Minhas reservas, Inventário, Habilidades e, para coordenadores, Usuários, Histórico de reservas e Configurações) ficam no menu recolhível ou na área da conta.

### Desktop

No desktop, usar sidebar fixa, agrupada por finalidade, com um título discreto em cada grupo:

- Dashboard
- **Trabalho:** Agenda do Laboratório, Reservas, Minhas reservas (pesquisador), Projetos
- **Recursos:** Equipamentos, Inventário, Compras
- **Pessoas:** Pesquisadores, Habilidades
- **Gestão** (coordenador): Usuários, Histórico de reservas, Feedback, Configurações

O Meu perfil fica no menu da conta, no rodapé da barra. A ordem e os grupos vêm de `src/lib/navigation.ts` (`desktopSection`, `desktopOrder` e `navigationSectionLabels`); o grupo só aparece quando a pessoa vê pelo menos um item dele.

O menu da conta (`AuthUserMenu`, `MobileAccountMenu`) concentra perfil e saída. Um selo de ambiente (`EnvironmentBadge`) indica quando o app está em modo local ou remoto, e o sino de notificações (`NotificationBell`) mostra reservas pendentes ao coordenador e, em **Pendências**, chamados de manutenção abertos (coordenador e responsáveis, com o número de urgentes) e feedback novo (coordenador), separados das seções **Seus pedidos de compra** (novidades dos pedidos de quem não é coordenador) e **Reservas**; no rodapé, o botão para ligar os avisos no computador (`desktopAlerts.ts`, API `Notification`). Os contadores vêm de `AttentionProvider`, que também alimenta os selos do menu lateral.

A navegação deve indicar claramente a página atual e manter áreas clicáveis confortáveis.

## 10. Componentes

### AppLayout

Estrutura principal da aplicação. Deve conter cabeçalho, navegação responsiva e área de conteúdo. Em mobile, deve favorecer cabeçalho superior e navegação compacta. Em desktop, deve usar sidebar fixa e conteúdo com largura confortável.

### Sidebar

Navegação principal do desktop. Deve exibir os links das páginas previstas, estado ativo, ícones quando disponíveis e boa separação visual entre navegação e conteúdo.

### MobileNavigation

Navegação móvel com acesso rápido às áreas mais usadas. Pode ser menu recolhível ou barra inferior. Deve priorizar Dashboard, Agenda, Equipamentos e Reservas.

### PageHeader

Cabeçalho de página com título, descrição curta e, quando necessário, ação principal. Em mobile, a ação principal pode ocupar a largura total abaixo do texto.

### StatCard

Card para métricas simples do dashboard, como pesquisadores presentes, impressoras ativas, reservas do dia ou reservas pendentes. Deve conter título, valor, descrição curta e estado visual quando aplicável.

### StatusBadge

Badge textual para status de reserva, impressora ou disponibilidade. Nunca deve depender apenas de cor. Deve sempre conter texto, como "Pendente", "Aprovada", "Em manutenção" ou "Indisponível".

### Avatar

Foto de perfil com iniciais como alternativa quando a pessoa não enviou imagem.

### PasswordInput

Campo de senha com botão para mostrar ou ocultar o texto.

### TimezoneSelect

Seleção de fuso horário (lista de fusos suportados pelo navegador, com os brasileiros primeiro), usada no wizard e em Administração.

### Cards

Cards devem ser usados para listas e resumos em mobile, como pesquisadores, habilidades, impressoras e reservas. Devem ter fundo branco, borda clara, espaçamento interno confortável e hierarquia textual evidente.

### Botões

Botões devem seguir os padrões definidos neste guia. A ação principal de cada tela deve ser visualmente clara e fácil de acionar em mobile.

### Inputs

Campos de formulário devem ter label visível, área de toque confortável, borda clara, estado de foco visível e mensagens de erro textuais. Placeholder não substitui label.

**Valores em reais:** usar `MoneyInput` (`src/components/ui/MoneyInput.tsx`), que formata enquanto a pessoa digita (`1234,5` vira `1.234,5`), aceita o ponto do teclado numérico como vírgula decimal, trata valores colados como `1234.56` e limita as casas decimais. O texto do campo é lido com `parseMaskedMoney` (ponto é milhar e vírgula é decimal), e as regras ficam em `src/lib/purchases.ts` (`maskMoneyInput`). Quantidades inteiras aceitam só dígitos.

### Listas responsivas

Listas devem aparecer como cards ou linhas simples em mobile. Em desktop, podem se transformar em tabelas ou grids com mais colunas.

### Tabelas desktop

Tabelas completas devem ser usadas principalmente em desktop. Devem ter cabeçalho claro, linhas bem espaçadas, texto mínimo de `17px` e ações alinhadas de forma previsível.

## 11. Páginas

### Dashboard

Visão geral do laboratório, com resumo de presença, reservas, impressoras e alertas importantes.

### Pesquisadores

Lista e consulta de pesquisadores, vínculos acadêmicos, bolsas ou condição de voluntário, carga horária e informações básicas de perfil.

### Habilidades

Consulta e associação de habilidades técnicas dos pesquisadores, com foco em encontrar ajuda por competência.

### Agenda do Laboratório

Visualização de quem estará no laboratório em datas e horários específicos.

### Impressoras

Lista de impressoras 3D, status operacional, materiais compatíveis e acesso à agenda de uso.

### Reservas

Criação, consulta e acompanhamento de reservas manuais de impressoras 3D, com ações de aprovação e ciclo operacional para coordenadores.

### Minhas reservas e Histórico de reservas

Minhas reservas lista as reservas da pessoa autenticada. O Histórico (coordenador) reúne todas as reservas encerradas ou canceladas.

### Meu perfil

Edição de dados pessoais, foto, bolsas ou carga horária (bolsista ou voluntário) e da agenda semanal por turno.

### Usuários

Área do coordenador com perfis ativos (papel, ativação e exigência de aprovação de reservas) e convites (enviar, reenviar, revogar).

### Administração

Área do coordenador para as configurações do laboratório: identidade, fuso, capacidade presencial, dias de funcionamento, turnos e intervalos de almoço e jantar. Impressoras, materiais e bloqueios de manutenção são geridos na página Impressoras.

### Páginas públicas e de entrada

Login, aceite de convite (`/convite/aceitar`), aviso de privacidade (`/privacidade`) e o wizard de instalação (`/instalacao`).

## 12. Bibliotecas permitidas

Bibliotecas permitidas para a interface:

- Tailwind CSS;
- lucide-react;
- React Router.

Tailwind CSS deve ser usado para acelerar consistência visual e responsividade. `lucide-react` pode ser usado para ícones de navegação, ações e status. React Router organiza as páginas. A agenda é uma grade própria em Tailwind; uma biblioteca de calendário só deve entrar se a grade atual deixar de atender.

## 13. Fora do escopo por enquanto

Ainda não implementar:

- upload de arquivos;
- parser de `.gcode`;
- parser de `.3mf`;
- relatórios;
- gráficos avançados;
- integração com impressoras.

Login, agenda semanal, formulários complexos (perfil, bolsas, wizard) e a gestão de reservas já existem; novas telas devem reutilizar os componentes e padrões deste guia.
