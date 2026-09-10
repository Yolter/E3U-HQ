window.E3U_PERMISSIONS = (function () {

  function apply() {

    if (!window.E3U_AUTH) return;

    const canManage = E3U_AUTH.isR4();

    document.querySelectorAll("[data-founder]").forEach(el => {
      el.style.display = E3U_AUTH.isFounder() ? "" : "none";
    });

    document.querySelectorAll("[data-r4]").forEach(el => {
      el.style.display = canManage ? "" : "none";
    });

  }

  return { apply };

})();

document.addEventListener("DOMContentLoaded", () => {
  E3U_PERMISSIONS.apply();
});