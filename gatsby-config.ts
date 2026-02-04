import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: "EIP-7716 Validator Downtime Calculator",
    description:
      "Interactive tool to understand how anti-correlation penalties affect validator rewards under EIP-7716",
    siteUrl: "https://validatordowntime.obol.tech",
    author: "Obol Network",
  },
  pathPrefix: "/",
  plugins: [
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
  ],
};

export default config;
