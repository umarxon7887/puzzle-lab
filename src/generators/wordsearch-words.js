// wordsearch-words.js — "So'z qidiruv" uchun mavzular va so'z banklari (uz / ru / en).
// O'zbekcha so'zlarda O' va G' — BITTA harf (jadvalda bitta katakka yoziladi).
// Yangi mavzu qo'shish: TOPICS ga kalit, nom va belgini, BANKS ga uch tildagi so'zlarni yozing.
// So'zlar bitta so'zdan iborat bo'lsin (bo'sh joy va chiziqchasiz), 3–12 harf tavsiya etiladi.

export const TOPICS = [
  { key: 'school', icon: '🏫', name: { uz: 'Maktab', ru: 'Школа', en: 'School' } },
  { key: 'autumn', icon: '🍂', name: { uz: 'Kuz', ru: 'Осень', en: 'Autumn' } },
  { key: 'winter', icon: '❄️', name: { uz: 'Qish', ru: 'Зима', en: 'Winter' } },
  { key: 'animals', icon: '🐾', name: { uz: 'Hayvonlar', ru: 'Животные', en: 'Animals' } },
  { key: 'food', icon: '🍲', name: { uz: 'Taomlar', ru: 'Еда', en: 'Food' } },
  { key: 'nature', icon: '🌳', name: { uz: 'Tabiat', ru: 'Природа', en: 'Nature' } },
  { key: 'sport', icon: '⚽', name: { uz: 'Sport', ru: 'Спорт', en: 'Sport' } },
  { key: 'space', icon: '🚀', name: { uz: 'Fazo', ru: 'Космос', en: 'Space' } },
  { key: 'jobs', icon: '💼', name: { uz: 'Kasblar', ru: 'Профессии', en: 'Jobs' } },
  { key: 'transport', icon: '🚌', name: { uz: 'Transport', ru: 'Транспорт', en: 'Transport' } },
  { key: 'computer', icon: '💻', name: { uz: 'Kompyuter', ru: 'Компьютер', en: 'Computers' } }
];

const w = s => s.trim().split(/\s+/);

