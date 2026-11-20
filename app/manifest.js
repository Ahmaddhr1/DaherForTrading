// Enables "Add to Home Screen" on Android/Chrome with the app's icon.
// iOS uses app/apple-icon.png instead, but this doesn't hurt there either.
export default function manifest() {
  return {
    name: "Invento",
    short_name: "Invento",
    description: "Trade and inventory management",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B0B35",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
