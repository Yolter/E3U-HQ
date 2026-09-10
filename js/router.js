document.addEventListener("DOMContentLoaded", () => {

const sidebar = document.getElementById("sidebar");
if (!sidebar) return;

const isRoot =
location.pathname.endsWith("index.html") ||
location.pathname === "/" ||
location.pathname.endsWith("/E3U-HQ/");

const base = isRoot ? "pages/" : "";

const items = [
{ name:"Главная", icon:"🏠", page:"coming-soon.html" },
{ name:"Состав", icon:"👥", page:"coming-soon.html" },
{ name:"Аттестация", icon:"📋", page:"coming-soon.html" },
{ name:"Truck", icon:"🚛", page:"truck.html" },
{ name:"Банк", icon:"🏦", page:"bank.html" },
{ name:"Наличка", icon:"💵", page:"coming-soon.html" },
{ name:"События", icon:"📅", page:"coming-soon.html" },
{ name:"Форум", icon:"📢", page:"coming-soon.html" },
{ name:"Профиль", icon:"👤", page:"coming-soon.html" },
{ name:"Настройки", icon:"⚙️", page:"coming-soon.html" },
{ name:"Штаб", icon:"👑", page:"coming-soon.html" }
];

sidebar.innerHTML = `
<div class="logo">
<h1>E3U</h1>
<span>HQ</span>
</div>

<nav class="nav">
${items.map(i=>`
<a href="${base+i.page}" class="nav-btn">
${i.icon} ${i.name}
</a>
`).join("")}
</nav>
`;

const current = location.pathname.split("/").pop() || "index.html";

document.querySelectorAll(".nav-btn").forEach(btn=>{
const href = btn.getAttribute("href").split("/").pop();

if(current===href){
btn.classList.add("active");
}
});

});