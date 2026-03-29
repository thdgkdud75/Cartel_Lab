import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    is_staff: boolean;
    class_group: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      is_staff: boolean;
      class_group: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    is_staff: boolean;
    class_group: string;
  }
}
