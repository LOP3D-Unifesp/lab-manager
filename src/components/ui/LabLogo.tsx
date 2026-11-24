import { ReactNode, useEffect, useState } from "react";

import type { PublicLabIdentity } from "../../lib/domain";
import { useTheme } from "../../lib/theme";
import { getPublicLabIdentity } from "../../lib/supabaseRepository";

type LogoUrls = { logo_light_url?: string | null; logo_dark_url?: string | null; favicon_url?: string | null };

// A identidade pública é pedida uma vez por carregamento da página e reaproveitada entre telas.
let cachedIdentity: PublicLabIdentity | null | undefined;
let pendingIdentity: Promise<PublicLabIdentity | null> | null = null;

/** Identidade pública do laboratório (nome, sigla, logo), disponível sem login. */
export function usePublicLabIdentity() {
  const [identity, setIdentity] = useState<PublicLabIdentity | null>(cachedIdentity ?? null);

  useEffect(() => {
    if (cachedIdentity !== undefined) return;
    let active = true;
    pendingIdentity ??= getPublicLabIdentity()
      .then((data) => (cachedIdentity = data))
      .catch(() => (cachedIdentity = null));
    pendingIdentity.then((data) => active && setIdentity(data));
    return () => {
      active = false;
    };
  }, []);

  return identity;
}

/** Troca o ícone da aba pelo logo; ao sair da tela, restaura o anterior. */
function useFavicon(url: string | null) {
  useEffect(() => {
    if (!url) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const created = !link;
    const previous = link?.href ?? null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
    return () => {
      if (!link) return;
      if (created) link.remove();
      else if (previous) link.href = previous;
    };
  }, [url]);
}

type LabLogoProps = {
  logos: LogoUrls | null | undefined;
  /** O que mostrar enquanto não há logo enviado (a marca provisória ou o acrônimo). */
  fallback: ReactNode;
  alt: string;
  className?: string;
  /** Usa o logo também como ícone da aba do navegador. */
  favicon?: boolean;
};

/** Logo do laboratório. Escolhe a versão do tema; sem versão escura, usa a clara sobre uma plaquinha branca. */
export function LabLogo({ alt, className = "", favicon = false, fallback, logos }: LabLogoProps) {
  const { resolved } = useTheme();
  const light = logos?.logo_light_url ?? null;
  const dark = logos?.logo_dark_url ?? null;
  const url = resolved === "dark" ? (dark ?? light) : (light ?? dark);
  const onPlate = resolved === "dark" && !dark && Boolean(light);

  // O ícone da aba não troca com o tema: usa o favicon próprio e, sem ele, o logo.
  useFavicon(favicon ? (logos?.favicon_url ?? light ?? dark) : null);

  if (!url) return <>{fallback}</>;

  return (
    <img
      src={url}
      alt={alt}
      className={["object-contain", onPlate ? "rounded-md bg-white p-1" : "", className].join(" ")}
    />
  );
}
