import { useAuth } from "./auth";

export function getCurrentProfileId() {
  return "";
}

export function setCurrentProfileId(_profileId: string) {
  // Kept only for temporary compatibility while legacy mock flows are migrated.
}

export function useCurrentProfile() {
  const { profile } = useAuth();

  return {
    currentProfile: profile,
    currentProfileId: profile?.id ?? "",
    profiles: profile ? [profile] : [],
    setCurrentProfileId,
  };
}
