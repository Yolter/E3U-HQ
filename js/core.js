(function(){

if(localStorage.getItem(E3U.keys.user)) return;

const user={

name:"Yolter",
role:"Founder"

};

localStorage.setItem(E3U.keys.user,JSON.stringify(user));

})();