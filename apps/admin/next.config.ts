import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Увеличиваем лимит размера тела запроса для загрузки больших видео файлов
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
