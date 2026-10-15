import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              const status = (error as Error & { status?: number }).status;
              return failureCount < 2 && status !== 401 && status !== 403;
            },
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
}
