import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  basePath: `${process.env.PAGES_BASE || ""}/next-blog`,
  trailingSlash: true,
};

export default config;
