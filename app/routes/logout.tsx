import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { validateCsrfToken } from "~/helpers/security.server";
import { logout } from "~/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  await validateCsrfToken(request);
  return logout(request);
};

export const loader = async () => redirect("/");
