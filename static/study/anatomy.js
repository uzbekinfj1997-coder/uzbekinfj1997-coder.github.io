/* Study Quest: Anatomy, for Robiyaxon's app, in Russian (each text's "ru") and English. One example chapter so far; the others are
   listed as coming. Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py and books_robiyaxon_ru.py;
   edit those, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "anatomy",
 "name": "Anatomy",
 "title": "The human body, region by region",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Anatomical terms",
   "lists": [
    {
     "id": "ana-01-know-1",
     "track": "know",
     "name": "1.1 Directions",
     "about": "Where one part lies compared with another",
     "items": [
      {
       "key": "Towards the front of the body is …",
       "text": "anterior",
       "why": "Also called ventral.",
       "ru": {
        "key": "Ближе к передней поверхности тела — …",
        "text": "передний [[anterior]]",
        "why": "Иначе — вентральный [[ventral]]."
       }
      },
      {
       "key": "Towards the back of the body is …",
       "text": "posterior",
       "why": "Also called dorsal.",
       "ru": {
        "key": "Ближе к задней поверхности тела — …",
        "text": "задний [[posterior]]",
        "why": "Иначе — дорсальный [[dorsal]]."
       }
      },
      {
       "key": "Towards the head is …",
       "text": "superior",
       "why": "Also called cranial.",
       "ru": {
        "key": "Ближе к голове — …",
        "text": "верхний [[superior]]",
        "why": "Иначе — краниальный [[cranial]]."
       }
      },
      {
       "key": "Towards the feet is …",
       "text": "inferior",
       "why": "Also called caudal.",
       "ru": {
        "key": "Ближе к стопам — …",
        "text": "нижний [[inferior]]",
        "why": "Иначе — каудальный [[caudal]]."
       }
      },
      {
       "key": "Nearer the midline of the body is …",
       "text": "medial",
       "why": "The nose is medial to the eyes.",
       "ru": {
        "key": "Ближе к срединной линии тела — …",
        "text": "медиальный [[medial]]",
        "why": "Нос расположен медиальнее глаз."
       }
      },
      {
       "key": "Further from the midline is …",
       "text": "lateral",
       "why": "The ears are lateral to the eyes.",
       "ru": {
        "key": "Дальше от срединной линии — …",
        "text": "латеральный [[lateral]]",
        "why": "Уши расположены латеральнее глаз."
       }
      },
      {
       "key": "On a limb, nearer the point where it joins the trunk is …",
       "text": "proximal",
       "why": "The elbow is proximal to the wrist.",
       "ru": {
        "key": "На конечности: ближе к месту, где она отходит от туловища, — …",
        "text": "проксимальный [[proximal]]",
        "why": "Локоть проксимальнее запястья."
       }
      },
      {
       "key": "On a limb, further from the trunk is …",
       "text": "distal",
       "why": "The fingers are distal to the wrist.",
       "ru": {
        "key": "На конечности: дальше от туловища — …",
        "text": "дистальный [[distal]]",
        "why": "Пальцы дистальнее запястья."
       }
      },
      {
       "key": "Nearer the body's surface is …",
       "text": "superficial",
       "why": "The skin is superficial to the muscles.",
       "ru": {
        "key": "Ближе к поверхности тела — …",
        "text": "поверхностный [[superficial]]",
        "why": "Кожа лежит поверхностнее мышц."
       }
      },
      {
       "key": "Further from the body's surface is …",
       "text": "deep",
       "why": "The bones are deep to the muscles.",
       "ru": {
        "key": "Дальше от поверхности тела — …",
        "text": "глубокий [[deep]]",
        "why": "Кости лежат глубже мышц."
       }
      }
     ],
     "ru": {
      "name": "1.1 Направления",
      "about": "Где одна часть лежит относительно другой"
     }
    },
    {
     "id": "ana-01-know-2",
     "track": "know",
     "name": "1.2 Position and planes",
     "about": "The anatomical position, and how the body is cut",
     "items": [
      {
       "key": "Standing upright, facing forwards, arms at the sides, palms facing forwards, feet together: the …",
       "text": "anatomical position",
       "why": "Every directional term is described from this position.",
       "ru": {
        "key": "Стоя прямо, лицом вперёд, руки вдоль туловища, ладони обращены вперёд, стопы вместе: …",
        "text": "анатомическое положение [[anatomical position]]",
        "why": "Все термины направлений описывают именно от этого положения."
       }
      },
      {
       "key": "A plane that divides the body into left and right parts is …",
       "text": "sagittal",
       "ru": {
        "key": "Плоскость, которая делит тело на левую и правую части, — …",
        "text": "сагиттальная [[sagittal]]"
       }
      },
      {
       "key": "The sagittal plane that divides the body into equal left and right halves is the …",
       "text": "median plane",
       "why": "Also called the midsagittal plane.",
       "ru": {
        "key": "Сагиттальная плоскость, которая делит тело на равные левую и правую половины, — …",
        "text": "срединная плоскость [[median plane]]",
        "why": "Её также называют срединно-сагиттальной [[midsagittal]]."
       }
      },
      {
       "key": "A plane that divides the body into front and back parts is …",
       "text": "coronal",
       "why": "Also called the frontal plane.",
       "ru": {
        "key": "Плоскость, которая делит тело на переднюю и заднюю части, — …",
        "text": "фронтальная [[coronal]]",
        "why": "Её также называют корональной."
       }
      },
      {
       "key": "A plane that divides the body into upper and lower parts is …",
       "text": "transverse",
       "why": "Also called horizontal or axial: the plane of CT slices.",
       "ru": {
        "key": "Плоскость, которая делит тело на верхнюю и нижнюю части, — …",
        "text": "горизонтальная [[transverse]]",
        "why": "Иначе — поперечная или аксиальная [[axial]]: в этой плоскости делают срезы КТ."
       }
      },
      {
       "key": "Lying on the back, face up, is …",
       "text": "supine",
       "ru": {
        "key": "Положение лёжа лицом вверх — …",
        "text": "на спине [[supine]]"
       }
      },
      {
       "key": "Lying on the front, face down, is …",
       "text": "prone",
       "ru": {
        "key": "Положение лёжа лицом вниз — …",
        "text": "на животе [[prone]]"
       }
      }
     ],
     "ru": {
      "name": "1.2 Положение и плоскости",
      "about": "Анатомическое положение и плоскости, которыми рассекают тело"
     }
    },
    {
     "id": "ana-01-structure-3",
     "track": "structure",
     "name": "1.S In order",
     "about": "Put them in order",
     "items": [
      {
       "t": "order",
       "q": "Levels of organisation, simplest first",
       "steps": [
        "Chemical (atoms and molecules)",
        "Cells",
        "Tissues",
        "Organs",
        "Organ systems",
        "The organism"
       ],
       "ru": {
        "q": "Уровни организации, от простого к сложному",
        "steps": [
         "Химический уровень: атомы и молекулы [[chemical]]",
         "Клетки [[cells]]",
         "Ткани [[tissues]]",
         "Органы [[organs]]",
         "Системы органов [[organ systems]]",
         "Организм [[organism]]"
        ]
       }
      },
      {
       "t": "order",
       "q": "The upper limb, from proximal to distal",
       "steps": [
        "Shoulder",
        "Arm (brachium)",
        "Elbow",
        "Forearm (antebrachium)",
        "Wrist (carpus)",
        "Hand (manus)",
        "Fingers (digits)"
       ],
       "why": "The arm, in anatomy, is only the part between the shoulder and the elbow.",
       "ru": {
        "q": "Верхняя конечность, от проксимального к дистальному",
        "steps": [
         "Плечевой пояс [[shoulder]]",
         "Плечо [[arm]]",
         "Локоть [[elbow]]",
         "Предплечье [[forearm]]",
         "Запястье [[wrist]]",
         "Кисть [[hand]]",
         "Пальцы [[fingers]]"
        ],
        "why": "В анатомии плечо [[arm]] — это только часть между плечевым и локтевым суставами."
       }
      }
     ],
     "ru": {
      "name": "1.S По порядку",
      "about": "Расставьте по порядку"
     }
    },
    {
     "id": "ana-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "In the anatomical position the palms face backwards",
       "a": false,
       "why": "They face forwards, so the radius and ulna lie side by side, not crossed.",
       "ru": {
        "q": "В анатомическом положении ладони обращены назад",
        "why": "Вперёд: так лучевая и локтевая кости лежат параллельно, а не перекрещиваются."
       }
      },
      {
       "t": "tf",
       "q": "The elbow is proximal to the wrist",
       "a": true,
       "why": "It's nearer the shoulder, where the limb joins the trunk.",
       "ru": {
        "q": "Локоть проксимальнее запястья",
        "why": "Он ближе к плечу, то есть к месту, где конечность отходит от туловища."
       }
      },
      {
       "t": "tf",
       "q": "The coronal plane divides the body into left and right parts",
       "a": false,
       "why": "That's the sagittal plane; the coronal plane divides front from back.",
       "ru": {
        "q": "Фронтальная плоскость делит тело на левую и правую части",
        "why": "Это сагиттальная плоскость [[sagittal]]; фронтальная [[coronal]] отделяет переднюю часть от задней."
       }
      },
      {
       "t": "tf",
       "q": "The sternum is medial to the humerus",
       "a": true,
       "why": "The sternum lies in the midline; the humerus is out in the arm.",
       "ru": {
        "q": "Грудина [[sternum]] расположена медиальнее плечевой кости [[humerus]]",
        "why": "Грудина лежит на срединной линии, а плечевая кость — в плече."
       }
      },
      {
       "t": "tf",
       "q": "Supine means lying face down",
       "a": false,
       "why": "Supine is face up; prone is face down.",
       "ru": {
        "q": "Положение на спине — это лёжа лицом вниз",
        "why": "На спине [[supine]] — лицом вверх; лицом вниз — на животе [[prone]]."
       }
      }
     ],
     "ru": {
      "name": "1.W Ловушки",
      "about": "Верно или неверно, и почему"
     }
    },
    {
     "id": "ana-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "Which plane gives left and right halves of the body?",
       "ask": "Which answer is right?",
       "opts": [
        "Sagittal",
        "Coronal",
        "Transverse"
       ],
       "a": 0,
       "why": "A sagittal plane runs front to back, splitting left from right.",
       "ru": {
        "q": "Какая плоскость делит тело на левую и правую половины?",
        "ask": "Какой ответ верный?",
        "opts": [
         "Сагиттальная [[sagittal]]",
         "Фронтальная [[coronal]]",
         "Горизонтальная [[transverse]]"
        ],
        "why": "Сагиттальная плоскость идёт спереди назад и отделяет левую сторону от правой."
       }
      },
      {
       "t": "case",
       "q": "The knee is … to the ankle.",
       "ask": "Which answer is right?",
       "opts": [
        "Proximal",
        "Distal",
        "Lateral"
       ],
       "a": 0,
       "why": "The knee is nearer to where the lower limb joins the trunk.",
       "ru": {
        "q": "Колено расположено … голеностопного сустава.",
        "ask": "Какой ответ верный?",
        "opts": [
         "проксимальнее [[proximal]]",
         "дистальнее [[distal]]",
         "латеральнее [[lateral]]"
        ],
        "why": "Колено ближе к месту, где нижняя конечность отходит от туловища."
       }
      },
      {
       "t": "case",
       "q": "A cut separating the head from the neck runs in the … plane.",
       "ask": "Which answer is right?",
       "opts": [
        "Transverse",
        "Sagittal",
        "Coronal"
       ],
       "a": 0,
       "why": "It divides upper from lower parts.",
       "ru": {
        "q": "Разрез, отделяющий голову от шеи, проходит в … плоскости.",
        "ask": "Какой ответ верный?",
        "opts": [
         "горизонтальной [[transverse]]",
         "сагиттальной [[sagittal]]",
         "фронтальной [[coronal]]"
        ],
        "why": "Эта плоскость делит тело на верхнюю и нижнюю части."
       }
      },
      {
       "t": "case",
       "q": "The skin is … to the muscles.",
       "ask": "Which answer is right?",
       "opts": [
        "Superficial",
        "Deep",
        "Medial"
       ],
       "a": 0,
       "why": "It's nearer the body's surface.",
       "ru": {
        "q": "Кожа лежит … мышц.",
        "ask": "Какой ответ верный?",
        "opts": [
         "поверхностнее [[superficial]]",
         "глубже [[deep]]",
         "медиальнее [[medial]]"
        ],
        "why": "Она ближе к поверхности тела."
       }
      }
     ],
     "ru": {
      "name": "1.A Задачи",
      "about": "Какой ответ верный?"
     }
    }
   ],
   "ru": {
    "title": "Анатомические термины"
   }
  },
  {
   "n": 2,
   "title": "Bones and joints",
   "lists": [],
   "ru": {
    "title": "Кости и суставы"
   }
  },
  {
   "n": 3,
   "title": "Muscles",
   "lists": [],
   "ru": {
    "title": "Мышцы"
   }
  },
  {
   "n": 4,
   "title": "The thorax: heart and lungs",
   "lists": [],
   "ru": {
    "title": "Грудная клетка: сердце и лёгкие"
   }
  },
  {
   "n": 5,
   "title": "The abdomen",
   "lists": [],
   "ru": {
    "title": "Брюшная полость"
   }
  },
  {
   "n": 6,
   "title": "Head and neck",
   "lists": [],
   "ru": {
    "title": "Голова и шея"
   }
  },
  {
   "n": 7,
   "title": "The nervous system",
   "lists": [],
   "ru": {
    "title": "Нервная система"
   }
  }
 ],
 "ru": {
  "name": "Анатомия",
  "title": "тело человека по областям",
  "about": "Пока одна глава для примера, остальные скоро"
 }
});
