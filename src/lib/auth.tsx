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
import { mergeMyProfile, type LabSettings, type MyProfile, type PublicProfile } from "./domain";
import type { Tables } from "./database.types";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: MyProfile | null;
  labSettings: LabSettings | null;
  loading: boolean;
  profileLoading: boolean;
  installationLoading: boolean;
  authConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshInstallation: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [labSettings, setLabSettings] = useState<LabSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [installationLoading, setInstallationLoading] = useState(true);
  const authConfigured = Boolean(supabase);

  const refreshProfile = async () => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    const [publicResult, privateResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, academic_affiliation, funding_grants:profile_funding_grants(agency, agency_other, grant_name, weekly_hours, monthly_value), weekly_workload_hours, lattes_url, nationality_country_code, phone, bio, is_active, requires_booking_approval, avatar_url, created_at, updated_at",
        )
        .eq("id", session.user.id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("profile_private_data")
        .select(
          "profile_id, birth_date, cpf, rg, postal_code, street, address_number, address_complement, neighborhood, city, state, country, created_at, updated_at",
        )
        .eq("profile_id", session.user.id)
        .maybeSingle(),
    ]);

    if (publicResult.error || privateResult.error || !publicResult.data || !privateResult.data) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfile(
      mergeMyProfile(
        publicResult.data as unknown as Omit<PublicProfile, "first_name" | "last_name">,
        privateResult.data as Tables<"profile_private_data">,
      ),
    );
    setProfileLoading(false);
  };

  const refreshInstallation = async () => {
    if (!supabase || !session?.user.id) {
      setLabSettings(null);
      setInstallationLoading(false);
      return;
    }

    if (!labSettings) setInstallationLoading(true);
    const { data, error } = await supabase
      .from("lab_settings")
      .select(
        "id, name, acronym, timezone, workspace_capacity, operating_weekdays, lunch_starts_at, lunch_ends_at, dinner_starts_at, dinner_ends_at, privacy_contact_email, setup_completed_at, created_by, updated_by, created_at, updated_at",
      )
      .eq("id", true)
      .maybeSingle();

    setLabSettings(error ? null : (data as LabSettings | null));
    setInstallationLoading(false);
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
    refreshInstallation();
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      labSettings,
      loading,
      profileLoading,
      installationLoading,
      authConfigured,
      refreshProfile,
      refreshInstallation,
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
        setLabSettings(null);
      },
    }),
    [
      authConfigured,
      installationLoading,
      labSettings,
      loading,
      profile,
      profileLoading,
      session,
    ],
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
