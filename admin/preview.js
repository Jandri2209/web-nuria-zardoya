// /admin/preview.js
(function () {
  const CMS = window.CMS;
  const h = window.h;
  if (!CMS || !h) return;

  // Estilos para el preview (mantén el CDN de Tailwind mientras no tengas CSS propio)
  CMS.registerPreviewStyle("https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css");

  const withAsset = (entry, field, getAsset) => {
    const v = entry.getIn(["data", field]);
    if (!v) return null;
    const asset = getAsset(v);
    return asset ? asset.toString() : v;
  };
  const toArray = (v) => (v && typeof v.toArray === "function" ? v.toArray() : Array.isArray(v) ? v : []);
  const getText = (item, key) =>
    item && item.get ? (item.get(key) ?? item) : (item && typeof item === "object" ? (item[key] ?? item) : item);

  const RecipePreview = ({ entry, getAsset }) => {
    const T   = entry.getIn(["data","title"]) || entry.get("slug") || "Título";
    const D   = entry.getIn(["data","description"]) || "Receta saludable de Nuria Zardoya";
    const Img = withAsset(entry, "image", getAsset) || "/images/nuria-zardoya-hero-640.jpg";
    const Cat = entry.getIn(["data","category"]) || "Receta";

    const date       = entry.getIn(["data","date"]);
    const servings   = entry.getIn(["data","servings"]);
    const time       = entry.getIn(["data","time"]);
    const difficulty = entry.getIn(["data","difficulty"]);

    const ingredients = toArray(entry.getIn(["data","ingredients"]));
    const steps       = toArray(entry.getIn(["data","steps"]));

    const dateText = date ? new Date(date).toLocaleDateString("es-ES", { day:"2-digit", month:"long", year:"numeric" }) : null;

    return h("div", {}, [
      // ===== HERO =====
      h("section", { className: "bg-white" }, [
        h("div", { className: "container mx-auto px-6 py-12 max-w-5xl grid md:grid-cols-2 gap-10 items-center" }, [
          h("div", {}, [
            h("p", { className: "text-sm text-green-700 font-semibold mb-2" }, Cat),
            h("h1", { className: "text-4xl md:text-5xl font-bold text-gray-900 mb-4" }, T),
            h("p", { className: "text-lg text-gray-600 mb-6" }, D),
            h("div", { className: "flex flex-wrap gap-4 text-sm text-gray-500" }, [
              dateText   ? h("span", {}, `📅 ${dateText}`) : null,
              servings   ? h("span", {}, `🍽️ ${servings} raciones`) : null,
              time       ? h("span", {}, `⏱️ ${time} min`) : null,
              difficulty ? h("span", {}, `🔥 ${difficulty}`) : null,
            ].filter(Boolean)),
          ]),
          h("div", {}, [
            h("img", { src: Img, alt: `Imagen de ${T}`, className: "rounded-xl shadow-lg w-full max-h-[400px] object-cover" }),
          ]),
        ]),
      ]),

      // ===== CUERPO =====
      h("article", { className: "container mx-auto px-6 py-12 max-w-4xl" }, [
        // Ingredientes + Info rápida
        h("section", { className: "grid md:grid-cols-2 gap-8 mb-10" }, [
          ingredients.length
            ? h("div", {}, [
                h("div", { className: "flex items-center justify-between mb-3" }, [
                  h("h2", { className: "text-2xl font-semibold" }, "Ingredientes"),
                  h("button", { className: "text-sm bg-green-100 text-green-800 font-semibold py-2 px-4 rounded-full cursor-not-allowed", disabled: true }, "Copiar"),
                ]),
                h("ul", { className: "list-disc pl-5 space-y-1 text-gray-800" },
                  ingredients.map((ing, i) => h("li", { key: i }, String(getText(ing, "item"))))
                ),
              ])
            : null,

          h("div", { className: "bg-green-50 border border-green-100 rounded-xl p-5" }, [
            h("h2", { className: "text-2xl font-semibold mb-3" }, "Información rápida"),
            h("ul", { className: "space-y-1 text-gray-800" }, [
              servings   ? h("li", {}, [h("strong", {}, "Raciones: "), String(servings)]) : null,
              time       ? h("li", {}, [h("strong", {}, "Tiempo: "), `${time} min`]) : null,
              difficulty ? h("li", {}, [h("strong", {}, "Dificultad: "), String(difficulty)]) : null,
              Cat        ? h("li", {}, [h("strong", {}, "Categoría: "), String(Cat)]) : null,
            ].filter(Boolean)),
          ]),
        ].filter(Boolean)),

        // Pasos
        steps.length
          ? h("section", { className: "mt-6" }, [
              h("h2", { className: "text-2xl font-semibold mb-4" }, "Preparación"),
              h("ol", { className: "space-y-4" },
                steps.map((s, idx) => h("li", { key: idx, className: "relative bg-white border border-gray-200 rounded-xl p-4 pl-12 shadow-sm" }, [
                  h("span", { className: "absolute left-4 top-4 inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold" }, String(idx + 1)),
                  h("p", { className: "text-gray-800 leading-relaxed" }, String(getText(s, "step"))),
                ]))
              ),
            ])
          : null,

        // Acciones (desactivadas en preview)
        h("div", { className: "mt-12 flex flex-wrap gap-4" }, [
          h("a", { href: "#", className: "inline-flex items-center gap-2 bg-gray-100 text-gray-800 font-semibold py-3 px-6 rounded-full cursor-not-allowed" }, "← Volver a recetas"),
          h("button", { className: "inline-flex items-center gap-2 bg-green-600 text-white font-semibold py-3 px-6 rounded-full shadow cursor-not-allowed", disabled: true }, "Imprimir receta"),
        ]),
      ]),
    ]);
  };

  CMS.registerPreviewTemplate("recetas", RecipePreview);
})();
