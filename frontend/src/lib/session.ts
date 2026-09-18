import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { MyPermissions, UserPublic } from "@/lib/types";

export const ME_KEY = ["auth", "me"] as const;

export function useAuth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiGet<UserPublic | null>("/auth/me"),
    retry: false,
    staleTime: 30_000,
  });
  return { user: data ?? null, loading: isLoading, offline: isError };
}

/** Server-side truth for gating; the local mirror in lib/permissions covers instant UI. */
export function useMyPermissions() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["auth", "permissions", user?.id ?? "anon"],
    queryFn: () => apiGet<MyPermissions>("/auth/permissions"),
    retry: false,
    enabled: !!user,
  });
  return data ?? null;
}

export function useSessionActions() {
  const qc = useQueryClient();
  return {
    beginSession: async () => {
      await qc.invalidateQueries();
    },
    endSession: async () => {
      await apiPost("/auth/logout");
      qc.clear();
      await qc.invalidateQueries({ queryKey: ME_KEY });
    },
  };
}
