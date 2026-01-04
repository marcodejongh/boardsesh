'use client';

import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
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
