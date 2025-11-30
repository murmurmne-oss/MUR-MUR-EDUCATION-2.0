import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Увеличиваем лимит размера тела запроса для загрузки больших видео файлов
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // Увеличиваем лимит для middleware и route handlers (Next.js 16+)
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
