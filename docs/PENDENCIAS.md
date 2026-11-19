# Pendências conhecidas

Lista viva do que ainda precisa ser resolvido. Quando um item for concluído, remova-o daqui ou
mova-o para o histórico do PR correspondente.

## Em andamento

### E-mails de convite caem no spam

- **Sintoma:** o e-mail de convite chega, mas na caixa de spam.
- **Causa:** o remetente era um e-mail institucional (`@unifesp.br`), mas o envio é feito pelo Brevo,
  que não está autorizado a falar em nome desse domínio (faltam SPF, DKIM e DMARC).
- **Situação:** o domínio `lop3d.com.br` foi comprado e o remetente passou a ser
  `contato@lop3d.com.br` (`SMTP_FROM_EMAIL` no `.env.admin.local`). Falta autenticar o domínio no
  Brevo, publicando no DNS (Registro.br) os registros SPF, DKIM e DMARC que o Brevo indicar, e
  rodar `npm run config:remote-auth` para aplicar o remetente no Supabase.
- **Enquanto isso:** marcar o e-mail como "não é spam" ajuda nos próximos envios.
- Detalhes do SMTP: [DEPLOY.md](DEPLOY.md#e-mail-de-convites-smtp).

### Site em lop3d.com.br

- O site continua em `https://lop3d-unifesp.github.io/lab-manager/`. Para servi-lo em
  `lop3d.com.br`: apontar o DNS para o GitHub Pages, definir o domínio em *Settings → Pages*,
  trocar `VITE_BASE_PATH` no workflow para `/`, atualizar `PUBLIC_SITE_URL` e reaplicar
  `npm run config:remote-auth`.

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
