import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/attendance/:path*",
    "/dashboard/:path*",
    "/users/:path*",
    "/mypage/:path*",
  ],
};
