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
    "/certifications/:path*",
    "/contests/:path*",
    "/blog/:path*",
    "/users/:path*",
    "/seats/:path*",
    "/timetable/:path*",
    "/quiz/:path*",
    "/planner/:path*",
    "/jobs/:path*",
    "/mypage/:path*",
  ],
};
