// =========================================
// E3U Router v1.0
// =========================================

const ROUTES = {
  home: "pages/home.html",
  roster: "pages/roster.html",
  truck: "pages/truck.html",
  bank: "pages/bank.html",
  cash: "pages/cash.html",
  events: "pages/events.html",
  bg: "pages/bg.html",
  forum: "pages/forum.html",
  profile: "pages/profile.html",
  settings: "pages/settings.html",
  admin: "pages/admin.html"
};

async function openPage(page) {

  try {

    if (!ROUTES[page]) return;

    const res = await fetch(ROUTES[page]);

    if (!res.ok) throw new Error();

    const html = await res.text();

    const app = document.getElementById("app");
    app.innerHTML = html;

    // Запускаем встроенные скрипты страницы
    app.querySelectorAll("script").forEach(oldScript => {

      const newScript = document.createElement("script");

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      document.body.appendChild(newScript);
      document.body.removeChild(newScript);

    });

    document.querySelectorAll(".menu-item")
      .forEach(btn => btn.classList.remove("active"));

    const active = document.querySelector(`[data-page="${page}"]`);

    if (active) active.classList.add("active");

    localStorage.setItem("e3u_last_page", page);

    if (window.renderHQBar) renderHQBar();

  } catch {

    document.getElementById("app").innerHTML = `
      <div class="page">
        <div class="card">
          <h2>❌ Ошибка</h2>
          <p>Не удалось открыть: ${page}</p>
        </div>
      </div>
    `;

  }

}

window.openPage = openPage;

document.addEventListener("DOMContentLoaded", () => {

  document.querySelectorAll("[data-page]").forEach(btn => {

    btn.addEventListener("click", () => {

      openPage(btn.dataset.page);

    });

  });
const last = localStorage.getItem("e3u_last_page") || "home";
const user = localStorage.getItem(E3U.keys.user);

if (user) {
    openPage(last);
} else {
    openPage("auth");
}

});