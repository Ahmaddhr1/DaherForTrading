// Runs once when a new Next.js server instance starts, in both the Edge
// and Node.js runtime. Split into two require()'d files (rather than one
// file with a runtime check inline) because Next.js/webpack needs this
// exact if/else-on-NEXT_RUNTIME shape to correctly drop the Node-only
// scheduled-backup code out of the Edge bundle at build time - see
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation#specifying-the-runtime
export function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return require("./instrumentation.edge.js");
  } else {
    return require("./instrumentation.node.js");
  }
}
