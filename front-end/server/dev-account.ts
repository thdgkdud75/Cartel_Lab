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

  const randomIndex = Math.floor(Math.random() * 4) + 1;

  return {
    id: "0",
    name: "개발자",
    image: `/images/default_0${randomIndex}.png`,
    is_staff: true,
    class_group: "A",
    access_token: "",
    refresh_token: "",
  };
}
