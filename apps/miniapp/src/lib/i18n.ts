export type Locale = "ru" | "sr";

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  ru: {},
  sr: {
    // Common words & phrases
    "Гость": "Gost",
    "Бесплатно": "Besplatno",
    "Оплачено": "Plaćeno",
    "Нет изображения": "Nema slike",
    "Без изображения": "Bez slike",
    "Превью": "Prikaz",
    "Доступен в превью": "Dostupno u prikazu",
    "Описание скоро появится": "Opis stiže uskoro",
    "Описание курса появится в ближайшее время.":
      "Opis kursa će se pojaviti uskoro.",
    "Описание появится в ближайшее время. Если у вас есть вопросы, напишите в поддержку.":
      "Opis će se pojaviti uskoro. Ako imate pitanja, pišite podršci.",
    "Mur Mur Education": "Mur Mur Education",
    "Статус доступа: ": "Status pristupa: ",
    "Следующий урок: ": "Sledeća lekcija: ",
    "Следующий урок: {title}": "Sledeća lekcija: {title}",
    "Вы всё прошли!": "Sve lekcije su završene!",
    "Все уроки завершены": "Sve lekcije su završene",
    "Все курсы": "Svi kursevi",
    "Мои курсы": "Moji kursevi",
    "Мой профиль": "Moj profil",
    "Напоминания": "Podsetnici",
    "Напоминания выключены": "Podsetnici su isključeni",
    "Частота напоминаний": "Učestalost podsetnika",
    "Время уведомлений": "Vreme obaveštenja",
    "Сохранить изменения": "Sačuvaj izmene",
    "Никогда": "Nikada",
    "Каждый день": "Svaki dan",
    "Каждую неделю": "Svake nedelje",
    "Каждый месяц": "Svakog meseca",
    "Утро": "Jutro",
    "День": "Dan",
    "Вечер": "Veče",
    "Согласен(на) на обработку персональных данных в соответствии с политикой Mur Mur Education.":
      "Slažem se sa obradom ličnih podataka u skladu sa politikom Mur Mur Education.",
    "Ваша персональная зона для обучения и поддержки.":
      "Vaša lična zona za učenje i podršku.",

    // Navigation
    Home: "Početna",
    Courses: "Kursevi",
    "My courses": "Moji kursevi",
    Account: "Nalog",

    // Home page
    "Hello, {name}!": "Zdravo, {name}!",
    "Welcome to Sexual Wellness world MUR MUR":
      "Dobrodošli u svet seksualne dobrobiti Mur Mur.",
    "Курс который проходит прямо сейчас": "Kurs koji se upravo održava",
    "Популярные курсы": "Popularni kursevi",
    "Смотреть все": "Pogledaj sve",
    New: "Novo",
    "To discover": "Za otkrivanje",
    "Исследуйте наши курсы и начните обучение уже сегодня!":
      "Istražite naše kurseve i počnite sa učenjem već danas!",

    // Courses page
    "Откройте курс, чтобы узнать подробности и оформить доступ.":
      "Otvorite kurs da biste videli detalje i dobili pristup.",
    "Не удалось загрузить курсы. Попробуйте позже.":
      "Ne možemo da učitamo kurseve. Pokušajte kasnije.",
    "{modules} модулей · {lessons} уроков":
      "{modules} modula · {lessons} lekcija",
    "{count} участников уже учатся": "{count} polaznika već uči",

    // Course detail
    "Мы не смогли найти этот курс. Попробуйте позже.":
      "Nismo uspeli da pronađemo ovaj kurs. Pokušajte kasnije.",
    "Категория": "Kategorija",
    "{count} учеников · {lessons} уроков":
      "{count} učenika · {lessons} lekcija",
    "О курсе": "O kursu",
    "Программа": "Program",
    "{count} уроков": "{count} lekcija",
    "Видео: {url}": "Video: {url}",
    "Тип: {type}": "Tip: {type}",
    "{minutes} мин": "{minutes} min",
    "Тесты": "Testovi",
    "Вопросов: ": "Pitanja: ",
    "несколько": "nekoliko",
    "Доступ после модуля: {module}": "Dostupno posle modula: {module}",
    "Доступ после урока: {lesson}": "Dostupno posle lekcije: {lesson}",
    "указанный модуль": "navedeni modul",
    "указанный урок": "navedena lekcija",
    "Готовим тест...": "Pripremamo test...",
    "Пройти тест": "Pokreni test",
    "Тест": "Test",
    "{questionCount} вопросов · максимум {maxScore} баллов":
      "{questionCount} pitanja · maksimalno {maxScore} poena",
    "Требуется пройти модуль: {module}":
      "Potrebno je završiti modul: {module}",
    "Требуется пройти урок: {lesson}":
      "Potrebno je završiti lekciju: {lesson}",
    "Закрыть": "Zatvori",
    "Результат: {score}/{maxScore} • {status}":
      "Rezultat: {score}/{maxScore} • {status}",
    "Свободный ответ": "Otvoren odgovor",
    "Несколько вариантов": "Više odgovora",
    "Один вариант": "Jedan odgovor",
    "Верно": "Tačno",
    "Неверно": "Netačno",
    "Запишите свой ответ": "Upišite svoj odgovor",
    "Ожидаемый ответ: ": "Očekivani odgovor: ",
    "Пояснение: {text}": "Objašnjenje: {text}",
    "Отправляем...": "Šaljemo...",
    "Отправить ответы": "Pošalji odgovore",
    "Стоимость в звёздах": "Cena u zvezdama",
    "Стоимость": "Cena",
    "Подождите...": "Sačekajte...",
    "Начать": "Započni",
    "Оформить доступ": "Dobij pristup",
    "Назад ко всем курсам": "Nazad na sve kurseve",
    "Не удалось рассчитать стоимость курса в Telegram Stars. Напишите в поддержку, если нужна помощь.":
      "Ne možemo da izračunamo cenu u Telegram zvezdama. Pišite podršci ako vam treba pomoć.",
    "Не удалось конвертировать стоимость курса в Telegram Stars. Проверьте настройку курса конвертации.":
      "Ne možemo da pretvorimo cenu u Telegram zvezde. Proverite podešavanje konverzije.",
    "Оплата для этого курса появится позже. Следите за обновлениями.":
      "Plaćanje za ovaj kurs biće dostupno kasnije. Pratite novosti.",
    "Готовим Telegram WebApp. Оплата появится через несколько секунд...":
      "Pripremamo Telegram WebApp. Plaćanje će se pojaviti za nekoliko sekundi...",
    "Оплата доступна только внутри Telegram. Запустите мини‑приложение через бот и попробуйте снова.":
      "Plaćanje je dostupno samo u Telegramu. Pokrenite mini-aplikaciju kroz bota i pokušajte ponovo.",
    "Оплата доступна только внутри Telegram. Откройте мини‑приложение через бот и попробуйте снова.":
      "Plaćanje je dostupno samo u Telegramu. Otvorite mini-aplikaciju kroz bota i pokušajte ponovo.",
    "Не удалось определить ваш Telegram ID. Перезапустите мини‑приложение через бот.":
      "Ne možemo da odredimo vaš Telegram ID. Ponovo pokrenite mini-aplikaciju kroz bota.",
    "Если окно оплаты не появится, мы отправим счёт в чат с ботом.":
      "Ako se prozor za plaćanje ne pojavi, poslaćemo račun u čat sa botom.",
    "Обновите приложение Telegram до последней версии, чтобы оплатить через Stars.":
      "Ažurirajte Telegram na najnoviju verziju da biste platili preko Stars.",
    "Не удалось начать тест. Попробуйте позже.":
      "Nije uspelo pokretanje testa. Pokušajte kasnije.",
    "Ответьте на все вопросы перед отправкой.":
      "Odgovorite na sva pitanja pre slanja.",
    "Не удалось отправить ответы. Попробуйте позже.":
      "Nije uspelo slanje odgovora. Pokušajte kasnije.",
    "Открываем оплату в Telegram...": "Otvaramo plaćanje u Telegramu...",
    "Телеграм открыл окно оплаты на {amount} ⭐ ({price}). После подтверждения доступ к курсу откроется автоматически.":
      "Telegram je otvorio prozor za plaćanje od {amount} ⭐ ({price}). Posle potvrde pristup kursu će se automatski otključati.",
    "Не удалось запустить оплату. Попробуйте позже.":
      "Nije uspelo pokretanje plaćanja. Pokušajte kasnije.",
    "Создаём счёт. Откройте чат с ботом и подтвердите оплату звёздами.":
      "Pripremamo račun. Otvorite čat sa botom i potvrdite plaćanje zvezdama.",
    "Мы отправили счёт в чат Telegram. Откройте диалог с ботом и подтвердите оплату.":
      "Poslali smo račun u Telegram čat. Otvorite dijalog sa botom i potvrdite plaćanje.",
    "Не удалось отправить счёт. Попробуйте снова.":
      "Nije uspelo slanje računa. Pokušajte ponovo.",
    "Не удалось начать курс. Попробуйте позже.":
      "Nije uspelo pokretanje kursa. Pokušajte kasnije.",
    "Не удалось загрузить каталог. Попробуйте обновить.":
      "Neuspešno učitavanje kataloga. Pokušajte da osvežite stranicu.",
    "Не удалось обновить язык. Попробуйте позже.":
      "Nije uspelo ažuriranje jezika. Pokušajte kasnije.",
    "Язык интерфейса": "Jezik interfejsa",
    "По умолчанию показываем сербский. Вы можете переключиться на русский в любой момент.":
      "Podrazumevano prikazujemo srpski. Uvek možete prebaciti na ruski.",

    // Test runner & my courses details
    "Этот тест ещё не содержит вопросов.":
      "Ovaj test još nema pitanja.",
    "Результат: {correct} из {total} ({percent}%)":
      "Rezultat: {correct} od {total} ({percent}%)",
    "Ваш ответ: ": "Vaš odgovor: ",
    "Ваш ответ: {answer}": "Vaš odgovor: {answer}",
    "Правильный ответ: ": "Tačan odgovor: ",
    "Правильный ответ: {answer}": "Tačan odgovor: {answer}",
    "Пройти снова": "Pokušaj ponovo",
    "Вопрос {index} из {total}": "Pitanje {index} od {total}",
    "Введите ваш ответ": "Unesite svoj odgovor",
    "placeholder::Введите ваш ответ": "placeholder::Unesite svoj odgovor",
    "Назад": "Nazad",
    "Завершить": "Završi",
    "Следующий": "Sledeće",
    "Чтобы завершить тест, ответьте на все вопросы.":
      "Da biste završili test, odgovorite na sva pitanja.",
    "Результат: {score}/{maxScore} • {percent}":
      "Rezultat: {score}/{maxScore} • {percent}",
    "Статус доступа: ": "Status pristupa: ",
    "Прогресс {percent}%": "Napredak {percent}%",
    "Прогресс: {percent}% · {next}":
      "Napredak: {percent}% · {next}",
    "Следующий урок: ": "Sledeća lekcija: ",
    "Следующий урок: {title}": "Sledeća lekcija: {title}",
    "Все уроки завершены": "Sve lekcije su završene",
    "Перейти к описанию курса": "Idi na opis kursa",
    "Курс": "Kurs",
    "Курс не найден.": "Kurs nije pronađen.",
    "{percent}% завершено": "{percent}% završeno",
    "Вы завершили все уроки курса! Возвращайтесь, чтобы освежить знания.":
      "Završili ste sve lekcije kursa! Vratite se da osvežite znanje.",
    "Откройте ссылку на видео, чтобы изучить урок.":
      "Otvorite link ka videu da biste pogledali lekciju.",
    "Контент урока появится совсем скоро.":
      "Sadržaj lekcije će se uskoro pojaviti.",
    "Изображение урока": "Slika lekcije",
    "Видео урок: ": "Video lekcija: ",
    "Тип: {value}": "Tip: {value}",
    "Длительность: ": "Trajanje: ",
    "Сохраняем...": "Čuvamo...",
    "Отметить завершённым": "Označi kao završeno",
    "Урок завершён ": "Lekcija je završena ",
    "Сбросить прогресс": "Resetuj napredak",
    "В этом курсе пока нет уроков. Загляните позже!":
      "U ovom kursu još nema lekcija. Svratite kasnije!",
    "Вопросов: ": "Pitanja: ",
    "Вопросов: {count}": "Pitanja: {count}",
    "Программа курса": "Program kursa",

    // My courses list
    "Не удалось загрузить ваши курсы. Обновите страницу позже.":
      "Ne možemo da učitamo vaše kurseve. Osvežite stranicu kasnije.",
    "Еще нет приобретённых курсов. Перейдите в раздел «Все курсы», чтобы начать обучение.":
      "Još nema kupljenih kurseva. Pređite u odeljak „Svi kursevi” da biste počeli da učite.",

    "Завершить": "Završi",
    "Следующий": "Sledeće",
    "Чтобы завершить тест, ответьте на все вопросы.":
      "Da biste završili test, odgovorite na sva pitanja.",
    "Не удалось загрузить курс. Попробуйте позже.":
      "Nismo uspeli da učitamo kurs. Pokušajte kasnije.",
    "Прогресс недоступен": "Napredak nije dostupan",
    "Прогресс: {percent}% · ": "Napredak: {percent}% · ",
    "Курс": "Kurs",
    "Курс не найден.": "Kurs nije pronađen.",
    "У вас нет доступа к этому курсу. Возможно, подписка ещё не активирована.":
      "Nemate pristup ovom kursu. Pretplata možda još nije aktivirana.",
    "Перейти к описанию курса": "Idi na opis kursa",
    "Ваш прогресс": "Vaš napredak",
    "{percent}% завершено": "{percent}% završeno",
    "Вы завершили все уроки курса! Возвращайтесь, чтобы освежить знания.":
      "Završili ste sve lekcije kursa! Vratite se da osvežite znanje.",
    "Откройте ссылку на видео, чтобы изучить урок.":
      "Otvorite link ka videu da biste pogledali lekciju.",
    "Контент урока появится совсем скоро.":
      "Sadržaj lekcije će se uskoro pojaviti.",
    "Изображение урока": "Slika lekcije",
    "Ваш браузер не поддерживает элемент audio.":
      "Vaš pregledač ne podržava audio element.",
    "Видео урок: ": "Video lekcija: ",
    "Тип: {value}": "Tip: {value}",
    "Длительность: ": "Trajanje: ",
    "Сохраняем...": "Čuvamo...",
    "Отметить завершённым": "Označi kao završeno",
    "Урок завершён ": "Lekcija je završena ",
    "Сбросить прогресс": "Resetuj napredak",
    "В этом курсе пока нет уроков. Загляните позже!":
      "U ovom kursu još nema lekcija. Svratite kasnije!",
    "Вопросов: {count}": "Pitanja: {count}",
    "Программа курса": "Program kursa",

    // Errors & system
    "Не удалось подключиться к серверу. Проверьте интернет и попробуйте ещё раз.":
      "Nije moguće povezati se sa serverom. Proverite internet i pokušajte ponovo.",
    "Сервер временно недоступен. Попробуйте повторить запрос позже.":
      "Server trenutno nije dostupan. Pokušajte ponovo kasnije.",
    "Сервер вернул неожиданный ответ. Обновите страницу и попробуйте снова.":
      "Server je vratio neočekivan odgovor. Osvežite stranicu i pokušajte ponovo.",
    "Не удалось загрузить данные пользователя.":
      "Nije uspelo učitavanje korisničkih podataka.",
    "Мы не обнаружили Telegram WebApp. Откройте мини‑приложение через Telegram, чтобы продолжить.":
      "Nismo pronašli Telegram WebApp. Otvorite mini-aplikaciju preko Telegrama da biste nastavili.",
    "Образовательное пространство Mur Mur Education в формате Telegram Mini App.":
      "Obrazovni prostor Mur Mur Education u formatu Telegram mini aplikacije.",
  },
};

function normalizeLanguageCode(languageCode?: string | null): string {
  return (languageCode ?? "").toLowerCase();
}

function replaceParams(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function resolveLocale(languageCode?: string | null): Locale {
  const normalized = normalizeLanguageCode(languageCode);
  if (normalized.startsWith("sr")) {
    return "sr";
  }
  return "ru";
}

export function createTranslator(languageCode?: string | null) {
  const locale = resolveLocale(languageCode);
  const dictionary = TRANSLATIONS[locale];

  return {
    locale,
    t: (key: string, params?: Record<string, string | number>) => {
      const template = locale === "ru" ? key : dictionary[key] ?? key;
      return replaceParams(template, params);
    },
  };
}

export type TranslateFn = ReturnType<typeof createTranslator>["t"];


