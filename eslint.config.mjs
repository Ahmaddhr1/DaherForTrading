import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Structure rules (see ARCHITECTURE.md). A violation fails `npm run lint`
// and therefore CI.
const OLD_PATHS = [
  { group: ["@/lib/*", "@/models/*"], message: "lib/ and models/ moved into core/<domain>/ - see ARCHITECTURE.md." },
];

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    // Everywhere: the old flat folders are gone.
    rules: { "no-restricted-imports": ["error", { patterns: OLD_PATHS }] },
  },
  {
    // core/ is the base product: it never depends on add-on modules, on the
    // Next.js routes/pages in app/, or on HTTP (services throw ServiceError,
    // routes turn it into a response).
    files: ["core/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...OLD_PATHS,
            { group: ["@/modules/*", "@/modules/**"], message: "core/ must never import an add-on module." },
            { group: ["@/app/*", "@/app/**"], message: "core/ must not import routes or pages from app/." },
          ],
        },
      ],
    },
  },
  {
    // modules/ are add-ons: they build on core/ but never on routes/pages,
    // and module services stay HTTP-free like core services.
    files: ["modules/**/*.{js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...OLD_PATHS, { group: ["@/app/*", "@/app/**"], message: "modules/ must not import routes or pages from app/." }] },
      ],
    },
  },
  {
    files: ["modules/**/service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "next/server", message: "Services don't speak HTTP - throw ServiceError instead." }],
          patterns: [...OLD_PATHS, { group: ["@/app/*", "@/app/**"], message: "modules/ must not import routes or pages from app/." }],
        },
      ],
    },
  },
  {
    files: ["core/**/*Service.js", "core/reports/dailyClosing.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "next/server", message: "Services don't speak HTTP - throw ServiceError instead." }], patterns: OLD_PATHS },
      ],
    },
  },
];

export default eslintConfig;
