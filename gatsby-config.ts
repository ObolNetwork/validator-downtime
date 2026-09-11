import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: "EIP-7716 Validator Downtime Calculator",
    description:
      "Interactive tool to understand how anti-correlation penalties affect validator rewards under EIP-7716",
    siteUrl: "https://validatordowntime.obol.org",
    author: "Obol Network",
  },
  // Served at the domain root via the custom domain (static/CNAME) — no path prefix.
  plugins: [
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
  ],
};

export default config;
