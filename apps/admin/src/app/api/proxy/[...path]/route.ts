import { NextRequest, NextResponse } from "next/server";

function normalizeBaseUrl(rawValue: string | undefined) {
  let base = rawValue?.trim();
  if (!base || base.length === 0) {
    base =
      process.env.NODE_ENV === "production"
        ? "https://api.murmurmne.com"
        : "http://localhost:4000";
  }

  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }

  return base.replace(/\.+$/, "").replace(/\/+$/, "");
}

const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { message: "API_KEY не настроен на сервере" },
      { status: 500 },
    );
  }

  const path = `/${pathSegments.join("/")}`;
  const url = new URL(path, API_BASE_URL);
  
  // Копируем query параметры
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers: HeadersInit = {
    "X-API-Key": apiKey,
  };

  // Для FormData не устанавливаем Content-Type, браузер сам установит с boundary
  const contentType = request.headers.get("content-type");
  let body: BodyInit | undefined;

  if (method !== "GET" && method !== "DELETE") {
    if (contentType?.includes("multipart/form-data")) {
      // Для FormData используем formData() напрямую
      body = await request.formData();
      // Не устанавливаем Content-Type для FormData - fetch сам добавит boundary
    } else {
      // Для JSON и других типов
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
      body = await request.text();
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    const responseData = await response.text();
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = responseData;
    }

    return NextResponse.json(jsonData, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy request failed:", error);
    return NextResponse.json(
      { message: "Ошибка при запросе к API" },
      { status: 500 },
    );
  }
}

