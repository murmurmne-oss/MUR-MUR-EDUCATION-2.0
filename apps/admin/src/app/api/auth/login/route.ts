import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createSessionToken,
  getEnabledAuthModes,
  isAdminAuthMode,
  loadAdminAuthConfig,
  type AdminAuthMode,
} from "@/lib/admin-auth-config";

type LoginRequestPayload = {
  mode?: AdminAuthMode;
  username?: string;
  password?: string;
  userId?: string;
};

export async function POST(request: NextRequest) {
  const config = loadAdminAuthConfig();
  const availableModes = getEnabledAuthModes(config);

  if (!config || availableModes.length === 0) {
    return NextResponse.json(
      {
        message:
          "Ограничение доступа не настроено. Добавьте ADMIN_SESSION_SECRET и разрешённые способы входа.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as LoginRequestPayload;
  const requestedMode = body.mode;

  let mode: AdminAuthMode;

  if (isAdminAuthMode(requestedMode) && availableModes.includes(requestedMode)) {
    mode = requestedMode;
  } else if (!requestedMode && availableModes.includes("code")) {
    mode = "code";
  } else {
    mode = availableModes[0];
  }

  let identifier: string | null = null;

  if (mode === "credentials") {
    if (!config.credentials) {
      return NextResponse.json(
        { message: "Вход по логину и паролю отключён." },
        { status: 400 },
      );
    }

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (
      username !== config.credentials.username ||
      password !== config.credentials.password
    ) {
      return NextResponse.json(
        { message: "Неверный логин или пароль." },
        { status: 401 },
      );
    }

    identifier = config.credentials.username;
  } else if (mode === "id") {
    const userId = body.userId?.trim() ?? "";

    if (!userId || !config.allowedIds.includes(userId)) {
      return NextResponse.json(
        { message: "Доступ по ID запрещён." },
        { status: 401 },
      );
    }

    identifier = userId;
  } else {
    if (!config.accessCode) {
      return NextResponse.json(
        { message: "Доступ по коду отключён." },
        { status: 400 },
      );
    }

    const code = body.password ?? "";

    if (code !== config.accessCode) {
      return NextResponse.json(
        { message: "Неверный код доступа." },
        { status: 401 },
      );
    }

    identifier = config.accessCode;
  }

  const token = await createSessionToken(
    mode,
    identifier,
    config.sessionSecret,
  );

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 часов
  });

  return response;
}