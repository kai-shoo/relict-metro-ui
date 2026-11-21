const today = new Date();
const date = document.querySelector("#today");
date.dateTime = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
  .map((value) => String(value).padStart(2, "0"))
  .join("-");
date.querySelector(".day-number").textContent = new Intl.DateTimeFormat("en", { day: "numeric" }).format(today);
date.querySelector(".month-name").textContent = new Intl.DateTimeFormat("en", { month: "short" }).format(today);
