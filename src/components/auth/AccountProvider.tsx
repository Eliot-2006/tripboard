"use client";

import { useState, type ReactNode } from "react";
import { RepositoryProvider } from "@/lib/data/provider";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { createClient } from "@/lib/supabase/client";

/** The signed-in user's data: the same UI as the demo, backed by Supabase instead of memory. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [repository] = useState(() => new SupabaseRepository(createClient()));
  return <RepositoryProvider repository={repository}>{children}</RepositoryProvider>;
}
