const ROUTES = {
    home: "pages/home.html",
    roster: "pages/roster.html",
    truck: "pages/truck.html",
    bank: "pages/bank.html",
    cash: "pages/cash.html",
    events: "pages/events.html",
    forum: "pages/forum.html",
    profile: "pages/profile.html",
    settings: "pages/settings.html",
    admin: "pages/admin.html"
};

async function openPage(page) {

    const app = document.getElementById("app");

    try {

        const res = await fetch(ROUTES[page]);
        const html = await res.text();

        app.innerHTML = html;

        app.querySelectorAll("script").forEach(oldScript => {

            const newScript = document.createElement("script");

            newScript.textContent = oldScript.textContent;

            document.body.appendChild(newScript);
            document.body.removeChild(newScript);

        });

        renderHQBar();

    } catch {

        app.innerHTML = `
            <div class="card">
                <h2>Ошибка</h2>
                <p>Не удалось открыть страницу.</p>
            </div>
        `;

    }

}

document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-page]").forEach(btn => {

        btn.onclick = () => openPage(btn.dataset.page);

    });

    openPage("home");

});