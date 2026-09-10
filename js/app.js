// =========================================
// E3U App
// =========================================

document.addEventListener("DOMContentLoaded",()=>{

    if(window.renderHQBar){

        renderHQBar();

    }

});const badge = document.getElementById("userBadge");
const user = JSON.parse(localStorage.getItem(E3U.keys.user) || "null");

if (badge && user) {
  const icon = user.role === "Founder" ? "👑" : "🧑";
  badge.textContent = `${icon} ${user.name}`;
}