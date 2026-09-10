// =========================================
// E3U HQ Events v1.0
// Таймеры Тайного рынка и Battle Ground
// =========================================

const EVENTS_KEY="e3u_events";

function nextSecretMarket(){

    const target=new Date();

    // Всегда следующий день
    target.setDate(target.getDate()+1);

    // По текущему расписанию проекта
    target.setHours(17,0,0,0);

    return target;

}

function nextBS(){

    const saved=localStorage.getItem(EVENTS_KEY);

    if(saved){

        const date=new Date(saved);

        if(date>new Date()) return date;

    }

    const target=new Date();

    target.setDate(target.getDate()+7);
    target.setHours(18,0,0,0);

    return target;

}

function saveBS(date){

    localStorage.setItem(EVENTS_KEY,date);

}

function format(diff){

    if(diff<0) diff=0;

    const d=Math.floor(diff/86400000);
    diff%=86400000;

    const h=Math.floor(diff/3600000);
    diff%=3600000;

    const m=Math.floor(diff/60000);
    diff%=60000;

    const s=Math.floor(diff/1000);

    return{
        d,h,m,s
    };

}

function updateTimers(){

    const market=document.getElementById("marketTimer");
    const marketText=document.getElementById("marketText");

    if(market){

        const t=format(nextSecretMarket()-new Date());

        market.textContent=
        `${t.d}д ${String(t.h).padStart(2,"0")}ч ${String(t.m).padStart(2,"0")}м ${String(t.s).padStart(2,"0")}с`;

        const left=nextSecretMarket()-new Date();

        if(left<=300000){

            marketText.textContent="🚨 ВСЕМ В СЕТЬ";

        }else if(left<=900000){

            marketText.textContent="🟠 Сбор в штаб";

        }else if(left<=3600000){

            marketText.textContent="🟡 Скоро открытие";

        }else{

            marketText.textContent="💰 Дон такого не прощает.";

        }

    }

    const bs=document.getElementById("bsTimer");

    if(bs){

        const t=format(nextBS()-new Date());

        bs.textContent=
        `${t.d}д ${String(t.h).padStart(2,"0")}ч ${String(t.m).padStart(2,"0")}м ${String(t.s).padStart(2,"0")}с`;

    }

}

window.saveBS=saveBS;
window.updateTimers=updateTimers;

setInterval(updateTimers,1000);