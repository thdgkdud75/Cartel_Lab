/** 인증되지 않은 사용자에 대한 리다이렉트 처리 */
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
