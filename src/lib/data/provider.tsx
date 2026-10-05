"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Repository } from "./repository";

const RepositoryContext = createContext<Repository | null>(null);

export function RepositoryProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
    </QueryClientProvider>
  );
}

export function useRepository(): Repository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error("useRepository must be used inside RepositoryProvider");
  return repo;
}
