import { expect, test, type Browser, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const runId = Date.now();
const skillName = `Modelagem E2E ${runId}`;
const materialName = `PLA E2E ${runId}`;
const printerName = `Impressora E2E ${runId}`;
const bookingName = `Prótese E2E ${runId}`;
const approvalBookingName = `Reserva para aprovação E2E ${runId}`;
const invitedEmail = `pesquisador.e2e.${runId}@example.com`;
const invitedPassword = "Pesquisador123!";

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// O laboratório de testes usa Pacific/Auckland como fuso; datas de reserva
// precisam ser calculadas nesse fuso, não no do navegador.
function dataNoFusoDoLab(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loginAsCoordinator(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@lab.local");
  await page.getByLabel("Senha", { exact: true }).fill("LabManager123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(instalacao)?$/);
  await expect(page.getByRole("heading", { name: /Dashboard|Configure seu laboratório/ })).toBeVisible();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(/\/(instalacao)?$/);
  await expect(page.getByRole("heading", { name: /Dashboard|Configure seu laboratório/ })).toBeVisible();
}

async function criarReservaSimples(page: Page, projectName: string, indiceSlot = 0) {
  await page.goto("/reservas");
  await expect(page.getByRole("heading", { name: printerName })).toBeVisible();
  await page.getByRole("button", { name: "Criar reserva" }).click();
  const bookingDialog = page.getByRole("dialog");
  await bookingDialog.getByLabel("Nome da impressão").fill(projectName);
  await bookingDialog.locator("label").filter({ hasText: /^Material/ }).locator("select").selectOption({ label: materialName });

  const dateInput = bookingDialog.locator('input[type="date"]');
  const startSelect = bookingDialog
    .locator("label")
    .filter({ hasText: /^Inicio/ })
    .locator("select");

  let startTime = "";
  for (let dias = 0; dias <= 1 && !startTime; dias += 1) {
    await dateInput.fill(dataNoFusoDoLab(dias));
    startTime = await startSelect.evaluate(
      (element, indice) => {
        const habilitadas = Array.from((element as HTMLSelectElement).options).filter(
          (option) => !option.disabled && option.value,
        );
        return habilitadas[indice]?.value ?? "";
      },
      indiceSlot,
    );
  }
  expect(startTime).not.toBe("");
  await startSelect.selectOption(startTime);
  await bookingDialog.getByLabel("Tempo (h)").fill("0.5");
  await bookingDialog.getByRole("radio", { name: new RegExp(printerName) }).check();
  await page.getByRole("button", { name: "Salvar reserva" }).click();
  await expect(bookingDialog).toBeHidden();
  await expect(page.getByText(projectName).first()).toBeVisible();
}

test("instalação e autenticação do coordenador", async ({ page }) => {
  await loginAsCoordinator(page);

  if (page.url().endsWith("/instalacao")) {
    await page.getByLabel("Nome completo").fill("Laboratório E2E");
    await page.getByLabel("Sigla").fill("LE2E");
    await page.getByLabel(/Contato institucional/).fill("privacidade.e2e@example.com");
    await page.getByRole("button", { name: /Continuar/ }).click();
    await page.getByRole("button", { name: /Concluir/ }).click();
    await page.waitForURL("/");
  }

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("coordenador gerencia habilidades e acessa convites pelos pesquisadores", async ({ page }) => {
  await loginAsCoordinator(page);
  await page.goto("/habilidades");
  await page.getByRole("button", { name: "Nova habilidade" }).click();
  await page.getByLabel("Nome", { exact: true }).fill(skillName);
  await page.getByLabel("Descrição").fill("Competência criada pelo teste end-to-end.");
  await page.getByRole("button", { name: "Salvar habilidade" }).click();
  await expect(page.getByText(skillName)).toBeVisible();

  const skillCard = page.locator("section > div").filter({ has: page.getByRole("heading", { name: skillName }) });
  await skillCard.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Habilidade ativa").uncheck();
  await page.getByRole("button", { name: "Salvar habilidade" }).click();
  await expect(skillCard.getByText("Inativa")).toBeVisible();

  await page.goto("/pesquisadores");
  await page.getByRole("link", { name: /Gerenciar convites/ }).click();
  await expect(page).toHaveURL(/usuarios\/convites/);
});

test("coordenador configura capacidade, dias, turnos e fuso", async ({ page }) => {
  await loginAsCoordinator(page);
  await page.goto("/administracao");
  await page.getByLabel("Espaços de trabalho").fill("12");
  await page.getByLabel("Fuso horário").fill("Pacific/Auckland");
  await page.getByLabel("Sábado", { exact: true }).check();
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByText("Configurações do laboratório atualizadas.")).toBeVisible();

  await expect(page.getByText("Almoço", { exact: true })).toBeVisible();
  await expect(page.getByText("Jantar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar intervalo Almoço" }).click();
  await expect(page.getByRole("button", { name: "Adicionar turno" })).toBeDisabled();
  const lunchEditor = page.getByText("Editar intervalo de almoço").locator("..");
  await lunchEditor.getByLabel("Fim").fill("13:15");
  await lunchEditor.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("12h–13h15", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar intervalo Almoço" }).click();
  const restoreLunchEditor = page.getByText("Editar intervalo de almoço").locator("..");
  await restoreLunchEditor.getByLabel("Fim").fill("13:30");
  await restoreLunchEditor.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("12h–13h30", { exact: true })).toBeVisible();

  const addedPeriod = page.getByText("6h–7h", { exact: true });
  if (await addedPeriod.count() === 0) {
    await page.getByRole("button", { name: "Adicionar turno" }).click();
    const newEditor = page.getByText("Novo turno").locator("..");
    await newEditor.getByLabel("Início").fill("06:00");
    await newEditor.getByLabel("Fim").fill("07:00");
    await newEditor.getByRole("button", { name: "Salvar", exact: true }).click();
  }
  await expect(addedPeriod).toBeVisible();

  await page.getByRole("button", { name: "Editar turno 6h–7h" }).click();
  await expect(page.getByRole("button", { name: "Adicionar turno" })).toBeDisabled();
  const editEditor = page.getByText("Editar 6h–7h").locator("..");
  await editEditor.getByLabel("Fim").fill("07:15");
  await editEditor.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("6h–7h15", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Desativar turno 6h–7h15" }).click();
  await expect(page.getByRole("button", { name: "Ativar turno 6h–7h15" })).toBeVisible();
  await page.getByRole("button", { name: "Ativar turno 6h–7h15" }).click();
  await expect(page.getByRole("button", { name: "Desativar turno 6h–7h15" })).toBeVisible();
  await page.getByRole("button", { name: "Editar turno 6h–7h15" }).click();
  const restoreEditor = page.getByText("Editar 6h–7h15").locator("..");
  await restoreEditor.getByLabel("Fim").fill("07:00");
  await restoreEditor.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("6h–7h", { exact: true })).toBeVisible();

  await page.goto("/agenda");
  await expect(page.getByText(/\/12/).first()).toBeVisible();
  await expect(page.getByText("8h–10h").first()).toBeVisible();
  await expect(page.getByText("08:00 - 10:00")).toHaveCount(0);
  const agendaLunch = page.getByRole("separator", { name: "Almoço: 12h–13h30" });
  await expect(agendaLunch).toBeVisible();
  await expect(agendaLunch.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("separator", { name: "Jantar: 17h30–19h" })).toBeVisible();

  await page.getByRole("button", { name: "Registrar horario" }).click();
  const availabilityDialog = page.getByRole("dialog");
  const dialogLunchBreaks = availabilityDialog.getByRole("separator", { name: "Almoço: 12h–13h30" });
  await expect(dialogLunchBreaks).toHaveCount(6);
  await expect(dialogLunchBreaks.first().getByRole("checkbox")).toHaveCount(0);
  await availabilityDialog.getByRole("button", { name: "Fechar" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("separator", { name: "Almoço: 12h–13h30" })).toBeVisible();
  await expect(page.getByRole("separator", { name: "Jantar: 17h30–19h" })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/perfil");
  const profileLunch = page.getByRole("separator", { name: "Almoço: 12h–13h30" });
  await expect(profileLunch).toBeVisible();
  await expect(profileLunch.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("separator", { name: "Jantar: 17h30–19h" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("separator", { name: "Almoço: 12h–13h30" })).toBeVisible();
  await expect(page.getByRole("separator", { name: "Jantar: 17h30–19h" })).toBeVisible();
});

test("usuários mantém um único item ativo e redireciona a rota antiga", async ({ page }) => {
  await loginAsCoordinator(page);
  await page.goto("/administracao/convites");
  await expect(page).toHaveURL(/usuarios\/convites/);
  await expect(page.getByRole("link", { name: "Usuários", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Administração", exact: true })).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Ativos", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Convites", exact: true })).toHaveAttribute("aria-current", "page");
});

test("coordenador cadastra material, impressora e compatibilidade", async ({ page }) => {
  await loginAsCoordinator(page);
  await page.goto("/impressoras");
  await page.getByLabel("Nome do material").fill(materialName);
  await page.getByRole("button", { name: "Adicionar material" }).click();
  await expect(page.getByText(materialName).first()).toBeVisible();

  await page.getByRole("button", { name: "Cadastrar impressora" }).click();
  await page.getByLabel("Nome", { exact: true }).fill(printerName);
  await page.getByLabel("Modelo").fill("Modelo E2E");
  await page.getByLabel("Local").fill("Bancada E2E");
  await page.getByLabel(materialName).check();
  await page.getByRole("button", { name: "Salvar impressora" }).click();
  await expect(page.getByRole("heading", { name: printerName })).toBeVisible();
});

test("reserva pode ser criada, editada, concluída e protegida por manutenção", async ({ page }) => {
  await loginAsCoordinator(page);
  await page.goto("/reservas");
  await expect(page.getByRole("heading", { name: printerName })).toBeVisible();
  await page.getByRole("button", { name: "Criar reserva" }).click();
  const bookingDialog = page.getByRole("dialog");
  await bookingDialog.getByLabel("Nome da impressão").fill(bookingName);
  await bookingDialog.locator("label").filter({ hasText: /^Material/ }).locator("select").selectOption({ label: materialName });
  const dateInput = bookingDialog.locator('input[type="date"]');
  const startSelect = bookingDialog
    .locator("label")
    .filter({ hasText: /^Inicio/ })
    .locator("select");

  let startTime = "";
  for (let dias = 0; dias <= 1 && !startTime; dias += 1) {
    await dateInput.fill(dataNoFusoDoLab(dias));
    startTime = await startSelect.evaluate((element) => {
      const options = Array.from((element as HTMLSelectElement).options);
      return options.find((option) => !option.disabled && option.value)?.value ?? "";
    });
  }
  expect(startTime).not.toBe("");
  await startSelect.selectOption(startTime);
  await bookingDialog.getByLabel("Tempo (h)").fill("1.5");
  await bookingDialog.getByRole("radio", { name: new RegExp(printerName) }).check();
  await page.getByRole("button", { name: "Salvar reserva" }).click();
  await expect(page.getByText(bookingName).first()).toBeVisible();

  await page.getByRole("button", { name: `Editar reserva ${bookingName}` }).first().click();
  await page.getByRole("dialog").getByLabel("Nome da impressão").fill(`${bookingName} revisada`);
  await page.getByRole("button", { name: "Atualizar reserva" }).click();
  await expect(page.getByText(`${bookingName} revisada`).first()).toBeVisible();

  await page.getByRole("button", { name: "Em andamento", exact: true }).click();
  await page.getByRole("button", { name: "Concluída", exact: true }).click();
  await expect(page.getByText(/Concluída/).first()).toBeVisible();

  await page.getByRole("button", { name: "Bloquear manutenção" }).click();
  const maintenanceDialog = page.getByRole("dialog");
  await maintenanceDialog.getByLabel("Impressora").selectOption({ label: printerName });
  await maintenanceDialog.getByLabel("Data", { exact: true }).fill(futureDate(8));
  await maintenanceDialog.getByLabel("Início", { exact: true }).fill("14:00");
  await maintenanceDialog.getByLabel("Fim", { exact: true }).fill("16:00");
  await maintenanceDialog.getByLabel("Motivo").fill("Revisão preventiva E2E");
  await page.getByRole("button", { name: "Criar bloqueio" }).click();
  await expect(maintenanceDialog).toBeHidden();
  await page.locator("section").filter({ hasText: "Agenda por impressora" }).getByLabel("Data").fill(futureDate(8));
  await expect(page.getByText("Manutenção: Revisão preventiva E2E").first()).toBeVisible();
});

test("convite é aceito e pesquisador permanece sem ações administrativas", async ({ page, request }) => {
  await loginAsCoordinator(page);
  await page.goto("/usuarios/convites");
  await page.getByLabel("E-mail").fill(invitedEmail);
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByText(invitedEmail)).toBeVisible();

  const listResponse = await request.get("http://127.0.0.1:55324/api/v1/messages");
  expect(listResponse.ok()).toBeTruthy();
  const list = await listResponse.json();
  const message = list.messages.find((item: { To?: Array<{ Address?: string }> }) =>
    item.To?.some((recipient) => recipient.Address === invitedEmail),
  );
  expect(message).toBeTruthy();
  const messageResponse = await request.get(`http://127.0.0.1:55324/api/v1/message/${message.ID}`);
  const body = await messageResponse.json();
  const html = String(body.HTML ?? "").replaceAll("&amp;", "&");
  const link = html.match(/http:\/\/127\.0\.0\.1:5173\/convite\/aceitar\?[^"<]+/)?.[0];
  expect(link).toBeTruthy();

  await page.goto(link!.replace("127.0.0.1:5173", "localhost:5173"));
  await page.getByRole("button", { name: "Aceitar convite" }).click();
  await page.getByLabel("Crie uma senha").fill("Pesquisador123!");
  await page.getByLabel("Confirme a senha").fill("Pesquisador123!");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nome completo").fill("Pesquisador E2E");
  await page.getByRole("button", { name: "Criar perfil" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/habilidades");
  await expect(page.getByRole("button", { name: "Nova habilidade" })).toHaveCount(0);
  await page.goto("/reservas");
  await expect(page.getByRole("button", { name: "Bloquear manutenção" })).toHaveCount(0);
  await page.goto("/impressoras");
  await expect(page.getByRole("button", { name: "Cadastrar impressora" })).toHaveCount(0);
});

test("pesquisador é notificado da decisão do coordenador sobre sua reserva", async ({ page, browser }: { page: Page; browser: Browser }) => {
  await login(page, invitedEmail, invitedPassword);
  await criarReservaSimples(page, approvalBookingName);

  // A solicitação recém-criada não deve gerar notificação para o próprio solicitante.
  const sinoPesquisador = page.getByRole("button", { name: "Atualizações das suas reservas" }).first();
  await expect(sinoPesquisador).toBeVisible();
  await expect(sinoPesquisador.locator("span")).toHaveCount(0);

  // O coordenador recebe a notificação e aprova a reserva em outro contexto.
  const contextoCoordenador = await browser.newContext();
  const paginaCoordenador = await contextoCoordenador.newPage();
  await loginAsCoordinator(paginaCoordenador);
  await paginaCoordenador.goto("/reservas");
  const secaoPendentes = paginaCoordenador
    .locator("section")
    .filter({ hasText: "Reservas aguardando aprovação" });
  await expect(secaoPendentes.getByText(approvalBookingName)).toBeVisible();
  await secaoPendentes.getByRole("button", { name: "Aprovar" }).first().click();
  await expect(secaoPendentes.getByText(approvalBookingName)).toHaveCount(0);
  await contextoCoordenador.close();

  // O pesquisador recebe a notificação de aprovação em tempo real, com o autor.
  await expect(sinoPesquisador).toContainText("1", { timeout: 15000 });
  await sinoPesquisador.click();
  const notificacaoAprovada = page.locator('a[href="/reservas/minhas"]').filter({ hasText: approvalBookingName });
  await expect(notificacaoAprovada).toBeVisible();
  await expect(notificacaoAprovada.getByText("Aprovada", { exact: true })).toBeVisible();
  await expect(notificacaoAprovada.getByText("Aprovada por Administrador Local")).toBeVisible();

  // Abrir o sino marca as notificações como vistas e zera o badge.
  await expect(sinoPesquisador.locator("span")).toHaveCount(0);

  // A notificação leva o pesquisador para a página Minhas reservas.
  await notificacaoAprovada.click();
  await expect(page).toHaveURL(/\/reservas\/minhas/);
  await expect(page.getByRole("heading", { name: "Minhas reservas" })).toBeVisible();
  await expect(page.getByText(approvalBookingName).first()).toBeVisible();
  await expect(page.getByText(`Aprovada por Administrador Local`).first()).toBeVisible();

  // Cancelamento pelo pesquisador notifica o coordenador.
  const nomeCancelada = `${approvalBookingName} cancelável`;
  await criarReservaSimples(page, nomeCancelada, 1);
  const contextoAprovacao = await browser.newContext();
  const paginaAprovacao = await contextoAprovacao.newPage();
  await loginAsCoordinator(paginaAprovacao);
  await paginaAprovacao.goto("/reservas");
  const secaoAprovacao = paginaAprovacao
    .locator("section")
    .filter({ hasText: "Reservas aguardando aprovação" });
  await expect(secaoAprovacao.getByText(nomeCancelada)).toBeVisible();
  await secaoAprovacao.getByRole("button", { name: "Aprovar" }).first().click();
  await expect(secaoAprovacao.getByText(nomeCancelada)).toHaveCount(0);
  await contextoAprovacao.close();

  // A agenda já está na data da reserva criada; o botão de cancelar aparece na
  // seção "Reservas de ...".
  await page.getByRole("button", { name: `Cancelar reserva ${nomeCancelada}` }).first().click();
  await page.getByRole("button", { name: "Cancelar reserva", exact: true }).click();
  await expect(page.getByRole("button", { name: `Cancelar reserva ${nomeCancelada}` })).toHaveCount(0);

  const contextoCancelamento = await browser.newContext();
  const paginaCancelamento = await contextoCancelamento.newPage();
  await loginAsCoordinator(paginaCancelamento);
  const sinoCoordenador = paginaCancelamento
    .getByRole("button", { name: "Reservas aguardando aprovação" })
    .first();
  await expect(sinoCoordenador).toContainText("1", { timeout: 15000 });
  await sinoCoordenador.click();
  const notificacaoCancelada = paginaCancelamento
    .locator('a[href="/reservas/historico"]')
    .filter({ hasText: nomeCancelada });
  await expect(notificacaoCancelada).toBeVisible();
  await expect(notificacaoCancelada.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(notificacaoCancelada.getByText("Cancelada por Pesquisador E2E")).toBeVisible();
  await contextoCancelamento.close();
});
