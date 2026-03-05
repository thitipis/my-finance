import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    tier: string;
    language: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      tier: string;
      language: string;
    } & DefaultSession["user"];
  }
}
