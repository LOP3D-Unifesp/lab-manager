import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabaseClient";
import { mapProfile, type AcademicAffiliation, type Profile } from "./domain";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  authConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: "coordinator" | "researcher";
  academic_affiliation: AcademicAffiliation | null;
  birth_date: string | null;
  is_scholarship_holder: boolean;
  weekly_workload_hours: number | null;
  lattes_url: string | null;
  cpf: string | null;
  rg: string | null;
  postal_code: string | null;
  street: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const authConfigured = Boolean(supabase);

  const refreshProfile = async () => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, academic_affiliation, birth_date, is_scholarship_holder, weekly_workload_hours, lattes_url, cpf, rg, postal_code, street, address_number, address_complement, neighborhood, city, state, country, phone, is_active, created_at, updated_at",
      )
      .eq("id", session.user.id)
      .eq("is_active", true)
      .maybeSingle<ProfileRow>();

    if (error || !data) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfile(mapProfile(data));
    setProfileLoading(false);
  };

  useEffect(() => {
    let active = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      authConfigured,
      refreshProfile,
      signIn: async (email: string, password: string) => {
        if (!supabase) {
          throw new Error("Supabase nao esta configurado.");
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        if (!supabase) {
          return;
        }

        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [authConfigured, loading, profile, profileLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
