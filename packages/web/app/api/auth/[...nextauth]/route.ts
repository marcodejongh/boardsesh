import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb } from "@/app/lib/db/db";
import * as schema from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDb();

        // Look up user by email
        const users = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, credentials.email))
          .limit(1);

        if (users.length === 0) {
          return null;
        }

        const user = users[0];

        // Get user credentials (password hash)
        const userCredentials = await db
          .select()
          .from(schema.userCredentials)
          .where(eq(schema.userCredentials.userId, user.id))
          .limit(1);

        if (userCredentials.length === 0) {
          // User exists but has no password (e.g., OAuth only)
          return null;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          userCredentials[0].passwordHash
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt", // Required for credentials provider
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async session({ session, token }) {
      // Include user ID in session from JWT
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Persist the OAuth access_token and user id to the token right after signin
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});

export { handler as GET, handler as POST };