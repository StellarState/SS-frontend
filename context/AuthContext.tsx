"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import * as Freighter from "@stellar/freighter-api";
import { requestAuthChallenge, verifyAuthChallenge, signChallengeWithTimeout } from "@/lib/auth";

export interface AuthContextType {
  jwt: string | null;
  address: string | null;
  isConnecting: boolean;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [jwt, setJwt] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const loginWithWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Step 1: Check wallet connection / request access
      let userAddr: string | null = null;
      let isConnected = false;
      
      try {
        isConnected = await Freighter.isConnected();
      } catch {
        isConnected = false;
      }

      if (!isConnected) {
        try {
          userAddr = await Freighter.requestAccess();
        } catch (err: any) {
          const msg = err?.message?.toLowerCase() || "";
          if (
            msg.includes("cancel") ||
            msg.includes("decline") ||
            msg.includes("user rejected") ||
            msg.includes("reject")
          ) {
            throw new Error("Connection cancelled");
          }
          throw err;
        }
      } else {
        userAddr = await Freighter.getPublicKey();
      }

      if (!userAddr) {
        throw new Error("Connection cancelled");
      }

      // Step 2: Present Stellar challenge transaction
      const { challengeXdr } = await requestAuthChallenge(userAddr);

      // Step 3: Sign challenge with 60-second timeout
      const signedXdr = await signChallengeWithTimeout(challengeXdr);

      // Step 4: Verify challenge and get JWT
      const { token } = await verifyAuthChallenge(userAddr, signedXdr);

      // Store JWT in auth context memory on valid signature
      setJwt(token);
      setAddress(userAddr);
    } catch (err: any) {
      // Ensure no JWT is stored on any failure case
      setJwt(null);
      
      const errorMessage = err?.message || "Authentication failed";
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const logout = useCallback(() => {
    setJwt(null);
    setAddress(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        jwt,
        address,
        isConnecting,
        loginWithWallet,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
