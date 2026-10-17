import type { NextConfig } from "next";

const config: NextConfig = {
  // Gated downloads are read from disk by the /files route, so ship them with the function.
  outputFileTracingIncludes: { "/files/[...path]": ["./private/files/**/*"] },
};
export default config;
