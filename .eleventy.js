// .eleventy.js
const site = require("./_data/site.json");
const pluginSitemap = require("@quasibit/eleventy-plugin-sitemap");

module.exports = function(eleventyConfig) {
  // Archivos que pasan tal cual
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("images");

  // .eleventy.js
  eleventyConfig.addPassthroughCopy({
    "favicon.ico": "favicon.ico",
    "favicon-16x16.png": "favicon-16x16.png",
    "favicon-32x32.png": "favicon-32x32.png",
    "apple-touch-icon.png": "apple-touch-icon.png",
    "android-chrome-192x192.png": "android-chrome-192x192.png",
    "android-chrome-512x512.png": "android-chrome-512x512.png",
    "site.webmanifest": "site.webmanifest",
    "sw.js": "sw.js"
  });

  // Sitemap
  eleventyConfig.addPlugin(pluginSitemap, {
    sitemap: { hostname: site.url }
  });

  // Filtro 'date'
  eleventyConfig.addFilter("date", (value, locale = "es-ES", options = {}) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d)) return "";
    const opts = Object.keys(options).length
      ? options
      : { year: "numeric", month: "long", day: "2-digit" };
    return new Intl.DateTimeFormat(locale, opts).format(d);
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
