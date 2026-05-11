import { useEffect, useState } from "react";

import {
  carregarLocalDatabase,
  observarLocalDatabase,
  type LocalProfile,
} from "./localDatabase";

const STORAGE_KEY = "lab-manager:current-profile-id";
const STORAGE_EVENT = "lab-manager:current-profile-atualizado";

export function getCurrentProfileId() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setCurrentProfileId(profileId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, profileId);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useCurrentProfile() {
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [currentProfileId, setCurrentProfileIdState] = useState(
    getCurrentProfileId(),
  );

  useEffect(() => {
    let ativo = true;

    const atualizarProfiles = async () => {
      const database = await carregarLocalDatabase();
      const ativos = database.profiles.filter((profile) => profile.is_active);
      const profileSalvo = getCurrentProfileId();
      const profileAtualExiste = ativos.some(
        (profile) => profile.id === profileSalvo,
      );
      const proximoProfileId = profileAtualExiste ? profileSalvo : ativos[0]?.id ?? "";

      if (proximoProfileId && proximoProfileId !== profileSalvo) {
        setCurrentProfileId(proximoProfileId);
      }

      if (ativo) {
        setProfiles(ativos);
        setCurrentProfileIdState(proximoProfileId);
      }
    };

    const atualizarUsuario = () => {
      if (ativo) {
        setCurrentProfileIdState(getCurrentProfileId());
      }
    };

    atualizarProfiles();
    const pararObservacaoDatabase = observarLocalDatabase(atualizarProfiles);
    window.addEventListener(STORAGE_EVENT, atualizarUsuario);
    window.addEventListener("storage", atualizarUsuario);

    return () => {
      ativo = false;
      pararObservacaoDatabase();
      window.removeEventListener(STORAGE_EVENT, atualizarUsuario);
      window.removeEventListener("storage", atualizarUsuario);
    };
  }, []);

  const currentProfile =
    profiles.find((profile) => profile.id === currentProfileId) ?? null;

  return {
    currentProfile,
    currentProfileId,
    profiles,
    setCurrentProfileId,
  };
}
