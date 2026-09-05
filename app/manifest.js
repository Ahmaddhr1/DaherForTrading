// Enables "Add to Home Screen" on Android/Chrome with the app's icon.
// iOS uses app/apple-icon.png instead, but this doesn't hurt there either.
export default function manifest() {
  return {
    name: "M.D.T - Daher For Trading",
    short_name: "MDT",
    description: "Admin Panel",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1300EE",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
