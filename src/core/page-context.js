// page-context.js — hozir qaysi sahifa va qaysi topshiriq ochiq (yordamchi uchun).
// Generator sahifasi har yangi topshiriqda yangilaydi; yordamchi AI'ga faqat shu qisqa ma'lumotni beradi.

let ctx = { route: 'home' };
export const setPageContext = c => { ctx = { ...c }; };
export const getPageContext = () => ctx;
