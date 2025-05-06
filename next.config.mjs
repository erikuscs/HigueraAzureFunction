import createNextIntlPlugin from "next-intl/plugin";
import nextIntlConfig from "./next-intl.config.mjs";

/** @type {import('next').NextConfig} */
const withNextIntl = createNextIntlPlugin(nextIntlConfig);

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.lorem.space",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "a0.muscache.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
