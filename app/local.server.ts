import { createCookieSessionStorage } from "react-router";
import invariant from "tiny-invariant";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

export const localSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__local",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export async function getLocalSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return localSessionStorage.getSession(cookie);
}
