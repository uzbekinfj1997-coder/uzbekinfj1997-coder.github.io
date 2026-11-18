/* Study Quest: Pathology, for Robiyaxon's app, in Russian (each text's "ru") and English. One example chapter so far; the others are
   listed as coming. Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py and books_robiyaxon_ru.py;
   edit those, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "pathology",
 "name": "Pathology",
 "title": "How disease changes cells, tissues and organs",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Cell injury, adaptation and death",
   "lists": [
    {
     "id": "pat-01-know-1",
     "track": "know",
     "name": "1.1 Adaptations",
     "about": "How cells respond to stress",
     "items": [
      {
       "key": "An increase in the size of cells is …",
       "text": "hypertrophy",
       "why": "For example the heart muscle in long-standing hypertension.",
       "ru": {
        "key": "Увеличение размера клеток — …",
        "text": "гипертрофия [[hypertrophy]]",
        "why": "Например, миокард при длительной артериальной гипертензии."
       }
      },
      {
       "key": "An increase in the number of cells is …",
       "text": "hyperplasia",
       "why": "For example the endometrium in the proliferative phase, or benign prostatic hyperplasia.",
       "ru": {
        "key": "Увеличение числа клеток — …",
        "text": "гиперплазия [[hyperplasia]]",
        "why": "Например, эндометрий в фазе пролиферации или доброкачественная гиперплазия предстательной железы."
       }
      },
      {
       "key": "A decrease in the size of cells, often with fewer of them, is …",
       "text": "atrophy",
       "why": "For example a limb that isn't used, or after its nerve supply is lost.",
       "ru": {
        "key": "Уменьшение размера клеток, часто и их числа, — …",
        "text": "атрофия [[atrophy]]",
        "why": "Например, конечность, которой не пользуются, или после потери её иннервации."
       }
      },
      {
       "key": "One kind of mature cell replaced by another kind is …",
       "text": "metaplasia",
       "why": "For example ciliated columnar cells in a smoker's bronchi replaced by squamous cells.",
       "ru": {
        "key": "Замещение одного вида зрелых клеток другим — …",
        "text": "метаплазия [[metaplasia]]",
        "why": "Например, у курильщика мерцательный цилиндрический эпителий бронхов замещается плоским."
       }
      },
      {
       "key": "Squamous oesophageal lining replaced by columnar cells, from acid reflux, is …",
       "text": "Barrett oesophagus",
       "why": "A metaplasia that raises the risk of adenocarcinoma.",
       "ru": {
        "key": "Замещение плоского эпителия пищевода цилиндрическим из-за заброса кислоты — …",
        "text": "пищевод Барретта [[Barrett oesophagus]]",
        "why": "Метаплазия, которая повышает риск аденокарциномы."
       }
      },
      {
       "key": "Disordered growth with abnormal cells, which can lead to cancer, is …",
       "text": "dysplasia",
       "why": "Not an adaptation: it's a precancerous change.",
       "ru": {
        "key": "Нарушенный рост с атипичными клетками, который может перейти в рак, — …",
        "text": "дисплазия [[dysplasia]]",
        "why": "Это не адаптация, а предраковое изменение."
       }
      }
     ],
     "ru": {
      "name": "1.1 Адаптация",
      "about": "Как клетки отвечают на нагрузку"
     }
    },
    {
     "id": "pat-01-know-2",
     "track": "know",
     "name": "1.2 Injury and cell death",
     "about": "Reversible, irreversible, necrosis and apoptosis",
     "items": [
      {
       "key": "Two signs of reversible cell injury",
       "text": "cell swelling and fatty change",
       "why": "Swelling comes from the Na⁺/K⁺ pump failing as ATP falls.",
       "ru": {
        "key": "Два признака обратимого повреждения клетки",
        "text": "набухание клетки и жировая дистрофия [[cell swelling and fatty change]]",
        "why": "Набухание возникает, когда при падении АТФ отказывает Na⁺/K⁺-насос."
       }
      },
      {
       "key": "Cell death with membrane rupture and inflammation is …",
       "text": "necrosis",
       "ru": {
        "key": "Гибель клетки с разрывом мембраны и воспалением — …",
        "text": "некроз [[necrosis]]"
       }
      },
      {
       "key": "Programmed cell death without inflammation is …",
       "text": "apoptosis",
       "why": "The cell shrinks, its chromatin condenses, and it breaks into apoptotic bodies that are eaten.",
       "ru": {
        "key": "Программируемая гибель клетки без воспаления — …",
        "text": "апоптоз [[apoptosis]]",
        "why": "Клетка сморщивается, хроматин конденсируется, и она распадается на апоптотические тельца, которые поглощаются."
       }
      },
      {
       "key": "Shrinkage of the nucleus in a dying cell is …",
       "text": "pyknosis",
       "ru": {
        "key": "Сморщивание ядра погибающей клетки — …",
        "text": "кариопикноз [[pyknosis]]"
       }
      },
      {
       "key": "Breaking up of the nucleus is …",
       "text": "karyorrhexis",
       "ru": {
        "key": "Распад ядра на глыбки — …",
        "text": "кариорексис [[karyorrhexis]]"
       }
      },
      {
       "key": "Fading away of the nucleus is …",
       "text": "karyolysis",
       "ru": {
        "key": "Растворение ядра — …",
        "text": "кариолизис [[karyolysis]]"
       }
      },
      {
       "key": "Necrosis typical of an infarct in the heart or kidney is …",
       "text": "coagulative necrosis",
       "why": "The tissue's outline is kept for some days.",
       "ru": {
        "key": "Некроз, типичный для инфаркта сердца или почки, — …",
        "text": "коагуляционный некроз [[coagulative necrosis]]",
        "why": "Контуры ткани сохраняются ещё несколько дней."
       }
      },
      {
       "key": "Necrosis typical of an infarct in the brain, or an abscess, is …",
       "text": "liquefactive necrosis",
       "ru": {
        "key": "Некроз, типичный для инфаркта мозга или абсцесса, — …",
        "text": "колликвационный некроз [[liquefactive necrosis]]",
        "why": "Иначе — влажный некроз."
       }
      },
      {
       "key": "Cheese-like necrosis typical of tuberculosis is …",
       "text": "caseous necrosis",
       "ru": {
        "key": "Творожистый некроз, типичный для туберкулёза, — …",
        "text": "казеозный некроз [[caseous necrosis]]"
       }
      },
      {
       "key": "Chalky white necrosis around the pancreas in acute pancreatitis is …",
       "text": "fat necrosis",
       "why": "Released fatty acids combine with calcium (saponification).",
       "ru": {
        "key": "Мелоподобный белый некроз вокруг поджелудочной железы при остром панкреатите — …",
        "text": "жировой некроз [[fat necrosis]]",
        "why": "Высвободившиеся жирные кислоты связываются с кальцием (омыление [[saponification]]). Иначе — стеатонекроз."
       }
      }
     ],
     "ru": {
      "name": "1.2 Повреждение и гибель клеток",
      "about": "Обратимое и необратимое повреждение, некроз и апоптоз"
     }
    },
    {
     "id": "pat-01-structure-3",
     "track": "structure",
     "name": "1.S In order",
     "about": "Put the steps in order",
     "items": [
      {
       "t": "order",
       "q": "A cell's response to increasing stress",
       "steps": [
        "Normal cell",
        "Adaptation: hypertrophy, hyperplasia, atrophy or metaplasia",
        "Reversible injury: swelling, fatty change",
        "Irreversible injury",
        "Cell death: necrosis or apoptosis"
       ],
       "ru": {
        "q": "Ответ клетки на нарастающее повреждение",
        "steps": [
         "Нормальная клетка",
         "Адаптация: гипертрофия, гиперплазия, атрофия или метаплазия",
         "Обратимое повреждение: набухание, жировая дистрофия",
         "Необратимое повреждение",
         "Гибель клетки: некроз или апоптоз"
        ]
       }
      },
      {
       "t": "order",
       "q": "What happens in ischaemia",
       "steps": [
        "Blood supply falls",
        "Oxidative phosphorylation fails and ATP falls",
        "The Na⁺/K⁺ pump fails and the cell swells",
        "Membranes are damaged and calcium floods in",
        "The cell dies (necrosis)"
       ],
       "ru": {
        "q": "Что происходит при ишемии [[ischaemia]]",
        "steps": [
         "Падает кровоснабжение",
         "Нарушается окислительное фосфорилирование [[oxidative phosphorylation]], падает АТФ",
         "Отказывает Na⁺/K⁺-насос, клетка набухает",
         "Повреждаются мембраны, в клетку поступает кальций",
         "Клетка гибнет (некроз)"
        ]
       }
      }
     ],
     "ru": {
      "name": "1.S По порядку",
      "about": "Расставьте шаги по порядку"
     }
    },
    {
     "id": "pat-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "Apoptosis causes inflammation",
       "a": false,
       "why": "The apoptotic bodies are removed quietly; it's necrosis that brings inflammation.",
       "ru": {
        "q": "Апоптоз вызывает воспаление",
        "why": "Апоптотические тельца удаляются незаметно; воспаление вызывает некроз."
       }
      },
      {
       "t": "tf",
       "q": "Metaplasia can go back to normal if the cause is removed",
       "a": true,
       "why": "It's reversible, though it may lead on to dysplasia if the cause persists.",
       "ru": {
        "q": "Метаплазия может исчезнуть, если устранить причину",
        "why": "Она обратима, но если причина остаётся, может перейти в дисплазию."
       }
      },
      {
       "t": "tf",
       "q": "A brain infarct shows coagulative necrosis",
       "a": false,
       "why": "The brain shows liquefactive necrosis.",
       "ru": {
        "q": "Для инфаркта мозга характерен коагуляционный некроз",
        "why": "В мозге развивается колликвационный некроз [[liquefactive necrosis]]."
       }
      },
      {
       "t": "tf",
       "q": "Caseous necrosis is typical of tuberculosis",
       "a": true,
       "why": "Cheese-like, crumbly material inside a granuloma.",
       "ru": {
        "q": "Казеозный некроз типичен для туберкулёза",
        "why": "Творожистые крошащиеся массы внутри гранулёмы [[granuloma]]."
       }
      },
      {
       "t": "tf",
       "q": "Hypertrophy is an increase in the number of cells",
       "a": false,
       "why": "That's hyperplasia; hypertrophy is an increase in their size.",
       "ru": {
        "q": "Гипертрофия — это увеличение числа клеток",
        "why": "Это гиперплазия [[hyperplasia]]; гипертрофия — увеличение их размера."
       }
      }
     ],
     "ru": {
      "name": "1.W Ловушки",
      "about": "Верно или неверно, и почему"
     }
    },
    {
     "id": "pat-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "A smoker's bronchial lining changes from ciliated columnar to stratified squamous epithelium. This is …",
       "ask": "Which answer is right?",
       "opts": [
        "Squamous metaplasia",
        "Dysplasia",
        "Hyperplasia"
       ],
       "a": 0,
       "why": "One mature type is replaced by another that copes better with smoke.",
       "ru": {
        "q": "У курильщика мерцательный цилиндрический эпителий бронхов сменяется многослойным плоским. Это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "плоскоклеточная метаплазия [[squamous metaplasia]]",
         "дисплазия [[dysplasia]]",
         "гиперплазия [[hyperplasia]]"
        ],
        "why": "Один зрелый тип эпителия замещается другим, который лучше переносит дым."
       }
      },
      {
       "t": "case",
       "q": "In long-standing hypertension the heart enlarges because its muscle cells get bigger. This is …",
       "ask": "Which answer is right?",
       "opts": [
        "Hypertrophy",
        "Hyperplasia",
        "Metaplasia"
       ],
       "a": 0,
       "why": "Heart muscle cells can hardly divide, so they grow in size.",
       "ru": {
        "q": "При длительной гипертензии сердце увеличивается, потому что его мышечные клетки становятся больше. Это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "гипертрофия [[hypertrophy]]",
         "гиперплазия [[hyperplasia]]",
         "метаплазия [[metaplasia]]"
        ],
        "why": "Кардиомиоциты почти не делятся, поэтому растут в размере."
       }
      },
      {
       "t": "case",
       "q": "A tuberculous lung lesion is full of soft, crumbly, cheese-like material. This is …",
       "ask": "Which answer is right?",
       "opts": [
        "Caseous necrosis",
        "Liquefactive necrosis",
        "Fat necrosis"
       ],
       "a": 0,
       "why": "Caseous means cheese-like: typical of tuberculosis.",
       "ru": {
        "q": "Туберкулёзный очаг в лёгком заполнен мягкими крошащимися творожистыми массами. Это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "казеозный некроз [[caseous necrosis]]",
         "колликвационный некроз [[liquefactive necrosis]]",
         "жировой некроз [[fat necrosis]]"
        ],
        "why": "Казеозный значит творожистый: типично для туберкулёза."
       }
      },
      {
       "t": "case",
       "q": "Cells shrink, their chromatin condenses, and they break into fragments that macrophages eat, with no inflammation. This is …",
       "ask": "Which answer is right?",
       "opts": [
        "Apoptosis",
        "Coagulative necrosis",
        "Atrophy"
       ],
       "a": 0,
       "why": "Programmed cell death keeps its membranes intact, so nothing leaks to cause inflammation.",
       "ru": {
        "q": "Клетки сморщиваются, хроматин конденсируется, и они распадаются на фрагменты, которые поглощают макрофаги, без воспаления. Это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "апоптоз [[apoptosis]]",
         "коагуляционный некроз [[coagulative necrosis]]",
         "атрофия [[atrophy]]"
        ],
        "why": "При программируемой гибели мембраны остаются целыми, поэтому ничего не вытекает и воспаления нет."
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
    "title": "Повреждение, адаптация и гибель клеток"
   }
  },
  {
   "n": 2,
   "title": "Inflammation and repair",
   "lists": [],
   "ru": {
    "title": "Воспаление и репарация"
   }
  },
  {
   "n": 3,
   "title": "Haemodynamic disorders: thrombosis, embolism and infarction",
   "lists": [],
   "ru": {
    "title": "Расстройства кровообращения: тромбоз, эмболия и инфаркт"
   }
  },
  {
   "n": 4,
   "title": "Immunopathology",
   "lists": [],
   "ru": {
    "title": "Иммунопатология"
   }
  },
  {
   "n": 5,
   "title": "Neoplasia",
   "lists": [],
   "ru": {
    "title": "Опухоли"
   }
  },
  {
   "n": 6,
   "title": "Genetic disorders",
   "lists": [],
   "ru": {
    "title": "Генетические болезни"
   }
  },
  {
   "n": 7,
   "title": "Infectious diseases",
   "lists": [],
   "ru": {
    "title": "Инфекционные болезни"
   }
  }
 ],
 "ru": {
  "name": "Патология",
  "title": "как болезнь меняет клетки, ткани и органы",
  "about": "Пока одна глава для примера, остальные скоро"
 }
});
