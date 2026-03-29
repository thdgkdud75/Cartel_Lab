import { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbFetch } from "@/lib/api-client";
import { ApiPaths, InputTypes, Methods, Pages, Routes } from "@/constants/enums";
import { LoginBody, LoginResponse } from "@/types/user";
import { getDevUser } from "@/server/dev-account";

async function authorizeUser(credentials: Record<string, string> | undefined): Promise<User | null> {
  const devUser = getDevUser(credentials);
  if (devUser) return devUser;

  try {
    const body: LoginBody = {
      student_id: credentials?.student_id ?? "",
      password: credentials?.password ?? "",
    };
    const user: LoginResponse = await dbFetch(`${Routes.AUTH}${ApiPaths.LOGIN}`, {
      method: Methods.POST,
      body: JSON.stringify(body),
    });
    return {
      id: String(user.id),
      name: user.name,
      image: user.image,
      is_staff: user.is_staff,
      class_group: user.class_group,
    };
  } catch {
    return null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        student_id: { label: "학번", type: InputTypes.TEXT },
        password: { label: "비밀번호", type: InputTypes.PASSWORD },
      },
      authorize: authorizeUser,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.image = user.image ?? null;
        token.is_staff = user.is_staff;
        token.class_group = user.class_group;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.image = token.image as string | null;
      session.user.is_staff = token.is_staff;
      session.user.class_group = token.class_group;
      return session;
    },
  },
  pages: {
    signIn: `/${Pages.LOGIN}`,
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
};

