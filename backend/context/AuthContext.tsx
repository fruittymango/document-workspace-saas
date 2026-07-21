"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { redirect } from "next/navigation";
import { SessionUser } from "@/lib/types";
import { fetchUser } from "@/lib/api";

interface AuthContextType {
  refreshUser: () => Promise<void>;
  isAuthLoading: boolean;
  user?: SessionUser;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<SessionUser>();

  const loadUser = async (silent = false) => {
    if (!silent) {
      setIsAuthLoading(true);
    }
    fetchUser("/api/protected/user")
      .then((result) => {
        if (!result) {
          redirect("/login");
        }
        if (!result.user.license_id) {
          redirect("/onboarding");
        }
        setUser(result.user);
      })
      .catch((err) => {})
      .finally(() => !silent && setIsAuthLoading(false));
  };

  useEffect(() => {
    setIsMounted(true);
    loadUser();
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        refreshUser: loadUser,
        isAuthLoading,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useApp must be used within an AuthProvider");
  }
  return context;
}
