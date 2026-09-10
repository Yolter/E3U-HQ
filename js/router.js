const app = document.getElementById("app");

async function openPage(page) {
  const res = await fetch(`pages/${page}.html`);
  const html = await res.text();

  app.innerHTML = html;

  // Запускаем все скрипты страницы заново
  app.querySelectorAll("script").forEach(oldScript => {
    const script = document.createElement("script");

    if (oldScript.type) script.type = oldScript.type;
    if (oldScript.src) {
      script.src = oldScript.src;
    } else {
      script.textContent = oldScript.textContent;
    }

    oldScript.replaceWith(script);
  });

  // Подсветка активной кнопки меню
  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });
}

// Навигация
document.querySelectorAll("[data-page]").forEach(btn => {
  btn.onclick = () => openPage(btn.dataset.page);
});

// Открываем новую главную
openPage("home");