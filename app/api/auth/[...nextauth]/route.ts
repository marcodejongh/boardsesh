import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";

const handler = NextAuth({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // TODO: Add proper password hashing and database lookup
        // For now, this is a simple demo implementation
        if (credentials?.email && credentials?.password) {
          // In production, you'd:
          // 1. Look up user in database by email
          // 2. Verify password hash
          // 3. Return user object or null
          return {
            id: crypto.randomUUID(),
            email: credentials.email,
            name: credentials.email.split('@')[0],
          };
        }
        return null;
      }
    }),
  ],
  session: {
    strategy: "jwt", // Required for credentials provider
  },
  callbacks: {
    async session({ session, token }) {
      // Include user ID in session from JWT
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and user id to the token right after signin
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };