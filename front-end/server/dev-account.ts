import { User } from "next-auth";

const DEV_ACCOUNT = {
  student_id: process.env.DEV_STUDENT_ID ?? "dev",
  password: process.env.DEV_PASSWORD ?? "dev1234",
};

export function getDevUser(credentials: Record<string, string> | undefined): User | null {
  if (
    process.env.NODE_ENV !== "development" ||
    credentials?.student_id !== DEV_ACCOUNT.student_id ||
    credentials?.password !== DEV_ACCOUNT.password
  ) {
    return null;
  }

  return {
    id: "0",
    name: "개발자",
    image: null,
    is_staff: true,
    class_group: "A",
  };
}
