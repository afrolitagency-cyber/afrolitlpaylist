import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe half of the auth config. Middleware runs on the Edge runtime, which
 * cannot load Prisma or bcrypt, so it only decodes the JWT using this config.
 * The Credentials provider (which needs the database) is added in auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.uid as string,
        role: token.role as Role,
      };
      return session;
    },
  },
} satisfies NextAuthConfig;
