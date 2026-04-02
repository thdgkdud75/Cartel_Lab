import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { Routes, ApiPaths, Pages } from "@/constants/enums";
import { serverFetch } from "@/lib/api-client";
import { DEV_APP_URL } from "@/constants/urls";

const CALLBACK_URI = `${process.env.NEXTAUTH_URL || DEV_APP_URL}/api/github/callback`;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(`${Routes.USERS}?github=error`, req.url));
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL(`/${Pages.LOGIN}`, req.url));
  }

  try {
    await serverFetch(`${Routes.AUTH}${ApiPaths.GITHUB_CALLBACK}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.user.access_token}`,
      },
      body: JSON.stringify({ code, redirect_uri: CALLBACK_URI }),
    });

    return NextResponse.redirect(new URL(`${Routes.USERS}?github=success`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`${Routes.USERS}?github=error`, req.url));
  }
}
