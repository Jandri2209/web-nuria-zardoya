const site = require("./_data/site.json");
const pluginSitemap = require("@quasibit/eleventy-plugin-sitemap");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addPlugin(pluginSitemap, {
    sitemap: { hostname: site.url }
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["html","njk","md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
