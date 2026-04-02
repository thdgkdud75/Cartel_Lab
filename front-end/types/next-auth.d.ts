import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    is_staff: boolean;
    class_group: string;
    access_token: string;
    refresh_token: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      image: string | null;
      is_staff: boolean;
      class_group: string;
      access_token: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    image: string | null;
    is_staff: boolean;
    class_group: string;
    access_token: string;
    refresh_token: string;
    access_token_expires: number;
    error?: string;
  }
}
