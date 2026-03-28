/** NextAuth의 로그인 세션을 관리하는 컴포넌트 */
"use client";

import { SessionProvider } from "next-auth/react";

function NextAuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export default NextAuthSessionProvider;