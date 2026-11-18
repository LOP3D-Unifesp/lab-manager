// Links antigos de convite podem chegar com barra dupla (".../lab-manager//convite/aceitar").
// O router é criado ao importar ./routes, então a URL é corrigida antes disso.
const { pathname, search, hash } = window.location;
if (pathname.includes("//")) {
  window.history.replaceState(null, "", `${pathname.replace(/\/{2,}/g, "/")}${search}${hash}`);
}
