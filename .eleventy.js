module.exports = function(eleventyConfig) {
    // Copia estas carpetas completas a la versión final de la web
    eleventyConfig.addPassthroughCopy("admin");
    eleventyConfig.addPassthroughCopy("assets");

    return {
        // Le decimos a Eleventy que los archivos de plantilla están en la raíz
        dir: {
            input: ".",
            includes: "_includes",
            layouts: "_layouts",
            output: "_site"
        },
        // Esta es la línea clave que faltaba:
        // Le dice a Eleventy que procese los archivos HTML con el motor Nunjucks,
        // que sí entiende el filtro "| safe".
        htmlTemplateEngine: "njk",
        passthroughFileCopy: true
    };
};