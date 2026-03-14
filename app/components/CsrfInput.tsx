import { useCsrfToken } from "~/hooks/useCsrfToken";

export function CsrfInput() {
  const token = useCsrfToken();
  return <input type="hidden" name="csrf" value={token} />;
}
