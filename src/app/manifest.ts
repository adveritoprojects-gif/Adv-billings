import { PRODUCT_NAME } from "@/utils/branding";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: `${PRODUCT_NAME} — Business Management Platform by Adverito`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#465fff",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
