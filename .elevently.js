module.exports = function(eleventyConfig) {
    // Le decimos a Eleventy que cree un "alias" o "acceso directo".
    // Cuando cualquier archivo pida el layout "base.html", Eleventy sabrá
    // que tiene que buscarlo en la ruta exacta "_layouts/base.html".
    eleventyConfig.addLayoutAlias("base.html", "_layouts/base.html");

    // Copia las carpetas 'admin' y 'assets' a la versión final de la web
    eleventyConfig.addPassthroughCopy("admin");
    eleventyConfig.addPassthroughCopy("assets");

    // Mantenemos el resto de la configuración igual
    return {
        dir: {
            input: ".",
            includes: "_includes",
            layouts: "_layouts",
            output: "_site"
        },
        passthroughFileCopy: true
    };
};