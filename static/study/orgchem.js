/* Study Quest: Organic Chemistry, for Robiyaxon's app, in Russian (each text's "ru") and English. One example chapter so far; the others are
   listed as coming. Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py and books_robiyaxon_ru.py;
   edit those, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "orgchem",
 "name": "Organic Chemistry",
 "title": "Carbon compounds and their reactions",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Structure, bonding and functional groups",
   "lists": [
    {
     "id": "org-01-know-1",
     "track": "know",
     "name": "1.1 Carbon and hydrocarbons",
     "about": "Bonds, shapes and formulas",
     "items": [
      {
       "key": "Carbon forms this many covalent bonds",
       "text": "4",
       "why": "Carbon is tetravalent.",
       "ru": {
        "key": "Число ковалентных связей, которые образует углерод",
        "text": "4",
        "why": "Углерод четырёхвалентен [[tetravalent]]."
       }
      },
      {
       "key": "Compounds of carbon and hydrogen only are …",
       "text": "hydrocarbons",
       "ru": {
        "key": "Соединения только из углерода и водорода — …",
        "text": "углеводороды [[hydrocarbons]]"
       }
      },
      {
       "key": "Hydrocarbons with only C–C single bonds are …",
       "text": "alkanes",
       "why": "General formula CₙH₂ₙ₊₂, for example methane, CH₄.",
       "ru": {
        "key": "Углеводороды только с одинарными связями C–C — …",
        "text": "алканы [[alkanes]]",
        "why": "Общая формула CₙH₂ₙ₊₂, например метан CH₄."
       }
      },
      {
       "key": "Hydrocarbons with a C=C double bond are …",
       "text": "alkenes",
       "why": "General formula CₙH₂ₙ, for example ethene, C₂H₄.",
       "ru": {
        "key": "Углеводороды с двойной связью C=C — …",
        "text": "алкены [[alkenes]]",
        "why": "Общая формула CₙH₂ₙ, например этен (этилен) C₂H₄."
       }
      },
      {
       "key": "Hydrocarbons with a C≡C triple bond are …",
       "text": "alkynes",
       "why": "General formula CₙH₂ₙ₋₂, for example ethyne, C₂H₂.",
       "ru": {
        "key": "Углеводороды с тройной связью C≡C — …",
        "text": "алкины [[alkynes]]",
        "why": "Общая формула CₙH₂ₙ₋₂, например этин (ацетилен) C₂H₂."
       }
      },
      {
       "key": "The bond angle around an sp³ carbon, as in methane, is …",
       "text": "109.5°",
       "why": "Tetrahedral.",
       "ru": {
        "key": "Валентный угол у атома углерода в sp³-гибридизации, как в метане, — …",
        "text": "109,5°",
        "why": "Тетраэдр [[tetrahedral]]."
       }
      },
      {
       "key": "The bond angle around an sp² carbon, as in ethene, is …",
       "text": "120°",
       "why": "Trigonal planar.",
       "ru": {
        "key": "Валентный угол у атома углерода в sp²-гибридизации, как в этене, — …",
        "text": "120°",
        "why": "Плоский треугольник [[trigonal planar]]."
       }
      },
      {
       "key": "The bond angle around an sp carbon, as in ethyne, is …",
       "text": "180°",
       "why": "Linear.",
       "ru": {
        "key": "Валентный угол у атома углерода в sp-гибридизации, как в этине, — …",
        "text": "180°",
        "why": "Линейная молекула [[linear]]."
       }
      },
      {
       "key": "Compounds with the same molecular formula but different structures are …",
       "text": "isomers",
       "why": "Ethanol and dimethyl ether are both C₂H₆O.",
       "ru": {
        "key": "Соединения с одинаковой молекулярной формулой, но разным строением — …",
        "text": "изомеры [[isomers]]",
        "why": "Этанол и диметиловый эфир — оба C₂H₆O."
       }
      }
     ],
     "ru": {
      "name": "1.1 Углерод и углеводороды",
      "about": "Связи, форма молекул и формулы"
     }
    },
    {
     "id": "org-01-know-2",
     "track": "know",
     "name": "1.2 Functional groups",
     "about": "The group that decides how a molecule reacts",
     "items": [
      {
       "key": "–OH on a carbon chain makes an …",
       "text": "alcohol",
       "why": "Name ending -ol, for example ethanol.",
       "ru": {
        "key": "Группа –OH у углеродной цепи даёт …",
        "text": "спирт [[alcohol]]",
        "why": "Название оканчивается на -ол, например этанол."
       }
      },
      {
       "key": "–CHO, a C=O at the end of the chain, makes an …",
       "text": "aldehyde",
       "why": "Name ending -al, for example ethanal.",
       "ru": {
        "key": "Группа –CHO, то есть C=O на конце цепи, даёт …",
        "text": "альдегид [[aldehyde]]",
        "why": "Название оканчивается на -аль, например этаналь."
       }
      },
      {
       "key": "A C=O inside the chain makes a …",
       "text": "ketone",
       "why": "Name ending -one, for example propanone (acetone).",
       "ru": {
        "key": "Группа C=O внутри цепи даёт …",
        "text": "кетон [[ketone]]",
        "why": "Название оканчивается на -он, например пропанон (ацетон)."
       }
      },
      {
       "key": "–COOH makes a …",
       "text": "carboxylic acid",
       "why": "Name ending -oic acid, for example ethanoic (acetic) acid.",
       "ru": {
        "key": "Группа –COOH даёт …",
        "text": "карбоновую кислоту [[carboxylic acid]]",
        "why": "Название: «…овая кислота», например этановая (уксусная) кислота."
       }
      },
      {
       "key": "–NH₂ makes an …",
       "text": "amine",
       "why": "For example methylamine, CH₃NH₂.",
       "ru": {
        "key": "Группа –NH₂ даёт …",
        "text": "амин [[amine]]",
        "why": "Например, метиламин CH₃NH₂."
       }
      },
      {
       "key": "–COO– between two carbon chains makes an …",
       "text": "ester",
       "why": "Made from an acid and an alcohol, for example ethyl ethanoate.",
       "ru": {
        "key": "Группа –COO– между двумя углеродными цепями даёт …",
        "text": "сложный эфир [[ester]]",
        "why": "Образуется из кислоты и спирта, например этилацетат (этилэтаноат)."
       }
      },
      {
       "key": "–CONH₂ makes an …",
       "text": "amide",
       "ru": {
        "key": "Группа –CONH₂ даёт …",
        "text": "амид [[amide]]"
       }
      },
      {
       "key": "A halogen atom on a carbon chain makes a …",
       "text": "haloalkane",
       "why": "Also called an alkyl halide, for example chloromethane.",
       "ru": {
        "key": "Атом галогена у углеродной цепи даёт …",
        "text": "галогеналкан [[haloalkane]]",
        "why": "Иначе — алкилгалогенид [[alkyl halide]], например хлорметан."
       }
      }
     ],
     "ru": {
      "name": "1.2 Функциональные группы",
      "about": "Группа, от которой зависят реакции молекулы"
     }
    },
    {
     "id": "org-01-structure-3",
     "track": "structure",
     "name": "1.S Naming a compound",
     "about": "Put the steps in order",
     "items": [
      {
       "t": "order",
       "q": "Naming an organic compound (IUPAC)",
       "steps": [
        "Find the longest carbon chain that holds the main functional group",
        "Number the chain so the functional group gets the lowest number",
        "Name and number the side groups (substituents)",
        "List the substituents in alphabetical order before the chain's name",
        "End with the suffix of the main functional group"
       ],
       "ru": {
        "q": "Название органического соединения по ИЮПАК [[IUPAC]]",
        "steps": [
         "Найти самую длинную углеродную цепь с главной функциональной группой",
         "Пронумеровать цепь так, чтобы функциональная группа получила наименьший номер",
         "Назвать и пронумеровать боковые группы (заместители [[substituents]])",
         "Перечислить заместители в алфавитном порядке перед названием цепи",
         "Закончить суффиксом главной функциональной группы"
        ]
       }
      }
     ],
     "ru": {
      "name": "1.S Название соединения",
      "about": "Расставьте шаги по порядку"
     }
    },
    {
     "id": "org-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "Ethanol and dimethyl ether are isomers",
       "a": true,
       "why": "Both are C₂H₆O, with different structures.",
       "ru": {
        "q": "Этанол и диметиловый эфир — изомеры",
        "why": "Оба C₂H₆O, но строение разное."
       }
      },
      {
       "t": "tf",
       "q": "Alkenes have the general formula CₙH₂ₙ₊₂",
       "a": false,
       "why": "That's alkanes; alkenes are CₙH₂ₙ.",
       "ru": {
        "q": "Общая формула алкенов — CₙH₂ₙ₊₂",
        "why": "Это алканы; у алкенов CₙH₂ₙ."
       }
      },
      {
       "t": "tf",
       "q": "The carbon in methane is sp² hybridised",
       "a": false,
       "why": "It's sp³: four single bonds, tetrahedral.",
       "ru": {
        "q": "Атом углерода в метане находится в sp²-гибридизации",
        "why": "В sp³: четыре одинарные связи, тетраэдр."
       }
      },
      {
       "t": "tf",
       "q": "In a ketone the C=O group is at the end of the chain",
       "a": false,
       "why": "At the end it would be an aldehyde; in a ketone it's within the chain.",
       "ru": {
        "q": "В кетоне [[ketone]] группа C=O стоит на конце цепи",
        "why": "На конце цепи была бы альдегидная группа; в кетоне C=O внутри цепи."
       }
      },
      {
       "t": "tf",
       "q": "Propanone is a ketone",
       "a": true,
       "why": "Its C=O is on the middle carbon: CH₃COCH₃.",
       "ru": {
        "q": "Пропанон — кетон",
        "why": "Его C=O у среднего атома углерода: CH₃COCH₃."
       }
      }
     ],
     "ru": {
      "name": "1.W Ловушки",
      "about": "Верно или неверно, и почему"
     }
    },
    {
     "id": "org-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "CH₃CH₂OH is …",
       "ask": "Which answer is right?",
       "opts": [
        "Ethanol, an alcohol",
        "Ethanal, an aldehyde",
        "Ethanoic acid"
       ],
       "a": 0,
       "why": "–OH on a two-carbon chain: ethanol.",
       "ru": {
        "q": "CH₃CH₂OH — это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "этанол [[ethanol]], спирт",
         "этаналь [[ethanal]], альдегид",
         "этановая кислота [[ethanoic acid]]"
        ],
        "why": "Группа –OH у цепи из двух атомов углерода: этанол."
       }
      },
      {
       "t": "case",
       "q": "CH₃COOH is …",
       "ask": "Which answer is right?",
       "opts": [
        "Ethanoic (acetic) acid",
        "Methyl methanoate, an ester",
        "Ethanol"
       ],
       "a": 0,
       "why": "–COOH on a two-carbon chain.",
       "ru": {
        "q": "CH₃COOH — это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "этановая (уксусная) кислота [[ethanoic acid]]",
         "метилформиат [[methyl methanoate]], сложный эфир",
         "этанол [[ethanol]]"
        ],
        "why": "Группа –COOH у цепи из двух атомов углерода."
       }
      },
      {
       "t": "case",
       "q": "C₃H₆ with a C=C double bond is …",
       "ask": "Which answer is right?",
       "opts": [
        "Propene",
        "Propane",
        "Propyne"
       ],
       "a": 0,
       "why": "Three carbons, one double bond: an alkene, CₙH₂ₙ.",
       "ru": {
        "q": "C₃H₆ с двойной связью C=C — это …",
        "ask": "Какой ответ верный?",
        "opts": [
         "пропен [[propene]]",
         "пропан [[propane]]",
         "пропин [[propyne]]"
        ],
        "why": "Три атома углерода и одна двойная связь: алкен, CₙH₂ₙ."
       }
      },
      {
       "t": "case",
       "q": "The bond angle in ethyne, HC≡CH, is …",
       "ask": "Which answer is right?",
       "opts": [
        "180°",
        "120°",
        "109.5°"
       ],
       "a": 0,
       "why": "The carbons are sp hybridised, so the molecule is linear.",
       "ru": {
        "q": "Валентный угол в этине HC≡CH — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "180°",
         "120°",
         "109,5°"
        ],
        "why": "Атомы углерода в sp-гибридизации, поэтому молекула линейная."
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
    "title": "Строение, связи и функциональные группы"
   }
  },
  {
   "n": 2,
   "title": "Alkanes and alkenes: their reactions",
   "lists": [],
   "ru": {
    "title": "Алканы и алкены: их реакции"
   }
  },
  {
   "n": 3,
   "title": "Stereochemistry",
   "lists": [],
   "ru": {
    "title": "Стереохимия"
   }
  },
  {
   "n": 4,
   "title": "Alcohols, aldehydes and ketones",
   "lists": [],
   "ru": {
    "title": "Спирты, альдегиды и кетоны"
   }
  },
  {
   "n": 5,
   "title": "Carboxylic acids and their derivatives",
   "lists": [],
   "ru": {
    "title": "Карбоновые кислоты и их производные"
   }
  },
  {
   "n": 6,
   "title": "Amines and amino acids",
   "lists": [],
   "ru": {
    "title": "Амины и аминокислоты"
   }
  },
  {
   "n": 7,
   "title": "Aromatic compounds",
   "lists": [],
   "ru": {
    "title": "Ароматические соединения"
   }
  }
 ],
 "ru": {
  "name": "Органическая химия",
  "title": "соединения углерода и их реакции",
  "about": "Пока одна глава для примера, остальные скоро"
 }
});
