import { createContext, useContext, useEffect, useState } from "react";
import {
  carregarLocalDatabase,
  criarLocalProfile,
  criarLocalUser,
  salvarLocalDatabase,
} from "./localDatabase";

export type User = {
  id: string;
  username: string;
  profile_id: string;
  first_name: string;
  last_name: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export type SignupData = {
  first_name: string;
  last_name: string;
  age: number;
  cpf: string;
  email: string;
  phone: string;
  academic_affiliation: "graduacao" | "mestrado" | "doutorado";
  presence_status: "virtual" | "presencial";
  username: string;
  password: string;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("lab-manager:user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const database = await carregarLocalDatabase();
    const foundUser = database.users.find(
      (u) => u.username === username && u.password === password
    );
    if (foundUser) {
      const profile = database.profiles.find((p) => p.id === foundUser.profile_id);
      if (profile) {
        const userData: User = {
          id: foundUser.id,
          username: foundUser.username,
          profile_id: foundUser.profile_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
        setUser(userData);
        localStorage.setItem("lab-manager:user", JSON.stringify(userData));
        return true;
      }
    }
    return false;
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    const database = await carregarLocalDatabase();

    // Check if username already exists
    if (database.users.some((u) => u.username === data.username)) {
      return false;
    }

    // Create profile
    const profile = criarLocalProfile({
      first_name: data.first_name,
      last_name: data.last_name,
      academic_affiliation: data.academic_affiliation,
      presence_status: data.presence_status,
      email: data.email,
      phone: data.phone,
    });

    // Create user
    const user = criarLocalUser({
      username: data.username,
      password: data.password,
      profile_id: profile.id,
    });

    // Save to database
    await salvarLocalDatabase({
      ...database,
      profiles: [...database.profiles, profile],
      users: [...database.users, user],
    });

    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lab-manager:user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}