import { NextRequest, NextResponse } from "next/server";

// Увеличиваем лимит размера тела запроса для загрузки больших видео файлов
export const maxDuration = 600; // 10 минут для загрузки больших файлов
export const runtime = 'nodejs';

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
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const resolvedParams = await params;
  return proxyRequest(request, resolvedParams.path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  // В Next.js переменные окружения доступны через process.env
  // Но для серверных компонентов они должны быть загружены во время выполнения
  const apiKey = process.env.API_KEY?.trim();
  
  // Логирование для диагностики (временно включено для отладки)
  console.log("[Proxy] API_KEY present:", !!apiKey);
  console.log("[Proxy] API_KEY length:", apiKey?.length || 0);
  console.log("[Proxy] All env vars with API:", Object.keys(process.env).filter(k => k.includes('API')));
  
  if (!apiKey) {
    console.error("[Proxy] API_KEY не найден в переменных окружения");
    console.error("[Proxy] Available env vars:", Object.keys(process.env).slice(0, 20));
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
  
  // Логирование для диагностики
  if (process.env.NODE_ENV !== "production") {
    console.log("[Proxy] Request:", method, url.toString());
    console.log("[Proxy] Headers:", Object.keys(headers));
  }

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
    // Логирование для диагностики загрузки файлов
    if (contentType?.includes("multipart/form-data")) {
      console.log("[Proxy] Processing multipart/form-data upload");
      if (body instanceof FormData) {
        const file = body.get("file");
        if (file instanceof File) {
          console.log("[Proxy] File size:", file.size, "bytes (", Math.round(file.size / 1024 / 1024), "MB)");
          console.log("[Proxy] File type:", file.type);
        }
      }
    }

    // Создаем AbortController для управления таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10 * 60 * 1000); // 10 минут

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("[Proxy] Request timeout after 10 minutes");
        return NextResponse.json(
          { message: "Загрузка файла превысила максимальное время ожидания (10 минут)" },
          { status: 408 },
        );
      }
      throw error;
    }

    const responseData = await response.text();
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = responseData;
    }

  // Логирование для диагностики (временно включено для отладки)
  if (!response.ok) {
    console.error("[Proxy] Response status:", response.status);
    console.error("[Proxy] Response data:", typeof jsonData === "string" ? jsonData.substring(0, 500) : jsonData);
  }

    return NextResponse.json(jsonData, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[Proxy] Request failed:", error);
    return NextResponse.json(
      { message: "Ошибка при запросе к API", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

