import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    signOut: "/handler/sign-out",
    accountSettings: "/handler/account-settings",
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/",
  },
});
