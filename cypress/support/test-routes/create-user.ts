import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { createUser } from "~/models/user.server";
import { createUserSession } from "~/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "test routes should not be enabled in production",
    );
    return redirect("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }

  const { email } = await request.json();
  if (!email) {
    throw new Error("email required for login");
  }
  if (!email.endsWith("@example.com")) {
    throw new Error("All test emails must end in @example.com");
  }

  const user = await createUser(email, "myreallystrongpassword");

  return createUserSession({
    redirectTo: "/",
    remember: true,
    request,
    userId: user.id,
  });
};

export default null;
