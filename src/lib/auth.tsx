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
import type { LocalProfile } from "./localDatabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: LocalProfile | null;
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
  academic_affiliation: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function splitName(fullName: string) {
  const [firstName = fullName, ...lastParts] = fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastParts.join(" "),
  };
}

function mapProfileRow(row: ProfileRow): LocalProfile {
  const { firstName, lastName } = splitName(row.full_name);

  return {
    id: row.id,
    full_name: row.full_name,
    first_name: firstName,
    last_name: lastName,
    academic_affiliation: row.academic_affiliation ?? "",
    presence_status: "No laboratorio",
    email: row.email,
    phone: row.phone ?? "",
    skills: [],
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
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
        "id, full_name, email, role, academic_affiliation, phone, is_active, created_at, updated_at",
      )
      .eq("id", session.user.id)
      .eq("is_active", true)
      .maybeSingle<ProfileRow>();

    if (error || !data) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfile(mapProfileRow(data));
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
