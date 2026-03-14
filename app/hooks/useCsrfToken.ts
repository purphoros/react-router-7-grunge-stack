import { useRouteLoaderData } from "react-router";

export function useCsrfToken(): string {
  const data = useRouteLoaderData("root") as
    | { csrfToken?: string }
    | undefined;
  return data?.csrfToken ?? "";
}
