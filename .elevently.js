module.exports = function(eleventyConfig) {
    // Pasa los archivos estáticos (como la carpeta admin) a la salida final
    eleventyConfig.addPassthroughCopy("admin");
    eleventyConfig.addPassthroughCopy("assets");

    return {
        dir: {
            input: ".",
            includes: "_includes",
            layouts: "_layouts",
            output: "_site" // La carpeta final donde se construye la web
        },
        passthroughFileCopy: true,
        templateFormats: ["html", "md", "njk"],
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk"
    };
};