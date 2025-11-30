import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Увеличиваем лимит размера тела запроса для загрузки больших видео файлов
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  // Для API routes в App Router нужно использовать другой подход
  // Лимиты устанавливаются через переменные окружения или в route handlers
};

export default nextConfig;
