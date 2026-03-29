import { signIn, signOut } from "next-auth/react";
import { AuthMessages } from "@/constants/enums";

export async function login(studentId: string, password: string) {
  const result = await signIn("credentials", {
    student_id: studentId,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { success: false, message: AuthMessages.LOGIN_FAILED };
  }

  return { success: true, message: AuthMessages.LOGIN_SUCCESS };
}

export async function logout() {
  await signOut({ redirect: false });
  return { success: true, message: AuthMessages.LOGOUT_SUCCESS };
}
