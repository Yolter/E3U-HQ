// =========================================
// E3U HQ — Live Header Bar
// =========================================

function renderHQBar() {

    const bar = document.getElementById("hq-bar");

    if (!bar) return;

    // Игроки
    let players = [];

    if (window.E3U && typeof E3U.players === "function") {
        players = E3U.players();
    }

    // Банк
    let bankCount = 0;

    if (window.E3U && E3U.keys && E3U.keys.bank) {
        const bank = E3U.get(E3U.keys.bank, {});
        bankCount = Object.keys(bank).filter(
            key => bank[key]
        ).length;
    }

    // Наличка
    let cashCount = 0;

    if (window.E3U && E3U.keys && E3U.keys.cash) {
        const cash = E3U.get(E3U.keys.cash, {});
        cashCount = Object.keys(cash).filter(
            key => cash[key]
        ).length;
    }

    // Truck
    let truck = "—";

    if (
        window.E3U &&
        E3U.keys &&
        E3U.keys.truck
    ) {
        const savedTruck =
            localStorage.getItem(E3U.keys.truck);

        if (savedTruck) {
            try {
                truck = JSON.parse(savedTruck);
            } catch {
                truck = savedTruck;
            }
        }
    }

    // Пользователь
    let userName = "Гость";
    let userRole = "member";

    if (
        window.E3U &&
        E3U.keys &&
        E3U.keys.user
    ) {
        const savedUser =
            localStorage.getItem(E3U.keys.user);

        if (savedUser) {
            try {

                const user = JSON.parse(savedUser);

                if (typeof user === "object" && user !== null) {

                    userName = user.name || "Гость";
                    userRole = user.role || "member";

                } else {

                    userName = String(user);

                }

            } catch {

                userName = savedUser;

            }
        }
    }

    let roleIcon = "👤";

    if (userRole.toLowerCase() === "founder") {
        roleIcon = "👑";
    } else if (userRole.toLowerCase() === "r4") {
        roleIcon = "⭐";
    } else if (userRole.toLowerCase() === "r3") {
        roleIcon = "🥇";
    } else if (userRole.toLowerCase() === "r2") {
        roleIcon = "🥈";
    } else if (userRole.toLowerCase() === "r1") {
        roleIcon = "🥉";
    }

    bar.innerHTML = `

        <div class="badge">
            👥 ${players.length} бойцов
        </div>

        <div class="badge">
            🏦 ${bankCount}
        </div>

        <div class="badge">
            💵 ${cashCount}
        </div>

        <div class="badge">
            🚛 ${truck}
        </div>

        <div class="badge">
            ${roleIcon} ${userName}
        </div>

    `;
}

// Первый запуск
document.addEventListener(
    "DOMContentLoaded",
    renderHQBar
);

// Обновление при смене страницы
window.renderHQBar = renderHQBar;