import { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { serverFetch, INTERNAL_API_BASE_URL } from "@/lib/api-client";
import { ApiPaths, InputTypes, Methods, Pages, Routes } from "@/constants/enums";
import { LoginBody, LoginResponse } from "@/types/user";
import { getDevUser } from "@/server/dev-account";

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string } | null> {
  try {
    const res = await fetch(`${INTERNAL_API_BASE_URL}${Routes.AUTH}${ApiPaths.REFRESH}`, {
      method: Methods.POST,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function authorizeUser(credentials: Record<string, string> | undefined): Promise<User | null> {
  const devUser = getDevUser(credentials);
  if (devUser) {
    try {
      const body: LoginBody = {
        student_id: credentials?.student_id ?? "",
        password: credentials?.password ?? "",
      };
      const djangoUser: LoginResponse = await serverFetch(`${Routes.AUTH}${ApiPaths.LOGIN}`, {
        method: Methods.POST,
        body: JSON.stringify(body),
      });
      return { ...devUser, access_token: djangoUser.access_token, refresh_token: djangoUser.refresh_token };
    } catch {
      return devUser;
    }
  }

  try {
    const body: LoginBody = {
      student_id: credentials?.student_id ?? "",
      password: credentials?.password ?? "",
    };
    const user: LoginResponse = await serverFetch(`${Routes.AUTH}${ApiPaths.LOGIN}`, {
      method: Methods.POST,
      body: JSON.stringify(body),
    });
    return {
      id: String(user.id),
      name: user.name,
      image: user.image,
      is_staff: user.is_staff,
      class_group: user.class_group,
      access_token: user.access_token,
      refresh_token: user.refresh_token,
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
        token.access_token = user.access_token;
        token.refresh_token = user.refresh_token;
        token.access_token_expires = Date.now() + 25 * 60 * 1000; // 25분 (만료 5분 전 갱신)
      }

      // 토큰 만료 전이면 그대로 반환
      if (Date.now() < (token.access_token_expires as number)) {
        return token;
      }

      // 만료됐으면 refresh
      if (token.refresh_token) {
        const refreshed = await refreshAccessToken(token.refresh_token as string);
        if (refreshed) {
          token.access_token = refreshed.access_token;
          token.access_token_expires = Date.now() + 25 * 60 * 1000;
          return token;
        }
      }

      // refresh 실패 시 세션 만료 처리
      return { ...token, error: "RefreshTokenExpired" };
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.image = token.image as string | null;
      session.user.is_staff = token.is_staff;
      session.user.class_group = token.class_group;
      session.user.access_token = token.access_token as string;
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
