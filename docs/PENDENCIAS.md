# Pendências conhecidas

Lista viva do que ainda precisa ser resolvido. Quando um item for concluído, remova-o daqui ou
mova-o para o histórico do PR correspondente.

## Segurança e operação

- **Rotacionar credenciais usadas em testes.** Durante a configuração do ambiente de teste, um
  token de acesso do Supabase e uma chave SMTP do Brevo foram compartilhados fora dos cofres
  habituais. Revogue ambos (Supabase: *Account → Access Tokens*; Brevo: *SMTP & API → Chaves SMTP*),
  gere novos e atualize o `.env.admin.local`.
- **Login de teste público.** O coordenador de teste (`admin@lab.local`) usa a mesma senha do
  ambiente local, que está no README. Por isso o ambiente de teste na nuvem só pode conter dados
  fictícios. Antes de qualquer uso real, troque a senha ou crie um projeto separado.
- **Migrations manuais.** Aplicar migrations no Supabase hospedado é um passo manual
  (`supabase db push`). Automatizar isso no CI exigiria guardar um token de acesso como *Secret* do
  GitHub e é uma decisão em aberto.
- **Projeto gratuito do Supabase pausa por inatividade.** Se o site de teste parar de responder,
  reative o projeto no painel.

## Qualidade e interface

- **Fonte Dosis.** O Tailwind e o `index.css` configuram a fonte `Dosis`, mas o `index.html` não a
  carrega. Verificar se ela aparece no navegador ou se cai na fonte padrão do sistema.
- **Sem testes de navegador.** A suíte E2E com Playwright foi removida para simplificar o CI. A
  cobertura atual é: testes unitários (Vitest), testes de banco (pgTAP) e teste de concorrência de
  reservas. Se regressões de interface aparecerem com frequência, avaliar uma alternativa leve.
- **Telas estreitas.** O layout do formulário "Complete seu perfil" foi corrigido, mas outras telas
  não passaram por uma revisão sistemática em celular.

## Funcionalidades previstas e ainda não feitas

- **Busca por habilidade.** Prevista na Fase 3 do MVP. Hoje a lista de Pesquisadores filtra só por
  vínculo e não mostra as habilidades de cada pessoa.

## Funcionalidades futuras (pós-MVP)

- Upload de arquivos `.gcode` e `.3mf`.
- Extração automática de metadados de `.gcode`.
- Sugestão automática de horários.
- Relatórios de uso.
- Endereço próprio para o site (domínio do laboratório no GitHub Pages).
