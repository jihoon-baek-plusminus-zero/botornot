import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 빌드 시 ESLint 오류를 무시 (개발 중에는 여전히 표시됨)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 오류를 무시 (개발 중에는 여전히 표시됨)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
