function renderHQBar() {
    const users = loadUsers();
    const current = window.currentUser || { name: "Yolter", role: "Founder" };

    const count = document.getElementById("playerCount");
    const name = document.getElementById("currentUser");

    if (count) count.textContent = users.length;
    if (name) name.textContent = current.name;
}

window.renderHQBar = renderHQBar;

document.addEventListener("DOMContentLoaded", renderHQBar);