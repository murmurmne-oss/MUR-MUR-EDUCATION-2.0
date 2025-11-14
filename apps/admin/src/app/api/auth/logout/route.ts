import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth-config";

export async function POST() {
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}
