const input=document.getElementById("regName");
const btn=document.getElementById("regBtn");

btn.onclick=()=>{

const name=input.value.trim();

if(!name){
alert("Введите игровой ник.");
return;
}

const role=name.toLowerCase()==="yolter"?"Founder":"Участник";

localStorage.setItem(
E3U.keys.user,
JSON.stringify({name,role})
);

location.reload();

};