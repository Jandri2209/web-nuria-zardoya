/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./**/*.njk",
    "./**/*.md",
    "./**/*.js",
    "!./node_modules/**",
    "!./_site/**"
  ],
  theme: { extend: {} },
  safelist: [
    // Clases que tu JS añade/quita dinámicamente
    "w-0","w-56","opacity-0","opacity-100",
    "invisible","visible","!visible","!opacity-100","!translate-y-0",
    "cursor-wait","opacity-60",
    "ring-2","ring-green-300"
  ]
};
