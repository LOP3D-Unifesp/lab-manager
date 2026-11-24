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

## 3. Fontes

O sistema usa duas fontes, ambas embutidas no projeto (pacotes `@fontsource-variable/*`, importados em `src/main.tsx`). Nenhuma fonte é buscada em servidor externo, o que funciona offline e não envia o IP de quem usa a terceiros.

- **Dosis** para títulos: `h1` a `h4`, números de destaque (`StatCard`) e a marca. É aplicada automaticamente a todo `h1`-`h4` em `src/index.css`; para um texto que não é título, use a classe `font-display`.
- **Montserrat** para textos: corpo, formulários, tabelas, botões e menus (é a fonte padrão do `body`, `font-sans` no Tailwind).

```css
/* títulos */ font-family: "Dosis Variable", system-ui, sans-serif;
/* textos  */ font-family: "Montserrat Variable", system-ui, sans-serif;
```

**Escala.** A Montserrat é mais larga que a Dosis, então o `font-size` raiz é `15px` (`src/index.css`) e todos os tamanhos em `rem` do Tailwind partem dele (`text-base` = 15px, `text-sm` ≈ 13px). Os títulos usam tamanhos fixos em px.

A tipografia deve manter boa legibilidade, com hierarquia clara.

## 4. Paleta institucional do LO&P3D

A marca tem quatro cores. Cada uma tem um papel fixo na interface:

| Cor | Hex | Papel |
| --- | --- | --- |
| Azul | `#0095d9` | Cor primária: navegação e ação principal |
| Verde | `#00a651` | Confirmação, disponibilidade, estados positivos |
| Magenta | `#ec008c` | **Destaque de marca**, com uso moderado: item ativo do menu, filete sob o título da página, marcador de "novo", o "&" do LO&P3D |
| Amarelo | `#ffcb05` | Alerta ou atenção, sempre com texto escuro |

Cores de apoio: fundo `#f8fafc`, superfície `#ffffff`, borda `#dbe3ea`, texto `#102033`, texto secundário `#5f6b7a` e **vermelho `#dc2626` reservado para erro**, cancelamento, falha e ações destrutivas. O magenta não substitui o vermelho, para não ser confundido com um problema.

Os tokens vivem em `src/index.css` como canais RGB (`--c-primary`, `--c-accent`, ...), com valores para o tema claro (`:root`) e o escuro (`.dark`), e são expostos no Tailwind em `tailwind.config.ts` (`primary`, `success`, `warning`, `danger`, `accent`, cada um com `-dark` e `-soft`).

**Magenta e contraste.** `#ec008c` sobre branco tem contraste de 4,25:1, abaixo de 4,5:1 para texto pequeno. Por isso:

- `accent` (magenta puro) só em elementos gráficos e textos grandes;
- `text-accent-dark` (`#be0070`, 6,1:1 sobre branco) para texto pequeno em magenta;
- `accent-soft` para fundos suaves.

No tema escuro, os tokens do magenta ficam mais claros (`accent` `#ff4db3`, `accent-dark` `#ff8cc8`) para manter o contraste.

### Marca provisória

Ainda não há identidade profissional. Enquanto isso, `src/components/ui/BrandMark.tsx` reúne a marca provisória: `BrandMark` (o acrônimo em Dosis, com o "&" em magenta), `BrandStripe` (faixa com as quatro cores) e `BRAND_COLORS` (cores exatas da marca, iguais nos dois temas). Aparecem no login e nas telas públicas (convite, privacidade, instalação). Quando existir uma identidade definitiva, basta trocar esse arquivo.

## 5. Contraste e acessibilidade

A interface deve seguir boas práticas compatíveis com WCAG.

Regras obrigatórias:

- evitar textos de corpo menores que `15px` (a escala base; rótulos auxiliares podem ir até `13px`);
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

**Valores em reais:** usar `MoneyInput` (`src/components/ui/MoneyInput.tsx`), que mostra os centavos sempre: cada dígito digitado entra pela direita (`1` vira `0,01`, `150` vira `1,50`, `15059` vira `150,59`), com ponto de milhar; pontos e vírgulas digitados são ignorados e colar um valor completo (`1.234,56`, `1234.56`) é respeitado. O texto do campo é lido com `parseMaskedMoney` (ponto é milhar, vírgula é decimal) e o valor numérico vira texto com `formatMoneyField`; as regras ficam em `src/lib/purchases.ts` (`maskCentsInput`). Quantidades inteiras aceitam só dígitos.

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
