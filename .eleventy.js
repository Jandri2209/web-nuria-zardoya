// .eleventy.js
module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: { input: ".", includes: "_includes", layouts: "_layouts", output: "_site" },
    templateFormats: ["html", "njk", "md"],  // ← añade md
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"            // ← procesa Markdown con Nunjucks
  };
};
