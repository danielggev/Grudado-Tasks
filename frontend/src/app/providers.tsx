import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { criaQueryClient } from "./query-client";

export function Providers({
  children,
  queryClient = criaQueryClient(),
}: {
  children: ReactNode;
  /** Injetavel para que testes montem a arvore com cache proprio e isolado. */
  queryClient?: QueryClient;
}) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
