const fs = require('fs');

const keys = {
  damagesTitle: { uz: 'Shikastlar', ru: 'Повреждения' },
  noDamageRecords: { uz: "Shikast yozuvlari yo'q", ru: 'Нет записей о повреждениях' },
  damageRecords: { uz: "ta shikast yozuvi", ru: 'записей о повреждениях' },
  addFirstDamage: { uz: "+ Birinchi shikastni qo'shing", ru: '+ Добавить первое повреждение' },
  newDamageTitle: { uz: 'Yangi shikast', ru: 'Новое повреждение' },
  addNewDamageBtn: { uz: "+ Yangi shikast qo'shish", ru: '+ Добавить новое повреждение' },
  damagePart: { uz: 'QISM', ru: 'ДЕТАЛЬ' },
  damageSeverity: { uz: 'DARAJA', ru: 'СТЕПЕНЬ' },
  damageDesc: { uz: 'TAVSIF', ru: 'ОПИСАНИЕ' },
  damagePhotos: { uz: 'RASMLAR', ru: 'ФОТОГРАФИИ' },
  photo: { uz: 'RASM', ru: 'ФОТО' },
  damageShortDesc: { uz: 'Shikast haqida qisqacha yozing…', ru: 'Кратко опишите повреждение…' },
  savingProgress: { uz: 'Yuklanmoqda…', ru: 'Загрузка…' },
  saveBtnWithIcon: { uz: '💾 Saqlash', ru: '💾 Сохранить' },
  back: { uz: 'Orqaga', ru: 'Назад' },
  carLabel: { uz: 'Avtomobil', ru: 'Автомобиль' },
  noDamage: { uz: "Shikast yo'q", ru: 'Нет повреждений' },
  carsCountPlural: { uz: 'ta avtomobil', ru: 'автомобилей' },
  damagedCountPlural: { uz: 'ta shikastli', ru: 'с повреждениями' },
  searchNameOrPlate: { uz: 'Nom yoki raqam…', ru: 'Название или номер…' },
  filterAll: { uz: 'Hammasi', ru: 'Все' },
  filterDamaged: { uz: 'Shikastli', ru: 'С повреждениями' },
  filterClean: { uz: "Sog'lom", ru: 'Целые' },
  carNotFound: { uz: 'Avtomobil topilmadi', ru: 'Автомобиль не найден' },
  damageCountPlural: { uz: 'ta shikast', ru: 'повреждений' },
  searchPart: { uz: 'Qidirish…', ru: 'Поиск…' },
  minorLabel: { uz: 'Kichik', ru: 'Мелкие' },
  moderateLabel: { uz: "O'rtacha", ru: 'Средние' },
  severeLabel: { uz: 'Jiddiy', ru: 'Серьезные' }
};

['uz', 'ru'].forEach(lang => {
  const path = `./public/locales/${lang}/translation.json`;
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    for (const [key, value] of Object.entries(keys)) {
      if (!data[key]) data[key] = value[lang];
    }
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }
});

console.log("Translations added.");
