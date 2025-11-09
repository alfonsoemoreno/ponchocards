import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
}

export function useSupabaseAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setUser(null);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    const hydrate = async () => {
      try {
        setLoading(true);
        const { data, error: getUserError } = await supabase.auth.getUser();
        if (cancelled) return;

        if (getUserError) {
          setError(getUserError.message);
          setUser(null);
        } else {
          setUser(data.user ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error obteniendo sesión"
          );
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrate().catch(() => {
      /* handled in hydrate */
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setError(null);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      listener.subscription?.unsubscribe();
    };
  }, [configured]);

  return { user, loading, error, configured };
}