export const BANKS = {
  uz: {
    school: w(`DARS MAKTAB DAFTAR QALAM KITOB SINF DOSKA PARTA RYUKZAK CHIZG'ICH O'CHIRG'ICH PENAL TEST BAHO
      JADVAL XARITA GLOBUS LOYIHA DIREKTOR TANAFFUS DARSLIK O'QUVCHI O'QITUVCHI QOG'OZ SAVOL JAVOB BILIM
      ALIFBO KUNDALIK IMTIHON DIKTANT MATEMATIKA KUTUBXONA QO'NG'IROQ BO'R`),
    autumn: w(`KUZ YAPROQ SHAMOL YOMG'IR BULUT TUMAN HOSIL OLMA NOK UZUM QOVUN TARVUZ DALA DEHQON SOVUQ PAXTA
      BUG'DOY OLXO'RI ANJIR ANOR BEHI XURMO QOVOQ NOYABR OKTABR SENTABR SHABNAM DARAXT XAZON SOYABON SALQIN
      YONG'OQ MAKKAJO'XORI`),
    winter: w(`QISH QOR MUZ SOVUQ AYOZ QORBOBO QORQIZ ARCHA CHANA CHANG'I KONKI SHARF QO'LQOP PALTO ETIK TELPAK
      PO'STIN BAYRAM SOVG'A DEKABR YANVAR FEVRAL BO'RON PECHKA ISSIQ KO'RPA CHOY OPPOQ MUZLIK`),
    animals: w(`MUSHUK KUCHUK QUYON TULKI AYIQ BO'RI SHER YO'LBARS FIL ZEBRA MAYMUN TOVUS LAYLAK TOSHBAQA SICHQON
      ILON QARG'A O'RDAK TUYA QOPLON TIMSOH TOVUQ XO'ROZ QIRG'OVUL OT SIGIR ECHKI QO'Y JIRAFA KIYIK BURGUT BAQA
      TIPRATIKAN KAPALAK ASALARI OLMAXON`),
    food: w(`NON GURUCH OSH SOMSA MANTI LAG'MON SHO'RVA NORIN KABOB CHUCHVARA DIMLAMA HOLVA ASAL QAYMOQ QATIQ SUT
      PISHLOQ TUXUM GO'SHT BALIQ SALAT PIYOZ SABZI KARTOSHKA POMIDOR BODRING QOVURDOQ SHIRINLIK MURABBO
      SARIYOG' TUZ SHAKAR CHOY KOMPOT BO'TQA`),
    nature: w(`TABIAT DARAXT GUL BARG DARYO KO'L DENGIZ TOG' CHO'L O'RMON BULOQ SHARSHARA TOSH QUM OSMON QUYOSH
      YOMG'IR KAMALAK CHAQMOQ MOMAQALDIROQ VODIY OROL G'OR TUPROQ ILDIZ URUG' MEVA YAPROQ SHAMOL BULUT QIR SOY MAYSA`),
    sport: w(`FUTBOL BASKETBOL VOLEYBOL SUZISH YUGURISH SHAXMAT SHASHKA VELOSIPED TENNIS BOKS KURASH CHANG'I STADION
      TO'P MEDAL MASHQ SPORTZAL MURABBIY CHEMPION GANTEL MARAFON GIMNASTIKA DARVOZA HAKAM YUTUQ MUSOBAQA JAMOA
      G'OLIB KUBOK SAKRASH OLIMPIADA DZYUDO HUSHTAK`),
    space: w(`QUYOSH OY YULDUZ SAYYORA RAKETA KOSMOS YER MARS KOMETA GALAKTIKA TELESKOP KOSMONAVT ORBITA VENERA
      YUPITER SATURN URAN NEPTUN MERKURIY METEOR SPUTNIK ASTEROID STANSIYA ATMOSFERA SKAFANDR OLAM RASADXONA
      KRATER VAZNSIZLIK KEMA NUR`),
    jobs: w(`SHIFOKOR O'QITUVCHI HAYDOVCHI OSHPAZ QURUVCHI DEHQON MUHANDIS UCHUVCHI SARTAROSH SOTUVCHI RASSOM
      BASTAKOR SHOIR YOZUVCHI JURNALIST DASTURCHI HAMSHIRA TIKUVCHI DURADGOR BOG'BON CHO'PON BALIQCHI MEXANIK
      ARXITEKTOR QASSOB NONVOY POCHTACHI AKTYOR OLIM TARJIMON HUQUQSHUNOS MUSIQACHI KUTUBXONACHI`),
    transport: w(`MASHINA AVTOBUS POYEZD SAMOLYOT VERTOLYOT KEMA QAYIQ VELOSIPED MOTOTSIKL TRAMVAY TROLLEYBUS METRO
      TAKSI TRAKTOR EKSKAVATOR RAKETA SKUTER SAMOKAT ARAVA FURGON YO'L BEKAT VOKZAL AEROPORT SVETOFOR HAYDOVCHI
      CHIPTA G'ILDIRAK BENZIN RUL KO'PRIK PORT`),
    computer: w(`KOMPYUTER NOUTBUK PLANSHET TELEFON SICHQONCHA KLAVIATURA MONITOR PRINTER INTERNET SAYT PAROL FAYL
      PAPKA DASTUR ROBOT KOD ALGORITM PROTSESSOR XOTIRA EKRAN KAMERA MIKROFON NAUSHNIK BRAUZER ANTIVIRUS ILOVA
      DASTURCHI XABAR POCHTA TARMOQ SERVER ONLAYN`)
  },
  ru: {
    school: w(`ШКОЛА УРОК ТЕТРАДЬ РУЧКА КНИГА КЛАСС ДОСКА ПАРТА РЮКЗАК ЛИНЕЙКА ЛАСТИК ПЕНАЛ КАРАНДАШ ТЕСТ ОЦЕНКА
      ДНЕВНИК ЖУРНАЛ КАРТА ГЛОБУС ПРОЕКТ ДИРЕКТОР ПЕРЕМЕНА УЧЕБНИК УЧЕНИК УЧИТЕЛЬ БУМАГА ВОПРОС ОТВЕТ ЗНАНИЕ
      АЛФАВИТ ЭКЗАМЕН ДИКТАНТ МАТЕМАТИКА БИБЛИОТЕКА ЗВОНОК МЕЛ ЗАДАЧА`),
    autumn: w(`ОСЕНЬ ЛИСТЬЯ ВЕТЕР ДОЖДЬ ТУЧА ТУМАН УРОЖАЙ ЯБЛОКО ГРУША ВИНОГРАД ДЫНЯ АРБУЗ ТЫКВА ПОЛЕ ФЕРМЕР ХОЛОД
      ХЛОПОК ПШЕНИЦА СЛИВА ИНЖИР ГРАНАТ АЙВА ХУРМА ОРЕХ НОЯБРЬ ОКТЯБРЬ СЕНТЯБРЬ РОСА ДЕРЕВО ЗОНТ ЛУЖА ГРИБ
      КУКУРУЗА ЛИСТОПАД`),
    winter: w(`ЗИМА СНЕГ ЛЁД МОРОЗ ХОЛОД СНЕЖИНКА СУГРОБ СНЕГОВИК СНЕГУРОЧКА ЁЛКА САНКИ ЛЫЖИ КОНЬКИ ШАРФ ВАРЕЖКИ
      ШАПКА ПАЛЬТО ШУБА САПОГИ ПРАЗДНИК ПОДАРОК ДЕКАБРЬ ЯНВАРЬ ФЕВРАЛЬ МЕТЕЛЬ ВЬЮГА СОСУЛЬКА ПЕЧКА ОДЕЯЛО КАТОК
      ИНЕЙ ЧАЙ`),
    animals: w(`КОШКА СОБАКА ЗАЯЦ ЛИСА МЕДВЕДЬ ВОЛК ЛЕВ ТИГР СЛОН ЗЕБРА ОБЕЗЬЯНА ПАВЛИН АИСТ ЧЕРЕПАХА МЫШЬ ЗМЕЯ
      ВОРОНА УТКА ВЕРБЛЮД ЛЕОПАРД КРОКОДИЛ ПЕТУХ КУРИЦА ФАЗАН ЛОШАДЬ КОРОВА КОЗА ОВЦА ЖИРАФ ОЛЕНЬ ОРЁЛ ЛЯГУШКА
      ЁЖ БАБОЧКА ПЧЕЛА БЕЛКА`),
    food: w(`ХЛЕБ РИС ПЛОВ САМСА МАНТЫ ЛАГМАН ШУРПА НОРИН ШАШЛЫК ЧУЧВАРА ХАЛВА МЁД СМЕТАНА КАТЫК МОЛОКО СЫР ЯЙЦО
      МЯСО РЫБА САЛАТ ЛУК МОРКОВЬ КАРТОФЕЛЬ ПОМИДОР ОГУРЕЦ ВАРЕНЬЕ МАСЛО СОЛЬ САХАР ЧАЙ КОМПОТ КАША СУП ПИРОГ
      БУЛОЧКА`),
    nature: w(`ПРИРОДА ДЕРЕВО ЦВЕТОК ТРАВА ЛИСТ РЕКА ОЗЕРО МОРЕ ГОРА ПУСТЫНЯ ЛЕС РОДНИК ВОДОПАД КАМЕНЬ ПЕСОК НЕБО
      СОЛНЦЕ ДОЖДЬ РАДУГА МОЛНИЯ ГРОМ ДОЛИНА ОСТРОВ ПЕЩЕРА ПОЧВА КОРЕНЬ СЕМЯ ПЛОД ВЕТЕР ОБЛАКО ХОЛМ РУЧЕЙ ПОЛЯНА
      БЕРЕГ`),
    sport: w(`ФУТБОЛ БАСКЕТБОЛ ВОЛЕЙБОЛ ПЛАВАНИЕ БЕГ ШАХМАТЫ ШАШКИ ВЕЛОСИПЕД ТЕННИС БОКС БОРЬБА ЛЫЖИ СТАДИОН МЯЧ
      МЕДАЛЬ ТРЕНЕР ЧЕМПИОН ГАНТЕЛЬ МАРАФОН ГИМНАСТИКА ВОРОТА СУДЬЯ ПОБЕДА СОРЕВНОВАНИЕ КОМАНДА КУБОК ПРЫЖОК
      ЗАРЯДКА ОЛИМПИАДА ДЗЮДО СВИСТОК ФИНИШ СТАРТ`),
    space: w(`ЛУНА СОЛНЦЕ ЗВЕЗДА ПЛАНЕТА РАКЕТА КОСМОС ЗЕМЛЯ МАРС КОМЕТА ГАЛАКТИКА ТЕЛЕСКОП КОСМОНАВТ СПУТНИК ОРБИТА
      ВЕНЕРА ЮПИТЕР САТУРН УРАН НЕПТУН МЕРКУРИЙ МЕТЕОР АСТЕРОИД СТАНЦИЯ АТМОСФЕРА СКАФАНДР ВСЕЛЕННАЯ ОБСЕРВАТОРИЯ
      КРАТЕР НЕВЕСОМОСТЬ КОРАБЛЬ ЛУЧ СОЗВЕЗДИЕ`),
    jobs: w(`ВРАЧ УЧИТЕЛЬ ВОДИТЕЛЬ ПОВАР СТРОИТЕЛЬ ФЕРМЕР ИНЖЕНЕР ЛЁТЧИК ПОЛИЦЕЙСКИЙ ПОЖАРНЫЙ ПАРИКМАХЕР ПРОДАВЕЦ
      ХУДОЖНИК КОМПОЗИТОР ПОЭТ ПИСАТЕЛЬ ЖУРНАЛИСТ ПРОГРАММИСТ МЕДСЕСТРА ПОРТНОЙ СТОЛЯР САДОВНИК ПАСТУХ РЫБАК
      МЕХАНИК АРХИТЕКТОР МЯСНИК ПЕКАРЬ ПОЧТАЛЬОН АКТЁР УЧЁНЫЙ ПЕРЕВОДЧИК ЮРИСТ МУЗЫКАНТ БИБЛИОТЕКАРЬ`),
    transport: w(`МАШИНА АВТОБУС ПОЕЗД САМОЛЁТ ВЕРТОЛЁТ КОРАБЛЬ ЛОДКА ВЕЛОСИПЕД МОТОЦИКЛ ТРАМВАЙ ТРОЛЛЕЙБУС МЕТРО ТАКСИ
      ГРУЗОВИК ТРАКТОР ЭКСКАВАТОР РАКЕТА СКУТЕР САМОКАТ ТЕЛЕГА ФУРГОН ДОРОГА ОСТАНОВКА ВОКЗАЛ АЭРОПОРТ СВЕТОФОР
      ВОДИТЕЛЬ БИЛЕТ КОЛЕСО БЕНЗИН РУЛЬ МОСТ ПОРТ`),
    computer: w(`КОМПЬЮТЕР НОУТБУК ПЛАНШЕТ ТЕЛЕФОН МЫШЬ КЛАВИАТУРА МОНИТОР ПРИНТЕР ИНТЕРНЕТ САЙТ ПАРОЛЬ ФАЙЛ ПАПКА
      ПРОГРАММА РОБОТ КОД АЛГОРИТМ ПРОЦЕССОР ПАМЯТЬ ЭКРАН КАМЕРА МИКРОФОН НАУШНИКИ БРАУЗЕР АНТИВИРУС ПРИЛОЖЕНИЕ
      ПРОГРАММИСТ СООБЩЕНИЕ ПОЧТА СЕТЬ СЕРВЕР ОНЛАЙН ПИКСЕЛЬ`)
  },
  en: {
    school: w(`SCHOOL LESSON NOTEBOOK PENCIL BOOK CLASS BOARD DESK BACKPACK RULER ERASER PEN TEST GRADE MAP GLOBE
      PROJECT PRINCIPAL BREAK TEXTBOOK STUDENT TEACHER PAPER QUESTION ANSWER ALPHABET EXAM DICTATION MATH LIBRARY
      BELL CHALK HOMEWORK SCISSORS GLUE`),
    autumn: w(`AUTUMN LEAVES WIND RAIN CLOUD FOG HARVEST APPLE PEAR GRAPES MELON PUMPKIN FIELD FARMER COLD COTTON
      WHEAT PLUM FIG POMEGRANATE QUINCE WALNUT SEPTEMBER OCTOBER NOVEMBER DEW TREE UMBRELLA PUDDLE MUSHROOM
      CORN ACORN SCARF`),
    winter: w(`WINTER SNOW ICE FROST COLD SNOWFLAKE SNOWMAN SLED SKIS SKATES SCARF MITTENS GLOVES HAT COAT BOOTS
      HOLIDAY GIFT DECEMBER JANUARY FEBRUARY BLIZZARD ICICLE FIREPLACE BLANKET CANDLE TEA IGLOO PENGUIN SWEATER
      SNOWBALL`),
    animals: w(`CAT DOG RABBIT FOX BEAR WOLF LION TIGER ELEPHANT ZEBRA MONKEY PEACOCK STORK TURTLE MOUSE SNAKE CROW
      DUCK CAMEL LEOPARD CROCODILE ROOSTER HEN PHEASANT HORSE COW GOAT SHEEP GIRAFFE DEER EAGLE FROG HEDGEHOG
      BUTTERFLY BEE SQUIRREL`),
    food: w(`BREAD RICE PILAF SAMSA DUMPLINGS NOODLES SOUP KEBAB HONEY CREAM YOGURT MILK CHEESE EGG MEAT FISH SALAD
      ONION CARROT POTATO TOMATO CUCUMBER JAM BUTTER SALT SUGAR TEA JUICE PORRIDGE PIE COOKIE PASTA PIZZA SANDWICH
      PANCAKE`),
    nature: w(`NATURE TREE FLOWER GRASS LEAF RIVER LAKE SEA MOUNTAIN DESERT FOREST SPRING WATERFALL STONE SAND SKY SUN
      RAIN RAINBOW LIGHTNING THUNDER VALLEY ISLAND CAVE SOIL ROOT SEED FRUIT WIND CLOUD HILL STREAM MEADOW SHORE`),
    sport: w(`FOOTBALL BASKETBALL VOLLEYBALL SWIMMING RUNNING CHESS CHECKERS BICYCLE TENNIS BOXING WRESTLING SKIING
      STADIUM BALL MEDAL COACH CHAMPION DUMBBELL MARATHON GYMNASTICS GOAL REFEREE VICTORY CONTEST TEAM CUP JUMP
      EXERCISE OLYMPICS JUDO WHISTLE FINISH START`),
    space: w(`MOON SUN STAR PLANET ROCKET SPACE EARTH MARS COMET GALAXY TELESCOPE ASTRONAUT SATELLITE ORBIT VENUS
      JUPITER SATURN URANUS NEPTUNE MERCURY METEOR ASTEROID STATION ATMOSPHERE SPACESUIT UNIVERSE OBSERVATORY
      CRATER GRAVITY SPACESHIP ALIEN`),
    jobs: w(`DOCTOR TEACHER DRIVER COOK BUILDER FARMER ENGINEER PILOT FIREFIGHTER BARBER CASHIER ARTIST COMPOSER POET
      WRITER JOURNALIST PROGRAMMER NURSE TAILOR CARPENTER GARDENER SHEPHERD FISHER MECHANIC ARCHITECT BUTCHER
      BAKER COURIER ACTOR SCIENTIST TRANSLATOR LAWYER MUSICIAN LIBRARIAN DENTIST VET`),
    transport: w(`CAR BUS TRAIN AIRPLANE HELICOPTER SHIP BOAT BICYCLE MOTORCYCLE TRAM TROLLEYBUS SUBWAY TAXI TRUCK
      TRACTOR EXCAVATOR ROCKET SCOOTER CART VAN ROAD STATION AIRPORT DRIVER TICKET WHEEL FUEL BRIDGE PORT TUNNEL
      SUBMARINE BALLOON`),
    computer: w(`COMPUTER LAPTOP TABLET PHONE MOUSE KEYBOARD MONITOR PRINTER INTERNET WEBSITE PASSWORD FILE FOLDER
      PROGRAM ROBOT CODE ALGORITHM PROCESSOR MEMORY SCREEN CAMERA MICROPHONE HEADPHONES BROWSER ANTIVIRUS APP
      PROGRAMMER MESSAGE EMAIL NETWORK SERVER ONLINE PIXEL CURSOR`)
  }
};
