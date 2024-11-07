/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  mode: "jit",
  purge: ["./index.html", "./libs/js/script.js"],
  theme: {
    extend: {},
  },
  plugins: [],
};
