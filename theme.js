// Runs in the <head>, before the page is drawn, so a saved light/dark choice never flashes the
// other theme first. With no saved choice, styles.css follows the device setting on its own.
(function () {
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") document.documentElement.dataset.theme = saved;
  } catch (e) {}
})();
