// /admin/preview.js
(function () {
  'use strict';
  const CMS = window.CMS;
  const h = window.h;
  if (!CMS || !h) return;

  // Estilos básicos en la preview
  CMS.registerPreviewStyle("https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css");

  /* ========= Helpers ========= */
  const withAsset = (entry, field, getAsset) => {
    const v = entry.getIn(["data", field]);
    if (!v) return null;
    const a = getAsset(v);
    return a ? a.toString() : v;
  };
  const toArray = (v) =>
    (v && typeof v.toArray === "function" ? v.toArray() : Array.isArray(v) ? v : []);
  const getText = (item, key) =>
    item && item.get ? (item.get(key) ?? item) : (item && typeof item === "object" ? (item[key] ?? item) : item);

  // Carga única de embed.js y reprocesado
  function ensureInstagramProcessed() {
    function process() {
      try { if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(); } catch (_e) {}
    }
    if (!window.__ig_script_loaded__) {
      const s = document.createElement("script");
      s.src = "https://www.instagram.com/embed.js";
      s.async = true;
      s.onload = () => setTimeout(process, 0);
      document.body.appendChild(s);
      window.__ig_script_loaded__ = true;
    } else {
      setTimeout(process, 0);
    }
  }

  /* ========= Preview: Recetas ========= */
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
            h("img", { src: Img, alt: `Imagen de ${T}`, className: "rounded-xl shadow-lg w-full max-h-96 object-cover" }),
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
                  ingredients.map((ing, i) => h("li", { key: `ing-${i}` }, String(getText(ing, "item"))))
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
                steps.map((s, idx) => h("li", { key: `step-${idx}`, className: "relative bg-white border border-gray-200 rounded-xl p-4 pl-12 shadow-sm" }, [
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

  /* ========= Preview: Blog ========= */
  const PostPreview = ({ entry, widgetFor, getAsset }) => {
    const T   = entry.getIn(["data","title"]) || entry.get("slug") || "Título";
    const D   = entry.getIn(["data","description"]) || "";
    const Img = withAsset(entry, "image", getAsset) || "";
    const Cat = entry.getIn(["data","category"]) || "Blog";
    const date = entry.getIn(["data","date"]);
    const dateText = date ? new Date(date).toLocaleDateString("es-IS", { day:"2-digit", month:"long", year:"numeric" }) : null; // es-ES también sirve

    const gallery = toArray(entry.getIn(["data","gallery"])).map((g) => {
      const val = g && g.get ? (g.get("image") ?? g) : g;
      const a = val ? getAsset(val) : null;
      return a ? a.toString() : (val ? String(val) : "");
    }).filter(Boolean);

    // Instagram
    const igUrl   = (entry.getIn(["data","instagram_url"]) || "").trim();
    const igEmbed = (entry.getIn(["data","instagram_embed"]) || "").trim();

    let igNode = null;
    if (igEmbed) {
      igNode = h("div", { className: "my-8", dangerouslySetInnerHTML: { __html: igEmbed } });
      ensureInstagramProcessed();
    } else if (igUrl) {
      const src = igUrl.replace(/\/?$/, "/") + "embed";
      igNode = h("div", { className: "my-8" }, [
        h("iframe", {
          src,
          allowtransparency: "true",
          allow: "encrypted-media",
          frameborder: "0",
          height: "600",
          width: "100%",
          className: "w-full rounded-xl border border-gray-200 shadow"
        })
      ]);
      // No hace falta embed.js para el iframe, pero no molesta si está
      ensureInstagramProcessed();
    }

    return h("div", {}, [
      h("section", { className: "bg-white" }, [
        h("div", { className: "container mx-auto px-6 py-10 max-w-4xl" }, [
          h("p", { className: "text-sm text-green-700 font-semibold mb-2" }, Cat),
          h("h1", { className: "text-4xl font-bold text-gray-900 mb-3" }, T),
          D ? h("p", { className: "text-lg text-gray-600 mb-4" }, D) : null,
          dateText ? h("div", { className: "text-sm text-gray-500 mb-6" }, dateText) : null,

          Img ? h("img", {
            src: Img,
            alt: `Imagen de ${T}`,
            className: "rounded-xl shadow w-full object-cover mb-8",
            style: { maxHeight: "24rem" }
          }) : null,

          // Galería horizontal
          gallery.length ? h("div", { className: "mb-8" }, [
            h("div", { className: "overflow-x-auto flex gap-4 pb-2" },
              gallery.map((src, idx) =>
                h("img", {
                  key: `g-${idx}`,
                  src,
                  alt: `Imagen ${idx + 1} de ${T}`,
                  className: "rounded-xl shadow object-cover",
                  style: { minWidth: "60%", maxHeight: "22rem" }
                })
              )
            ),
            h("div", { className: "flex justify-center gap-2 mt-2" },
              gallery.map((_, idx) =>
                h("span", { key: `dot-${idx}`, className: "w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" })
              )
            )
          ]) : null,

          // Instagram
          igNode,

          // Cuerpo
          h("article", { className: "max-w-none" }, widgetFor ? widgetFor("body") : null),

          // Volver
          h("div", { className: "mt-10" }, [
            h("a", { href: "#", className: "inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-full cursor-not-allowed" }, "← Volver al blog")
          ])
        ])
      ])
    ]);
  };

  CMS.registerPreviewTemplate("blog", PostPreview);
})();
