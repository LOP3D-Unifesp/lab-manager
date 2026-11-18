import { useAuth } from "./auth";

export function useCurrentProfile() {
  const { profile } = useAuth();

  return { currentProfile: profile };
}
