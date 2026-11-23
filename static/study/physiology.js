/* Study Quest: Physiology, for Robiyaxon's app, in Russian (each text's "ru") and English, after Pokrovsky and Korotko's textbook.
   Chapter 2 so far; the others are listed as coming. Written for her in my own words. Built by ~/study/school/books_robiyaxon.py;
   edit that, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "physiology",
 "name": "Physiology",
 "title": "Human physiology, after Pokrovsky and Korotko",
 "about": "Chapter 2 first; the others are coming",
 "ru": {
  "name": "Физиология",
  "title": "физиология человека по учебнику Покровского и Коротько",
  "about": "Сначала глава 2, остальные скоро"
 },
 "chapters": [
  {
   "n": 1,
   "title": "Physiology: its subject, methods and history",
   "ru": {
    "title": "Физиология: предмет, методы, краткая история"
   },
   "lists": []
  },
  {
   "n": 2,
   "title": "Excitable tissues",
   "ru": {
    "title": "Возбудимые ткани"
   },
   "lists": [
    {
     "id": "phy-02-know-1",
     "track": "know",
     "name": "2.1 Excitability",
     "about": "Irritability, excitability, excitation",
     "ru": {
      "name": "2.1 Возбудимость",
      "about": "Раздражимость, возбудимость, возбуждение"
     },
     "items": [
      {
       "key": "The ability of living cells to respond to a stimulus by changing their metabolism is …",
       "text": "irritability",
       "why": "The basic property of all living cells.",
       "ru": {
        "key": "Способность живых клеток отвечать на действие раздражителя изменением обмена веществ — …",
        "text": "раздражимость [[irritability]]",
        "why": "Основное свойство всех живых клеток."
       }
      },
      {
       "key": "The ability of cells to respond to a stimulus with excitation is …",
       "text": "excitability",
       "why": "Nerve, muscle and some secretory cells are excitable.",
       "ru": {
        "key": "Способность клеток отвечать на раздражение возбуждением — …",
        "text": "возбудимость [[excitability]]",
        "why": "Возбудимы нервные, мышечные и некоторые секреторные клетки."
       }
      },
      {
       "key": "A tissue's response to a stimulus, shown by its own function and by an action potential, is …",
       "text": "excitation",
       "why": "Its own function: conduction in nerve, contraction in muscle, secretion in a gland. The non-specific signs: the action potential and changes in metabolism.",
       "ru": {
        "key": "Ответ ткани на раздражение, который проявляется её специфической функцией и потенциалом действия, — …",
        "text": "возбуждение [[excitation]]",
        "why": "Специфическая функция: проведение у нерва, сокращение у мышцы, секреция у железы. Неспецифические признаки: потенциал действия и изменения обмена."
       }
      },
      {
       "key": "A frog's nerve–muscle preparation touched by two different metals joined together twitches: this is …",
       "text": "Galvani's first experiment",
       "why": "Volta explained it by current arising where the two metals meet the salt solution, not in the tissue.",
       "ru": {
        "key": "Нервно-мышечный препарат лягушки сокращается, если к нему приложить две соединённые пластинки из разных металлов: это …",
        "text": "первый опыт Гальвани [[Galvani's first experiment]]",
        "why": "Вольта объяснил это током, который возникает в месте контакта разных металлов с солевым раствором, а не в ткани."
       }
      },
      {
       "key": "A muscle twitches when its own cut nerve is laid on it, with no metal at all: this is …",
       "text": "Galvani's second experiment",
       "why": "It showed that electricity arises in the living tissue itself (\"animal electricity\").",
       "ru": {
        "key": "Мышца сокращается, если на неё набросить её же перерезанный нерв, без всякого металла: это …",
        "text": "второй опыт Гальвани [[Galvani's second experiment]]",
        "why": "Он показал, что электричество возникает в самой живой ткани («животное электричество»)."
       }
      },
      {
       "key": "A contracting muscle's currents excite the nerve of a second preparation laid on it: this is …",
       "text": "Matteucci's secondary tetanus",
       "why": "The final proof of electrical events in living tissue.",
       "ru": {
        "key": "Токи сокращающейся мышцы возбуждают нерв второго препарата, наложенный на неё: это …",
        "text": "вторичный тетанус Маттеуччи [[secondary tetanus]]",
        "why": "Окончательное доказательство электрических явлений в живых тканях."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-2",
     "track": "know",
     "name": "2.2 Membranes and ion channels",
     "about": "What the membrane does, how channels open and close",
     "ru": {
      "name": "2.2 Мембраны и ионные каналы",
      "about": "Функции мембраны, как открываются и закрываются каналы"
     },
     "items": [
      {
       "key": "The cell membrane is about … thick",
       "text": "6–12 nm",
       "why": "Its phospholipid bilayer is about 5 nm; a channel is only 0.5–0.7 nm across.",
       "ru": {
        "key": "Толщина клеточной мембраны — …",
        "text": "6–12 нм",
        "why": "Фосфолипидный бислой около 5 нм; диаметр канала всего 0,5–0,7 нм."
       }
      },
      {
       "key": "The most widely accepted model of the membrane, proteins set in a lipid bilayer, is the …",
       "text": "fluid mosaic model",
       "why": "Hydrophobic tails face inwards; receptors, enzymes, channels, pumps and carriers are proteins set in the bilayer.",
       "ru": {
        "key": "Наиболее принятая модель мембраны — белки, встроенные в липидный бислой, — это …",
        "text": "жидкостно-мозаичная модель [[fluid mosaic model]]",
        "why": "Гидрофобные концы обращены внутрь; рецепторы, ферменты, каналы, насосы и переносчики — белки, встроенные в бислой."
       }
      },
      {
       "key": "Holding the membrane potential at a set level and measuring the ion current is the …",
       "text": "voltage clamp",
       "why": "Used with channel blockers, it revealed the different kinds of channel.",
       "ru": {
        "key": "Фиксация мембранного потенциала на заданном уровне с измерением ионного тока — это …",
        "text": "метод фиксации напряжения [[voltage clamp]]",
        "why": "Вместе с блокаторами каналов он позволил открыть разные типы каналов."
       }
      },
      {
       "key": "Sealing a micropipette onto a patch of membrane to record a single channel is the …",
       "text": "patch clamp",
       "why": "A single channel's current is rectangular: it is either open or shut.",
       "ru": {
        "key": "Микропипетку присасывают к участку мембраны и регистрируют ток одиночного канала: это …",
        "text": "метод локальной фиксации потенциала [[patch clamp]]",
        "why": "Ток одиночного канала прямоугольный: канал либо открыт, либо закрыт."
       }
      },
      {
       "key": "The two properties that channels give the membrane are …",
       "text": "selectivity and conductance",
       "why": "Most channels are voltage-gated, with gates at their entrance and exit.",
       "ru": {
        "key": "Два свойства, которые каналы придают мембране, — …",
        "text": "селективность и проводимость [[selectivity and conductance]]",
        "why": "Большинство каналов электроуправляемые, с воротами у входа и выхода."
       }
      },
      {
       "key": "On depolarisation, the sodium channel's m gates open: this is …",
       "text": "activation",
       "why": "In a few milliseconds the h gates close it: inactivation.",
       "ru": {
        "key": "При деполяризации открываются m-ворота натриевого канала: это …",
        "text": "активация [[activation]]",
        "why": "Через несколько миллисекунд его закрывают h-ворота: инактивация."
       }
      },
      {
       "key": "A few milliseconds after opening, the sodium channel's h gates close: this is …",
       "text": "inactivation",
       "why": "How much depends on how large and how long the depolarisation is. Potassium channels have no such inactivation.",
       "ru": {
        "key": "Через несколько миллисекунд после открытия h-ворота натриевого канала закрываются: это …",
        "text": "инактивация [[inactivation]]",
        "why": "Её степень зависит от величины и длительности деполяризации. У калиевых каналов такой инактивации нет."
       }
      },
      {
       "key": "The fast sodium channels are blocked by …",
       "text": "tetrodotoxin (TTX)",
       "why": "Without them there is no action potential.",
       "ru": {
        "key": "Быстрые натриевые каналы блокирует …",
        "text": "тетродотоксин [[tetrodotoxin]]",
        "why": "Без них потенциал действия не возникает."
       }
      },
      {
       "key": "The delayed-rectifier potassium channels, which repolarise the membrane, are blocked by …",
       "text": "tetraethylammonium (TEA)",
       "why": "TEA slows repolarisation, so the action potential lasts longer.",
       "ru": {
        "key": "Калиевые каналы задержанного выпрямления, которые обеспечивают реполяризацию, блокирует …",
        "text": "тетраэтиламмоний [[tetraethylammonium]]",
        "why": "Тетраэтиламмоний замедляет реполяризацию, и потенциал действия удлиняется."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-3",
     "track": "know",
     "name": "2.3 The resting potential",
     "about": "Its size, what makes it, the pump",
     "ru": {
      "name": "2.3 Потенциал покоя",
      "about": "Величина, причины, насос"
     },
     "items": [
      {
       "key": "The resting potential of excitable cells is usually …",
       "text": "−70 to −95 mV",
       "why": "The inside is negative to the outside, which is taken as zero.",
       "ru": {
        "key": "Потенциал покоя возбудимых клеток обычно равен …",
        "text": "от −70 до −95 мВ",
        "why": "Внутренняя сторона заряжена отрицательно относительно наружной, которую принимают за ноль."
       }
      },
      {
       "key": "The three causes of the resting potential, after Hodgkin and Huxley, are …",
       "text": "selective permeability, ion asymmetry and active transport",
       "ru": {
        "key": "Три причины потенциала покоя по Ходжкину и Хаксли — …",
        "text": "избирательная проницаемость, ионная асимметрия и активный транспорт [[selective permeability, ion asymmetry, active transport]]"
       }
      },
      {
       "key": "At rest the membrane is most permeable to …",
       "text": "K⁺",
       "why": "Much less to Na⁺; the small Na⁺ leak in makes the resting potential a little smaller.",
       "ru": {
        "key": "В покое мембрана наиболее проницаема для …",
        "text": "K⁺",
        "why": "Для Na⁺ — намного меньше; небольшой вход Na⁺ немного уменьшает потенциал покоя."
       }
      },
      {
       "key": "Inside the cell, K⁺ is more concentrated than outside by …",
       "text": "20–50 times",
       "ru": {
        "key": "Концентрация K⁺ внутри клетки выше, чем снаружи, в …",
        "text": "20–50 раз"
       }
      },
      {
       "key": "The potential at which an ion's inflow and outflow balance is its …",
       "text": "equilibrium potential",
       "why": "The chemical gradient is matched by the electrical one; it's given by the Nernst equation.",
       "ru": {
        "key": "Потенциал, при котором вход и выход иона уравновешены, — его …",
        "text": "равновесный потенциал [[equilibrium potential]]",
        "why": "Химический градиент уравновешен электрическим; его рассчитывают по формуле Нернста."
       }
      },
      {
       "key": "The potassium equilibrium potential is larger than the real resting potential because of …",
       "text": "the small leak of Na⁺ into the cell",
       "ru": {
        "key": "Калиевый равновесный потенциал по модулю больше реального потенциала покоя из-за …",
        "text": "небольшой утечки Na⁺ в клетку [[sodium leak]]"
       }
      },
      {
       "key": "In each cycle the Na⁺/K⁺ pump moves …",
       "text": "3 Na⁺ out and 2 K⁺ in",
       "why": "Using ATP. It is electrogenic, but adds only a few millivolts to the resting potential.",
       "ru": {
        "key": "За один цикл Na⁺/K⁺-насос переносит …",
        "text": "3 Na⁺ наружу и 2 K⁺ внутрь",
        "why": "За счёт АТФ. Насос электрогенный, но добавляет к потенциалу покоя лишь несколько милливольт."
       }
      },
      {
       "key": "The pump is stopped by the cardiac glycoside …",
       "text": "ouabain",
       "why": "Then the K⁺ gradient runs down and the membrane potential falls towards zero: proof of active transport.",
       "ru": {
        "key": "Насос подавляет сердечный гликозид …",
        "text": "оуабаин [[ouabain]]",
        "why": "Тогда градиент K⁺ выравнивается и мембранный потенциал падает к нулю: доказательство активного транспорта."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-4",
     "track": "know",
     "name": "2.4 The action potential",
     "about": "Its phases and what drives them",
     "ru": {
      "name": "2.4 Потенциал действия",
      "about": "Фазы и их механизмы"
     },
     "items": [
      {
       "key": "A fast swing of the membrane potential, usually with the inside turning positive, is the …",
       "text": "action potential",
       "why": "Also called a spike or an impulse.",
       "ru": {
        "key": "Быстрое колебание мембранного потенциала, обычно с перезарядкой мембраны, — это …",
        "text": "потенциал действия [[action potential]]",
        "why": "Его называют также спайком или импульсом."
       }
      },
      {
       "key": "The membrane potential at which an action potential starts is the …",
       "text": "critical level of depolarisation",
       "why": "At this level Na⁺ inflow grows like an avalanche: positive feedback.",
       "ru": {
        "key": "Уровень мембранного потенциала, при котором начинается потенциал действия, — …",
        "text": "критический уровень деполяризации [[critical level of depolarisation]]",
        "why": "На этом уровне вход Na⁺ нарастает лавинообразно: положительная обратная связь."
       }
      },
      {
       "key": "Active changes below threshold, before the action potential, are the …",
       "text": "local response",
       "why": "They appear at about 50–80% of the threshold current.",
       "ru": {
        "key": "Активные подпороговые изменения потенциала перед потенциалом действия — …",
        "text": "локальный ответ [[local response]]",
        "why": "Они появляются примерно при 50–80% порогового тока."
       }
      },
      {
       "key": "The weakest current that brings the membrane to the critical level is the …",
       "text": "threshold current",
       "ru": {
        "key": "Минимальный ток, который доводит мембрану до критического уровня, — …",
        "text": "пороговый ток [[threshold current]]"
       }
      },
      {
       "key": "The part of the action potential above zero is the …",
       "text": "overshoot",
       "why": "Caused by Na⁺ entering; at the peak the potential nears the sodium equilibrium potential.",
       "ru": {
        "key": "Часть потенциала действия выше нуля — …",
        "text": "овершут [[overshoot]]",
        "why": "Его вызывает вход Na⁺; на пике потенциал приближается к натриевому равновесному."
       }
      },
      {
       "key": "The size of an action potential hardly depends on the strength of a suprathreshold stimulus: the …",
       "text": "all-or-none law",
       "ru": {
        "key": "Амплитуда потенциала действия почти не зависит от силы надпорогового стимула: это закон …",
        "text": "«всё или ничего» [[all-or-none law]]"
       }
      },
      {
       "key": "Repolarisation is caused by …",
       "text": "the delayed outward K⁺ current",
       "why": "It peaks 5–8 ms after the action potential begins.",
       "ru": {
        "key": "Реполяризацию вызывает …",
        "text": "задержанный выходящий ток K⁺ [[delayed K⁺ current]]",
        "why": "Его максимум через 5–8 мс от начала потенциала действия."
       }
      },
      {
       "key": "The hyperpolarisation after the action potential is the …",
       "text": "positive after-potential",
       "why": "From the K⁺ current that is still flowing, and the electrogenic pump.",
       "ru": {
        "key": "Гиперполяризация после потенциала действия — …",
        "text": "положительный следовой потенциал [[positive after-potential]]",
        "why": "Её вызывают ещё не закончившийся ток K⁺ и электрогенный насос."
       }
      },
      {
       "key": "A rise in blood Ca²⁺ makes excitability …",
       "text": "fall",
       "why": "The threshold moves further from the resting potential; low Ca²⁺ does the opposite.",
       "ru": {
        "key": "Повышение концентрации Ca²⁺ делает возбудимость …",
        "text": "ниже [[lower]]",
        "why": "Порог отодвигается от потенциала покоя; снижение Ca²⁺ действует наоборот."
       }
      },
      {
       "key": "Slow depolarisation to about −50 mV, as with lack of oxygen, makes the cell …",
       "text": "inexcitable",
       "why": "Its sodium channels are all inactivated.",
       "ru": {
        "key": "Медленная деполяризация примерно до −50 мВ, например при недостатке кислорода, делает клетку …",
        "text": "невозбудимой [[inexcitable]]",
        "why": "Все её натриевые каналы инактивированы."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-5",
     "track": "know",
     "name": "2.5 Refractoriness and lability",
     "about": "How excitability changes during and after a spike",
     "ru": {
      "name": "2.5 Рефрактерность и лабильность",
      "about": "Как меняется возбудимость во время и после спайка"
     },
     "items": [
      {
       "key": "When no stimulus of any strength can excite the cell again, it is in …",
       "text": "absolute refractoriness",
       "why": "Because the sodium channels are inactivated.",
       "ru": {
        "key": "Когда клетку нельзя повторно возбудить раздражителем любой силы, она в состоянии …",
        "text": "абсолютной рефрактерности [[absolute refractoriness]]",
        "why": "Потому что натриевые каналы инактивированы."
       }
      },
      {
       "key": "During repolarisation a second spike needs a stronger than threshold stimulus: this is …",
       "text": "relative refractoriness",
       "ru": {
        "key": "Во время реполяризации для повторного спайка нужен сверхпороговый стимул: это …",
        "text": "относительная рефрактерность [[relative refractoriness]]"
       }
      },
      {
       "key": "During the local response and the negative after-potential, a below-threshold stimulus is enough: this is …",
       "text": "supernormal excitability (exaltation)",
       "ru": {
        "key": "Во время локального ответа и отрицательного следового потенциала достаточно подпорогового стимула: это …",
        "text": "супернормальная возбудимость, экзальтация [[supernormal excitability]]"
       }
      },
      {
       "key": "During the positive after-potential excitability is …",
       "text": "below normal (subnormal)",
       "ru": {
        "key": "Во время положительного следового потенциала возбудимость …",
        "text": "ниже нормы, субнормальная [[subnormal]]"
       }
      },
      {
       "key": "With an absolute refractory period of 4 ms, the highest firing rate is …",
       "text": "250 Hz",
       "why": "1 s ÷ 4 ms = 250 spikes a second.",
       "ru": {
        "key": "При абсолютной рефрактерности 4 мс максимальная частота импульсов — …",
        "text": "250 Гц",
        "why": "1 с ÷ 4 мс = 250 импульсов в секунду."
       }
      },
      {
       "key": "The number of action potentials a tissue can produce per second is its …",
       "text": "lability",
       "why": "Vvedensky's term, set mainly by the refractory period. The auditory nerve's fibres are the most labile: up to 1000 Hz.",
       "ru": {
        "key": "Число потенциалов действия, которое ткань может генерировать в секунду, — её …",
        "text": "лабильность [[lability]]",
        "why": "Понятие Введенского, определяется прежде всего рефрактерностью. Самые лабильные — волокна слухового нерва: до 1000 Гц."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-6",
     "track": "know",
     "name": "2.6 Electric current and tissue",
     "about": "Pflüger's law, rheobase, chronaxie, accommodation",
     "ru": {
      "name": "2.6 Действие электрического тока",
      "about": "Закон Пфлюгера, реобаза, хронаксия, аккомодация"
     },
     "items": [
      {
       "key": "Excitation arises under the cathode when the current is switched on, and under the anode when it is switched off: …",
       "text": "Pflüger's polar law",
       "ru": {
        "key": "Возбуждение возникает под катодом при замыкании тока и под анодом при размыкании: …",
        "text": "закон полярного действия тока Пфлюгера [[Pflüger's law]]"
       }
      },
      {
       "key": "Under the cathode a brief weak current makes excitability …",
       "text": "rise",
       "why": "It depolarises the membrane, bringing it nearer the critical level; the anode hyperpolarises it.",
       "ru": {
        "key": "Под катодом кратковременный слабый ток делает возбудимость …",
        "text": "выше [[higher]]",
        "why": "Он деполяризует мембрану и приближает её к критическому уровню; анод её гиперполяризует."
       }
      },
      {
       "key": "Passive below-threshold shifts of the membrane potential under the electrodes are …",
       "text": "electrotonus",
       "why": "They fade with distance: the length constant is where they fall to 37%.",
       "ru": {
        "key": "Пассивные подпороговые сдвиги мембранного потенциала под электродами — …",
        "text": "электротон [[electrotonus]]",
        "why": "Они затухают с расстоянием: константа длины — расстояние, на котором сдвиг падает до 37%."
       }
      },
      {
       "key": "The fall in excitability under a long-lasting, slowly rising stimulus is …",
       "text": "accommodation",
       "why": "The sodium channels become inactivated, so the critical level moves up.",
       "ru": {
        "key": "Снижение возбудимости при длительном или медленно нарастающем раздражителе — …",
        "text": "аккомодация [[accommodation]]",
        "why": "Натриевые каналы инактивируются, и критический уровень смещается вверх."
       }
      },
      {
       "key": "The weakest current that can excite, however long it lasts, is the …",
       "text": "rheobase",
       "ru": {
        "key": "Минимальная сила тока, способная вызвать возбуждение при любой длительности, — …",
        "text": "реобаза [[rheobase]]"
       }
      },
      {
       "key": "The time a threshold-strength (rheobase) current must act to excite is the …",
       "text": "useful time",
       "ru": {
        "key": "Время, в течение которого должен действовать ток пороговой силы (реобаза), чтобы вызвать возбуждение, — …",
        "text": "полезное время [[utilisation time]]"
       }
      },
      {
       "key": "The time a current of twice the rheobase must act to excite is the …",
       "text": "chronaxie",
       "why": "Lapicque's measure; it rises a lot when nerves or muscles are damaged.",
       "ru": {
        "key": "Время, в течение которого должен действовать ток удвоенной реобазы, чтобы вызвать возбуждение, — …",
        "text": "хронаксия [[chronaxie]]",
        "why": "Мера Лапика; при поражении нервов и мышц она значительно возрастает."
       }
      },
      {
       "key": "The curve linking a stimulus's strength and the time it needs to excite is the …",
       "text": "strength–duration curve",
       "why": "A hyperbola (Hoorweg–Weiss–Lapicque).",
       "ru": {
        "key": "Кривая зависимости между силой раздражителя и временем, нужным для возбуждения, — …",
        "text": "кривая «сила — длительность» [[strength-duration curve]]",
        "why": "Гипербола (Гоорвега — Вейса — Лапика)."
       }
      },
      {
       "key": "The most dangerous alternating current for the heart is mains current, at …",
       "text": "50 Hz",
       "why": "It can hit the heart's vulnerable phase and cause ventricular fibrillation.",
       "ru": {
        "key": "Самый опасный для сердца переменный ток — сетевой, частотой …",
        "text": "50 Гц",
        "why": "Он может попасть в фазу уязвимости и вызвать фибрилляцию желудочков."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-7",
     "track": "know",
     "name": "2.7 Neurons and glia",
     "about": "Kinds of neuron, the glial cells",
     "ru": {
      "name": "2.7 Нейроны и нейроглия",
      "about": "Виды нейронов, клетки глии"
     },
     "items": [
      {
       "key": "The structural and functional unit of the nervous system is the …",
       "text": "neuron",
       "why": "It receives, processes, codes, passes on and stores information.",
       "ru": {
        "key": "Структурная и функциональная единица нервной системы — …",
        "text": "нейрон [[neuron]]",
        "why": "Он принимает, обрабатывает, кодирует, передаёт и хранит информацию."
       }
      },
      {
       "key": "The neuron's main receiving surface is its …",
       "text": "dendrites",
       "why": "With their spines, which vanish if they get no input for long.",
       "ru": {
        "key": "Основное воспринимающее поле нейрона — его …",
        "text": "дендриты [[dendrites]]",
        "why": "Вместе с шипиками, которые исчезают, если долго не получают сигналов."
       }
      },
      {
       "key": "The action potential starts first at the …",
       "text": "axon hillock",
       "why": "Its threshold is the lowest in the neuron.",
       "ru": {
        "key": "Потенциал действия раньше всего возникает в …",
        "text": "аксонном холмике [[axon hillock]]",
        "why": "Порог здесь самый низкий в нейроне."
       }
      },
      {
       "key": "The basophilic substance of the neuron, rich in RNA and making protein, is the …",
       "text": "Nissl substance",
       "why": "It disappears with long excitation.",
       "ru": {
        "key": "Базофильное вещество нейрона, богатое РНК и синтезирующее белок, — …",
        "text": "вещество Ниссля [[Nissl substance]]",
        "why": "При длительном возбуждении оно исчезает."
       }
      },
      {
       "key": "The neurons of the spinal and trigeminal ganglia are …",
       "text": "pseudounipolar",
       "why": "They carry touch, pain, temperature and position sense.",
       "ru": {
        "key": "Нейроны спинальных и тройничного узлов — …",
        "text": "псевдоуниполярные [[pseudounipolar]]",
        "why": "Они проводят тактильную, болевую, температурную и проприоцептивную чувствительность."
       }
      },
      {
       "key": "Neurons with one dendrite and one axon, in the retina, the inner ear and the nose, are …",
       "text": "bipolar",
       "ru": {
        "key": "Нейроны с одним дендритом и одним аксоном, в сетчатке, внутреннем ухе и обонятельной системе, — …",
        "text": "биполярные [[bipolar]]"
       }
      },
      {
       "key": "True unipolar neurons are found only in the …",
       "text": "mesencephalic nucleus of the trigeminal nerve",
       "ru": {
        "key": "Истинно униполярные нейроны есть только в …",
        "text": "мезэнцефалическом ядре тройничного нерва [[mesencephalic trigeminal nucleus]]"
       }
      },
      {
       "key": "The glial cells whose end feet wrap the capillaries are …",
       "text": "astrocytes",
       "why": "Mostly in grey matter: support, repair and the neurons' metabolism.",
       "ru": {
        "key": "Клетки глии, ножки которых окутывают капилляры, — …",
        "text": "астроциты [[astrocytes]]",
        "why": "В основном в сером веществе: опора, восстановление, обмен веществ нейронов."
       }
      },
      {
       "key": "Myelin in the central nervous system is made by …",
       "text": "oligodendrocytes",
       "why": "In the peripheral nerves, by Schwann cells (lemmocytes).",
       "ru": {
        "key": "Миелин в центральной нервной системе образуют …",
        "text": "олигодендроциты [[oligodendrocytes]]",
        "why": "В периферических нервах — шванновские клетки, леммоциты."
       }
      },
      {
       "key": "The smallest, wandering glial cells, of mesodermal origin, able to phagocytose, are the …",
       "text": "microglia",
       "ru": {
        "key": "Самые мелкие блуждающие клетки глии мезодермального происхождения, способные к фагоцитозу, — …",
        "text": "микроглия [[microglia]]"
       }
      }
     ]
    },
    {
     "id": "phy-02-know-8",
     "track": "know",
     "name": "2.8 Receptors and nerve fibres",
     "about": "From stimulus to impulse; how fibres conduct",
     "ru": {
      "name": "2.8 Рецепторы и нервные волокна",
      "about": "От раздражения к импульсу; как проводят волокна"
     },
     "items": [
      {
       "key": "The four groups of receptors are …",
       "text": "mechano-, thermo-, chemo- and photoreceptors",
       "ru": {
        "key": "Четыре группы рецепторов — …",
        "text": "механо-, термо-, хемо- и фоторецепторы [[mechano-, thermo-, chemo- and photoreceptors]]"
       }
      },
      {
       "key": "The depolarisation in the receptive part of the membrane is the …",
       "text": "receptor potential",
       "ru": {
        "key": "Деполяризация в рецептивном участке мембраны — …",
        "text": "рецепторный потенциал [[receptor potential]]"
       }
      },
      {
       "key": "The receptor potential spread to the axon hillock, where impulses start, is the …",
       "text": "generator potential",
       "why": "The bigger it is, the faster the impulses.",
       "ru": {
        "key": "Рецепторный потенциал, дошедший до аксонного холмика, где возникают импульсы, — …",
        "text": "генераторный потенциал [[generator potential]]",
        "why": "Чем он больше, тем выше частота импульсов."
       }
      },
      {
       "key": "Receptors that adapt slowly and keep firing are …",
       "text": "tonic",
       "why": "Phasic ones answer quickly with a short burst.",
       "ru": {
        "key": "Рецепторы, которые медленно адаптируются и долго генерируют импульсы, — …",
        "text": "тонические [[tonic]]",
        "why": "Фазические отвечают быстро и коротким залпом."
       }
      },
      {
       "key": "In a myelinated fibre the impulse jumps from node to node: this is …",
       "text": "saltatory conduction",
       "why": "Up to 12,000 sodium channels per µm² at a node of Ranvier.",
       "ru": {
        "key": "В миелиновом волокне импульс перескакивает от перехвата к перехвату: это …",
        "text": "сальтаторное проведение [[saltatory conduction]]",
        "why": "В перехвате Ранвье до 12 000 натриевых каналов на 1 мкм²."
       }
      },
      {
       "key": "Myelin is …",
       "text": "80% lipid and 20% protein",
       "why": "The lipid gives it a high resistance.",
       "ru": {
        "key": "Миелин состоит на …",
        "text": "80% из липидов и на 20% из белка",
        "why": "Липиды дают ему высокое сопротивление."
       }
      },
      {
       "key": "Nerve fibres were sorted into types A, B and C by conduction speed by …",
       "text": "Erlanger and Gasser",
       "ru": {
        "key": "Нервные волокна разделили на типы A, B и C по скорости проведения …",
        "text": "Эрлангер и Гассер [[Erlanger and Gasser]]"
       }
      },
      {
       "key": "The thickest and fastest fibres, 12–22 µm across, are type …",
       "text": "Aα, up to 120 m/s",
       "ru": {
        "key": "Самые толстые и быстрые волокна, диаметром 12–22 мкм, — тип …",
        "text": "Aα, до 120 м/с"
       }
      },
      {
       "key": "Excitation in one fibre does not pass to its neighbours in the nerve: the law of …",
       "text": "isolated conduction",
       "why": "So each motor unit can contract on its own. A nerve also needs to be intact physiologically, not just anatomically.",
       "ru": {
        "key": "Возбуждение в одном волокне не переходит на соседние волокна нерва: закон …",
        "text": "изолированного проведения [[isolated conduction]]",
        "why": "Поэтому каждая двигательная единица может сокращаться отдельно. Нерв проводит, только если он цел не только анатомически, но и физиологически."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-9",
     "track": "know",
     "name": "2.9 Synapses",
     "about": "Kinds, transmitters, PSPs",
     "ru": {
      "name": "2.9 Синапсы",
      "about": "Виды, медиаторы, постсинаптические потенциалы"
     },
     "items": [
      {
       "key": "A synapse has three parts: …",
       "text": "presynaptic part, synaptic cleft, postsynaptic part",
       "ru": {
        "key": "Синапс состоит из трёх частей: …",
        "text": "пресинаптическая часть, синаптическая щель, постсинаптическая часть [[presynaptic part, cleft, postsynaptic part]]"
       }
      },
      {
       "key": "By how they pass the signal, synapses are …",
       "text": "electrical, chemical or mixed",
       "ru": {
        "key": "По способу передачи сигнала синапсы бывают …",
        "text": "электрическими, химическими и смешанными [[electrical, chemical, mixed]]"
       }
      },
      {
       "key": "Synapses that are fast, hardly tire and serve urgent escape reactions are …",
       "text": "electrical",
       "why": "They have a very short delay.",
       "ru": {
        "key": "Синапсы, которые работают быстро, мало утомляются и служат срочным реакциям бегства, — …",
        "text": "электрические [[electrical]]",
        "why": "У них очень малая синаптическая задержка."
       }
      },
      {
       "key": "A transmitter raising the postsynaptic membrane's Na⁺ permeability gives an …",
       "text": "EPSP",
       "why": "Excitatory postsynaptic potential: 0.12–5 mV, depending on how much transmitter is released.",
       "ru": {
        "key": "Медиатор, повышающий проницаемость постсинаптической мембраны для Na⁺, вызывает …",
        "text": "ВПСП [[EPSP]]",
        "why": "Возбуждающий постсинаптический потенциал: 0,12–5 мВ, в зависимости от количества медиатора."
       }
      },
      {
       "key": "The two inhibitory transmitters of the central nervous system are …",
       "text": "GABA and glycine",
       "why": "They hyperpolarise the membrane: an IPSP.",
       "ru": {
        "key": "Два тормозных медиатора центральной нервной системы — …",
        "text": "ГАМК и глицин [[GABA and glycine]]",
        "why": "Они гиперполяризуют мембрану: ТПСП."
       }
      },
      {
       "key": "The synaptic delay in a chemical synapse is about …",
       "text": "0.5 ms",
       "ru": {
        "key": "Синаптическая задержка в химическом синапсе — около …",
        "text": "0,5 мс"
       }
      },
      {
       "key": "Transmitter is released into the cleft by …",
       "text": "exocytosis",
       "why": "A vesicle fuses with the membrane and opens into the cleft.",
       "ru": {
        "key": "Медиатор выходит в синаптическую щель путём …",
        "text": "экзоцитоза [[exocytosis]]",
        "why": "Пузырёк сливается с мембраной и открывается в щель."
       }
      },
      {
       "key": "The postsynaptic potential is built from small potentials, each from one quantum of transmitter: the …",
       "text": "miniature potentials",
       "ru": {
        "key": "Постсинаптический потенциал складывается из малых потенциалов, каждый от одного кванта медиатора: …",
        "text": "миниатюрных потенциалов [[miniature potentials]]"
       }
      },
      {
       "key": "Acetylcholine in the cleft is broken down by …",
       "text": "acetylcholinesterase",
       "why": "Noradrenaline: by monoamine oxidase and catechol-O-methyltransferase; what is left is taken back into the presynaptic ending.",
       "ru": {
        "key": "Ацетилхолин в щели разрушает …",
        "text": "ацетилхолинэстераза [[acetylcholinesterase]]",
        "why": "Норадреналин — моноаминоксидаза и катехол-О-метилтрансфераза; остаток всасывается обратно в пресинаптическое окончание."
       }
      },
      {
       "key": "Long high-frequency firing can block a synapse through lasting depolarisation of its postsynaptic membrane: …",
       "text": "pessimal inhibition",
       "ru": {
        "key": "Длительная высокочастотная импульсация может блокировать синапс стойкой деполяризацией постсинаптической мембраны: …",
        "text": "пессимальное торможение [[pessimal inhibition]]"
       }
      },
      {
       "key": "A synapse passes signals better the more it is used: the …",
       "text": "training effect",
       "why": "Transmission in a chemical synapse goes one way only.",
       "ru": {
        "key": "Синапс передаёт сигналы тем эффективнее, чем чаще используется: это …",
        "text": "эффект тренировки [[training effect]]",
        "why": "Проведение в химическом синапсе одностороннее."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-10",
     "track": "know",
     "name": "2.10 The neuromuscular junction",
     "about": "The end plate, and what blocks it",
     "ru": {
      "name": "2.10 Нервно-мышечный синапс",
      "about": "Концевая пластинка и её блокада"
     },
     "items": [
      {
       "key": "The postsynaptic part of the neuromuscular junction is the muscle fibre's …",
       "text": "end plate",
       "why": "Its transmitter is acetylcholine.",
       "ru": {
        "key": "Постсинаптическая часть нервно-мышечного синапса — это … мышечного волокна",
        "text": "концевая пластинка [[end plate]]",
        "why": "Медиатор здесь — ацетилхолин."
       }
      },
      {
       "key": "The release of acetylcholine is triggered by the entry of …",
       "text": "Ca²⁺ into the nerve ending",
       "ru": {
        "key": "Выделение ацетилхолина запускает вход …",
        "text": "Ca²⁺ в нервное окончание"
       }
      },
      {
       "key": "The depolarisation of the end plate is the …",
       "text": "end-plate potential",
       "why": "Up to 60 mV; it sets off the muscle fibre's action potential.",
       "ru": {
        "key": "Деполяризация концевой пластинки — это …",
        "text": "потенциал концевой пластинки [[end-plate potential]]",
        "why": "До 60 мВ; он вызывает потенциал действия мышечного волокна."
       }
      },
      {
       "key": "Botulinum toxin blocks the junction by stopping …",
       "text": "the release of acetylcholine",
       "ru": {
        "key": "Ботулинический токсин блокирует синапс, прекращая …",
        "text": "выделение ацетилхолина [[acetylcholine release]]"
       }
      },
      {
       "key": "Curare blocks the junction by …",
       "text": "displacing acetylcholine from its receptors",
       "why": "A non-depolarising relaxant, competing with acetylcholine.",
       "ru": {
        "key": "Кураре блокирует синапс, …",
        "text": "вытесняя ацетилхолин из рецепторов [[displacing acetylcholine]]",
        "why": "Недеполяризующий миорелаксант, конкурирует с ацетилхолином."
       }
      },
      {
       "key": "Succinylcholine, a depolarising relaxant, blocks the junction by …",
       "text": "keeping the postsynaptic membrane depolarised and inactivated",
       "ru": {
        "key": "Сукцинилхолин, деполяризующий миорелаксант, блокирует синапс, …",
        "text": "удерживая постсинаптическую мембрану в деполяризации и инактивации [[persistent depolarisation]]"
       }
      },
      {
       "key": "Organophosphates block the junction by inhibiting …",
       "text": "cholinesterase",
       "why": "Acetylcholine stays, depolarises deeply and inactivates the receptors.",
       "ru": {
        "key": "Фосфорорганические соединения блокируют синапс, угнетая …",
        "text": "холинэстеразу [[cholinesterase]]",
        "why": "Ацетилхолин сохраняется, вызывает глубокую деполяризацию и инактивацию рецепторов."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-11",
     "track": "know",
     "name": "2.11 Skeletal muscle fibres",
     "about": "Fibre types and motor units",
     "ru": {
      "name": "2.11 Скелетные мышечные волокна",
      "about": "Типы волокон и двигательные единицы"
     },
     "items": [
      {
       "key": "Slow oxidative fibres, rich in myoglobin and used for posture, make … muscles",
       "text": "red",
       "why": "They tire very slowly.",
       "ru": {
        "key": "Медленные окислительные волокна, богатые миоглобином и поддерживающие позу, образуют … мышцы",
        "text": "красные [[red]]",
        "why": "Они утомляются очень медленно."
       }
      },
      {
       "key": "Fast glycolytic fibres, with no myoglobin, strong but quick to tire, make … muscles",
       "text": "white",
       "ru": {
        "key": "Быстрые гликолитические волокна без миоглобина, сильные, но быстро утомляющиеся, образуют … мышцы",
        "text": "белые [[white]]"
       }
      },
      {
       "key": "Fibres that make no action potentials and don't obey the all-or-none law are …",
       "text": "tonic fibres",
       "why": "In humans, in the outer muscles of the eye.",
       "ru": {
        "key": "Волокна, которые не генерируют потенциалов действия и не подчиняются закону «всё или ничего», — …",
        "text": "тонические волокна [[tonic fibres]]",
        "why": "У человека — в наружных мышцах глаза."
       }
      },
      {
       "key": "A motor neuron with all the muscle fibres its axon supplies is a …",
       "text": "motor unit",
       "why": "The functional unit of skeletal muscle, not the single fibre.",
       "ru": {
        "key": "Мотонейрон вместе со всеми мышечными волокнами, которые иннервирует его аксон, — …",
        "text": "двигательная единица [[motor unit]]",
        "why": "Функциональная единица скелетной мышцы, а не отдельное волокно."
       }
      },
      {
       "key": "Motor units in the eye muscles have …",
       "text": "fewer than 10 fibres",
       "why": "Fine, fast movements: few fibres. The soleus, a posture muscle: about 2000.",
       "ru": {
        "key": "Двигательные единицы мышц глаза содержат …",
        "text": "менее 10 волокон",
        "why": "Точные быстрые движения — мало волокон. Камбаловидная, позная мышца, — около 2000."
       }
      },
      {
       "key": "A skeletal muscle fibre's resting potential is about …",
       "text": "−90 mV",
       "why": "Its action potential is 120–130 mV and lasts 1–3 ms.",
       "ru": {
        "key": "Потенциал покоя скелетного мышечного волокна — около …",
        "text": "−90 мВ",
        "why": "Его потенциал действия 120–130 мВ, длительность 1–3 мс."
       }
      },
      {
       "key": "Stimulating a muscle through its nerve, which is more excitable, is …",
       "text": "indirect stimulation",
       "why": "Direct stimulation of the muscle needs a muscle relaxant to block the nerve.",
       "ru": {
        "key": "Раздражение мышцы через её нерв, у которого возбудимость выше, — …",
        "text": "непрямое раздражение [[indirect stimulation]]",
        "why": "Для прямого раздражения мышцы нерв блокируют миорелаксантом."
       }
      },
      {
       "key": "The four properties of skeletal muscle are …",
       "text": "excitability, conductivity, contractility, elasticity",
       "ru": {
        "key": "Четыре свойства скелетной мышцы — …",
        "text": "возбудимость, проводимость, сократимость, эластичность [[excitability, conductivity, contractility, elasticity]]"
       }
      }
     ]
    },
    {
     "id": "phy-02-know-12",
     "track": "know",
     "name": "2.12 How muscle contracts",
     "about": "Sarcomere, sliding filaments, calcium, ATP",
     "ru": {
      "name": "2.12 Механизм мышечного сокращения",
      "about": "Саркомер, скольжение нитей, кальций, АТФ"
     },
     "items": [
      {
       "key": "The functional unit of the contractile apparatus, between two Z discs, is the …",
       "text": "sarcomere",
       "why": "About 2.5 µm long at rest.",
       "ru": {
        "key": "Функциональная единица сократительного аппарата, между двумя Z-пластинками, — …",
        "text": "саркомер [[sarcomere]]",
        "why": "Его длина в покое около 2,5 мкм."
       }
      },
      {
       "key": "The dark band of the sarcomere, which keeps its length in contraction, is the …",
       "text": "A band",
       "why": "It's the length of the myosin filaments.",
       "ru": {
        "key": "Тёмный диск саркомера, длина которого при сокращении не меняется, — …",
        "text": "анизотропный диск, A-диск [[A band]]",
        "why": "Его длина равна длине миозиновых нитей."
       }
      },
      {
       "key": "In contraction the bands that get shorter are …",
       "text": "the I band and the H zone",
       "ru": {
        "key": "При сокращении укорачиваются …",
        "text": "I-диски и H-зона [[I band and H zone]]"
       }
      },
      {
       "key": "The sarcomere shortens because the thin actin filaments slide along the thick myosin ones: the …",
       "text": "sliding filament theory",
       "why": "Put forward independently by H. Huxley and A. Huxley; the filaments themselves keep their length.",
       "ru": {
        "key": "Саркомер укорачивается за счёт скольжения тонких нитей актина вдоль толстых нитей миозина: …",
        "text": "теория скольжения нитей [[sliding filament theory]]",
        "why": "Её независимо предложили Х. Хаксли и А. Хаксли; длина самих нитей не меняется."
       }
      },
      {
       "key": "Each myosin filament is surrounded by …",
       "text": "six actin filaments",
       "ru": {
        "key": "Каждая нить миозина окружена …",
        "text": "шестью нитями актина"
       }
      },
      {
       "key": "The myosin projections, with a head and an elastic neck, are the …",
       "text": "cross-bridges",
       "ru": {
        "key": "Выступы миозиновой нити с головкой и эластичной шейкой — …",
        "text": "поперечные мостики [[cross-bridges]]"
       }
      },
      {
       "key": "The action potential reaches deep into the fibre along the …",
       "text": "T tubules",
       "why": "They touch the terminal cisterns of the sarcoplasmic reticulum.",
       "ru": {
        "key": "Потенциал действия проходит вглубь волокна по …",
        "text": "Т-системе, поперечным трубочкам [[T tubules]]",
        "why": "Они контактируют с терминальными цистернами саркоплазматической сети."
       }
      },
      {
       "key": "In skeletal muscle, Ca²⁺ starts contraction by binding to …",
       "text": "troponin",
       "why": "Tropomyosin then moves and uncovers actin's binding sites.",
       "ru": {
        "key": "В скелетной мышце Ca²⁺ запускает сокращение, связываясь с …",
        "text": "тропонином [[troponin]]",
        "why": "Затем тропомиозин смещается и открывает активные центры актина."
       }
      },
      {
       "key": "Each cross-bridge cycle uses …",
       "text": "one molecule of ATP",
       "why": "ATP also lets the head come off actin.",
       "ru": {
        "key": "Каждый цикл поперечного мостика расходует …",
        "text": "одну молекулу АТФ",
        "why": "АТФ нужна и для отсоединения головки от актина."
       }
      },
      {
       "key": "Relaxation needs the Ca²⁺ pumped back into the sarcoplasmic reticulum by …",
       "text": "the calcium pump",
       "why": "Driven by ATP.",
       "ru": {
        "key": "Для расслабления Ca²⁺ возвращается в саркоплазматическую сеть …",
        "text": "кальциевым насосом [[calcium pump]]",
        "why": "За счёт энергии АТФ."
       }
      },
      {
       "key": "After death, when ATP runs out and the heads can't come off actin, the muscles go into …",
       "text": "rigor mortis",
       "ru": {
        "key": "После смерти, когда АТФ иссякает и головки не могут отделиться от актина, наступает …",
        "text": "трупное окоченение [[rigor mortis]]"
       }
      }
     ]
    },
    {
     "id": "phy-02-know-13",
     "track": "know",
     "name": "2.13 Contraction, work and heat",
     "about": "Twitch, tetanus, modes, fatigue, Hill",
     "ru": {
      "name": "2.13 Сокращение, работа, теплообразование",
      "about": "Одиночное сокращение, тетанус, режимы, утомление, Хилл"
     },
     "items": [
      {
       "key": "A muscle's response to one threshold stimulus is a …",
       "text": "single twitch",
       "why": "Latent period, shortening, relaxation.",
       "ru": {
        "key": "Ответ мышцы на одиночный пороговый стимул — …",
        "text": "одиночное сокращение [[single twitch]]",
        "why": "Латентный период, укорочение, расслабление."
       }
      },
      {
       "key": "Stimuli falling in the shortening phase fuse into a …",
       "text": "smooth (complete) tetanus",
       "ru": {
        "key": "Стимулы, попадающие в фазу укорочения, сливаются в …",
        "text": "гладкий тетанус [[complete tetanus]]"
       }
      },
      {
       "key": "Stimuli falling in the relaxation phase give a …",
       "text": "serrated (incomplete) tetanus",
       "ru": {
        "key": "Стимулы, попадающие в фазу расслабления, дают …",
        "text": "зубчатый тетанус [[incomplete tetanus]]"
       }
      },
      {
       "key": "Contraction where length changes and tension stays the same is …",
       "text": "isotonic",
       "ru": {
        "key": "Сокращение, при котором меняется длина, а напряжение остаётся прежним, — …",
        "text": "изотоническое [[isotonic]]"
       }
      },
      {
       "key": "Contraction where the fibre's length stays the same and tension rises is …",
       "text": "isometric",
       "why": "The sarcomeres still shorten, stretching the elastic parts.",
       "ru": {
        "key": "Сокращение, при котором длина волокна не меняется, а напряжение растёт, — …",
        "text": "изометрическое [[isometric]]",
        "why": "Саркомеры всё же укорачиваются, растягивая эластические элементы."
       }
      },
      {
       "key": "In the body, contraction with both shortening and rising tension is …",
       "text": "auxotonic",
       "ru": {
        "key": "В организме сокращение, при котором есть и укорочение, и рост напряжения, — …",
        "text": "ауксотоническое [[auxotonic]]"
       }
      },
      {
       "key": "A sarcomere develops the most force at a length of …",
       "text": "2–2.2 µm",
       "why": "At 2.9 µm the filaments overlap less, and force falls to half.",
       "ru": {
        "key": "Наибольшую силу саркомер развивает при длине …",
        "text": "2–2,2 мкм",
        "why": "При 2,9 мкм перекрытие нитей меньше, и сила падает вдвое."
       }
      },
      {
       "key": "A muscle does the most work with loads of middle size: the law of …",
       "text": "average loads",
       "why": "With no load, or one too heavy to lift, the work is zero.",
       "ru": {
        "key": "Наибольшую работу мышца совершает при нагрузках средней величины: закон …",
        "text": "средних нагрузок [[average loads]]",
        "why": "Без нагрузки или с неподъёмной нагрузкой работа равна нулю."
       }
      },
      {
       "key": "Sechenov found that working the other hand speeds a tired hand's recovery: …",
       "text": "active rest",
       "ru": {
        "key": "Сеченов обнаружил, что работа другой рукой ускоряет восстановление утомлённой руки: …",
        "text": "активный отдых [[active rest]]"
       }
      },
      {
       "key": "By Hill's law, a muscle shortening slowly against a large load gives off …",
       "text": "more heat",
       "why": "Shortening heat grows with the load.",
       "ru": {
        "key": "По закону Хилла мышца, медленно укорачивающаяся при большой нагрузке, выделяет …",
        "text": "больше тепла [[more heat]]",
        "why": "Теплота укорочения растёт с нагрузкой."
       }
      },
      {
       "key": "A muscle's maximal force per cm² of physiological cross-section is its …",
       "text": "absolute force",
       "why": "Pennate muscles have a larger physiological section, so more force.",
       "ru": {
        "key": "Максимальное усилие мышцы на 1 см² физиологического поперечного сечения — её …",
        "text": "абсолютная сила [[absolute force]]",
        "why": "У перистых мышц физиологическое сечение больше, поэтому и сила больше."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-14",
     "track": "know",
     "name": "2.14 Smooth muscle",
     "about": "Kinds, properties, calmodulin",
     "ru": {
      "name": "2.14 Гладкие мышцы",
      "about": "Виды, свойства, кальмодулин"
     },
     "items": [
      {
       "key": "Smooth muscle of the internal organs, vessels and skin, whose cells work together, is …",
       "text": "visceral (unitary)",
       "ru": {
        "key": "Гладкая мышца внутренних органов, сосудов и кожи, клетки которой работают вместе, — …",
        "text": "висцеральная, унитарная [[unitary]]"
       }
      },
      {
       "key": "The ciliary muscle and the muscles of the iris are … smooth muscle",
       "text": "multi-unit",
       "ru": {
        "key": "Ресничная мышца и мышцы радужки — это … гладкие мышцы",
        "text": "мультиунитарные [[multi-unit]]"
       }
      },
      {
       "key": "Smooth muscle cells pass excitation to one another through …",
       "text": "nexuses (gap junctions)",
       "ru": {
        "key": "Клетки гладкой мышцы передают возбуждение друг другу через …",
        "text": "нексусы [[gap junctions]]"
       }
      },
      {
       "key": "Instead of end plates, autonomic nerve fibres to smooth muscle have swellings full of transmitter: …",
       "text": "varicosities",
       "ru": {
        "key": "Вместо концевых пластинок вегетативные волокна к гладкой мышце имеют утолщения с медиатором: …",
        "text": "варикозы [[varicosities]]"
       }
      },
      {
       "key": "The main ion of the smooth muscle action potential is …",
       "text": "Ca²⁺",
       "why": "Ca²⁺ channel blockers are used for gut motility and in hypertension.",
       "ru": {
        "key": "Главный ион потенциала действия гладкой мышцы — …",
        "text": "Ca²⁺",
        "why": "Блокаторы кальциевых каналов применяют при нарушениях моторики ЖКТ и при гипертонической болезни."
       }
      },
      {
       "key": "The ability to contract spontaneously, from pacemaker potentials, is …",
       "text": "automaticity",
       "ru": {
        "key": "Способность к спонтанной деятельности за счёт пейсмекерных потенциалов — …",
        "text": "автоматия [[automaticity]]"
       }
      },
      {
       "key": "Visceral smooth muscle answers stretch by …",
       "text": "contracting",
       "why": "The basis of the vessels' myogenic self-regulation.",
       "ru": {
        "key": "На растяжение висцеральная гладкая мышца отвечает …",
        "text": "сокращением [[contraction]]",
        "why": "Основа миогенной саморегуляции тонуса сосудов."
       }
      },
      {
       "key": "Held stretched, smooth muscle's tension slowly falls back to where it was: …",
       "text": "plasticity",
       "ru": {
        "key": "Если удерживать гладкую мышцу растянутой, её напряжение постепенно возвращается к исходному: …",
        "text": "пластичность [[plasticity]]"
       }
      },
      {
       "key": "In smooth muscle, Ca²⁺ starts contraction by binding to …",
       "text": "calmodulin",
       "why": "This activates myosin light-chain kinase, which phosphorylates myosin.",
       "ru": {
        "key": "В гладкой мышце Ca²⁺ запускает сокращение, связываясь с …",
        "text": "кальмодулином [[calmodulin]]",
        "why": "Это активирует киназу лёгких цепей миозина, которая фосфорилирует миозин."
       }
      }
     ]
    },
    {
     "id": "phy-02-know-15",
     "track": "know",
     "name": "2.15 Glandular tissue",
     "about": "Secretion and its cycle",
     "ru": {
      "name": "2.15 Железистая ткань",
      "about": "Секреция и секреторный цикл"
     },
     "items": [
      {
       "key": "The secretory cells of glands are …",
       "text": "glandulocytes",
       "ru": {
        "key": "Секреторные клетки желёз — …",
        "text": "гландулоциты [[glandulocytes]]"
       }
      },
      {
       "key": "A product made by the cell from what it takes in, and released for a purpose, is a …",
       "text": "secretion",
       "ru": {
        "key": "Продукт, который клетка образует из поступивших веществ и выделяет с определённым назначением, — …",
        "text": "секрет [[secretion]]"
       }
      },
      {
       "key": "A product of the cell's breakdown processes that it releases is an …",
       "text": "excretion",
       "ru": {
        "key": "Выделяемый клеткой продукт её катаболизма — …",
        "text": "экскрет [[excretion]]"
       }
      },
      {
       "key": "A substance taken from the blood and released unchanged is a …",
       "text": "recretion",
       "ru": {
        "key": "Вещество, поглощённое из крови и выделенное в неизменном виде, — …",
        "text": "рекрет [[recretion]]"
       }
      },
      {
       "key": "Secretion through the basolateral membrane into the blood and lymph is …",
       "text": "internal secretion (incretion)",
       "why": "External secretion goes through the apical membrane into ducts and cavities.",
       "ru": {
        "key": "Секреция через базолатеральную мембрану в кровь и лимфу — …",
        "text": "внутренняя секреция, инкреция [[incretion]]",
        "why": "Внешняя секреция идёт через апикальную мембрану в протоки и полости."
       }
      },
      {
       "key": "By the theory of Ugolev, secretion arose from the cells' general function of …",
       "text": "excreting metabolic products",
       "why": "The excretory theory of secretion.",
       "ru": {
        "key": "По теории Уголева, секреция произошла от общей функции клеток — …",
        "text": "выделения продуктов обмена [[excretion of metabolites]]",
        "why": "Экскреторная теория происхождения секреции."
       }
      },
      {
       "key": "The three types of secretion by how the product leaves the cell are …",
       "text": "merocrine, apocrine and holocrine",
       "ru": {
        "key": "Три типа секреции по способу выделения продукта — …",
        "text": "мерокриновая, апокриновая и голокриновая [[merocrine, apocrine, holocrine]]"
       }
      },
      {
       "key": "The change in a glandulocyte's membrane polarisation when secretion is stimulated is the …",
       "text": "secretory potential",
       "why": "Glandulocytes rest at −30 to −75 mV; the change is brought about by a rise in cell Ca²⁺.",
       "ru": {
        "key": "Изменение поляризации мембраны гландулоцита при стимуляции секреции — …",
        "text": "секреторный потенциал [[secretory potential]]",
        "why": "Мембранный потенциал гландулоцитов в покое от −30 до −75 мВ; изменение опосредовано ростом Ca²⁺ в клетке."
       }
      }
     ]
    },
    {
     "id": "phy-02-structure-16",
     "track": "structure",
     "name": "2.S1 Nerve: in order",
     "about": "Put the steps in order",
     "ru": {
      "name": "2.S1 Нерв: по порядку",
      "about": "Расставьте по порядку"
     },
     "items": [
      {
       "t": "order",
       "q": "The phases of the action potential",
       "steps": [
        "Local response",
        "Fast depolarisation",
        "Overshoot (reversal)",
        "Repolarisation",
        "Positive after-potential"
       ],
       "ru": {
        "q": "Фазы потенциала действия",
        "steps": [
         "Локальный ответ",
         "Быстрая деполяризация",
         "Реверсия (овершут)",
         "Реполяризация",
         "Положительный следовой потенциал"
        ]
       }
      },
      {
       "t": "order",
       "q": "How the action potential arises",
       "steps": [
        "Na⁺ channels open and Na⁺ enters",
        "The local response grows",
        "The critical level is reached",
        "Na⁺ inflow becomes self-reinforcing",
        "Na⁺ channels inactivate and K⁺ channels open",
        "K⁺ leaves and the membrane repolarises"
       ],
       "ru": {
        "q": "Как возникает потенциал действия",
        "steps": [
         "Открываются натриевые каналы, Na⁺ входит в клетку",
         "Нарастает локальный ответ",
         "Достигается критический уровень",
         "Вход Na⁺ становится самоусиливающимся",
         "Натриевые каналы инактивируются, открываются калиевые",
         "K⁺ выходит, мембрана реполяризуется"
        ]
       }
      },
      {
       "t": "order",
       "q": "From stimulus to impulse in a receptor neuron",
       "steps": [
        "The stimulus is transformed",
        "A receptor potential arises",
        "It spreads along the neuron",
        "A generator potential arises at the axon hillock",
        "A nerve impulse is fired"
       ],
       "ru": {
        "q": "От раздражения к импульсу в рецепторном нейроне",
        "steps": [
         "Преобразование раздражения",
         "Возникает рецепторный потенциал",
         "Он распространяется по нейрону",
         "В аксонном холмике возникает генераторный потенциал",
         "Генерируется нервный импульс"
        ]
       }
      },
      {
       "t": "order",
       "q": "Transmission at the neuromuscular junction",
       "steps": [
        "An action potential reaches the nerve ending",
        "Ca²⁺ channels open and Ca²⁺ enters",
        "Acetylcholine is released",
        "Acetylcholine binds its receptors and Na⁺ enters",
        "An end-plate potential arises",
        "The muscle fibre fires an action potential"
       ],
       "ru": {
        "q": "Передача в нервно-мышечном синапсе",
        "steps": [
         "Потенциал действия приходит в нервное окончание",
         "Открываются кальциевые каналы, Ca²⁺ входит",
         "Выделяется ацетилхолин",
         "Ацетилхолин связывается с рецепторами, Na⁺ входит",
         "Возникает потенциал концевой пластинки",
         "В мышечном волокне возникает потенциал действия"
        ]
       }
      }
     ]
    },
    {
     "id": "phy-02-structure-17",
     "track": "structure",
     "name": "2.S2 Muscle and gland: in order",
     "about": "Put the steps in order",
     "ru": {
      "name": "2.S2 Мышца и железа: по порядку",
      "about": "Расставьте по порядку"
     },
     "items": [
      {
       "t": "order",
       "q": "From the action potential to contraction",
       "steps": [
        "An action potential on the fibre's membrane",
        "It spreads along the T tubules",
        "Ca²⁺ leaves the sarcoplasmic reticulum",
        "Ca²⁺ binds troponin and tropomyosin moves",
        "Myosin heads bind actin and turn",
        "The filaments slide and the sarcomere shortens"
       ],
       "ru": {
        "q": "От потенциала действия к сокращению",
        "steps": [
         "Потенциал действия на мембране волокна",
         "Он распространяется по Т-системе",
         "Ca²⁺ выходит из саркоплазматической сети",
         "Ca²⁺ связывается с тропонином, тропомиозин смещается",
         "Головки миозина присоединяются к актину и поворачиваются",
         "Нити скользят, саркомер укорачивается"
        ]
       }
      },
      {
       "t": "order",
       "q": "The periods of a single twitch",
       "steps": [
        "Latent period",
        "Shortening (rising tension)",
        "Relaxation"
       ],
       "ru": {
        "q": "Периоды одиночного сокращения",
        "steps": [
         "Латентный период",
         "Укорочение (развитие напряжения)",
         "Расслабление"
        ]
       }
      },
      {
       "t": "order",
       "q": "Smooth muscle: from calcium to contraction",
       "steps": [
        "Ca²⁺ rises in the cell",
        "Ca²⁺ binds calmodulin",
        "Myosin light-chain kinase is activated",
        "Myosin is phosphorylated",
        "Actin slides along myosin"
       ],
       "ru": {
        "q": "Гладкая мышца: от кальция к сокращению",
        "steps": [
         "Ca²⁺ в клетке повышается",
         "Ca²⁺ связывается с кальмодулином",
         "Активируется киназа лёгких цепей миозина",
         "Миозин фосфорилируется",
         "Актин скользит вдоль миозина"
        ]
       }
      },
      {
       "t": "order",
       "q": "The secretory cycle",
       "steps": [
        "Raw materials enter the cell",
        "The product is made and carried on",
        "Secretory granules form",
        "The secretion is released by exocytosis"
       ],
       "ru": {
        "q": "Секреторный цикл",
        "steps": [
         "Поступление исходных веществ в клетку",
         "Синтез и транспорт продукта",
         "Формирование секреторных гранул",
         "Выделение секрета экзоцитозом"
        ]
       }
      }
     ]
    },
    {
     "id": "phy-02-watch-18",
     "track": "watch",
     "name": "2.W1 Traps: nerve",
     "about": "True or false, and why",
     "ru": {
      "name": "2.W1 Ловушки: нерв",
      "about": "Верно или неверно, и почему"
     },
     "items": [
      {
       "t": "tf",
       "q": "In absolute refractoriness a very strong stimulus can still fire a spike",
       "a": false,
       "why": "No stimulus can: the sodium channels are inactivated.",
       "ru": {
        "q": "В период абсолютной рефрактерности очень сильный стимул всё же вызывает спайк",
        "why": "Никакой стимул не вызовет: натриевые каналы инактивированы."
       }
      },
      {
       "t": "tf",
       "q": "In relative refractoriness a stronger than threshold stimulus can fire a spike",
       "a": true,
       "why": "That's what makes it relative.",
       "ru": {
        "q": "В период относительной рефрактерности сверхпороговый стимул может вызвать спайк",
        "why": "Именно поэтому она относительная."
       }
      },
      {
       "t": "tf",
       "q": "Chronaxie is the time a current of rheobase strength needs to excite",
       "a": false,
       "why": "That's the useful time; chronaxie is for twice the rheobase.",
       "ru": {
        "q": "Хронаксия — время, которое нужно току силой в одну реобазу, чтобы вызвать возбуждение",
        "why": "Это полезное время; хронаксия — для удвоенной реобазы."
       }
      },
      {
       "t": "tf",
       "q": "The potassium equilibrium potential is larger than the real resting potential",
       "a": true,
       "why": "Because a little Na⁺ leaks in.",
       "ru": {
        "q": "Калиевый равновесный потенциал по модулю больше реального потенциала покоя",
        "why": "Потому что немного Na⁺ входит в клетку."
       }
      },
      {
       "t": "tf",
       "q": "When the current is switched on, excitation arises under the anode",
       "a": false,
       "why": "Under the cathode when switched on; under the anode when switched off.",
       "ru": {
        "q": "При замыкании тока возбуждение возникает под анодом",
        "why": "При замыкании — под катодом; под анодом — при размыкании."
       }
      },
      {
       "t": "tf",
       "q": "Raising Ca²⁺ outside the cell lowers its excitability",
       "a": true,
       "why": "The threshold moves away from the resting potential.",
       "ru": {
        "q": "Повышение Ca²⁺ вне клетки снижает её возбудимость",
        "why": "Порог отодвигается от потенциала покоя."
       }
      },
      {
       "t": "tf",
       "q": "A stronger suprathreshold stimulus gives a bigger action potential",
       "a": false,
       "why": "The all-or-none law: its size hardly changes.",
       "ru": {
        "q": "Более сильный надпороговый стимул вызывает больший потенциал действия",
        "why": "Закон «всё или ничего»: амплитуда почти не меняется."
       }
      },
      {
       "t": "tf",
       "q": "The neurons of the spinal ganglia are pseudounipolar",
       "a": true,
       "why": "True unipolar neurons are only in the trigeminal's mesencephalic nucleus.",
       "ru": {
        "q": "Нейроны спинальных ганглиев псевдоуниполярные",
        "why": "Истинно униполярные есть только в мезэнцефалическом ядре тройничного нерва."
       }
      },
      {
       "t": "tf",
       "q": "Potassium channels inactivate just as sodium channels do",
       "a": false,
       "why": "They have no such inactivation.",
       "ru": {
        "q": "Калиевые каналы инактивируются так же, как натриевые",
        "why": "Такой инактивации у них нет."
       }
      },
      {
       "t": "tf",
       "q": "Glycine and GABA are inhibitory transmitters",
       "a": true,
       "why": "They hyperpolarise the postsynaptic membrane.",
       "ru": {
        "q": "Глицин и ГАМК — тормозные медиаторы",
        "why": "Они гиперполяризуют постсинаптическую мембрану."
       }
      },
      {
       "t": "tf",
       "q": "The generator potential arises in the receptive part of the membrane",
       "a": false,
       "why": "That's the receptor potential; the generator potential is at the axon hillock.",
       "ru": {
        "q": "Генераторный потенциал возникает в рецептивном участке мембраны",
        "why": "Там возникает рецепторный; генераторный — в аксонном холмике."
       }
      },
      {
       "t": "tf",
       "q": "Fibres of the auditory nerve are among the most labile, up to 1000 Hz",
       "a": true,
       "why": "Lability is set mainly by how short the refractory period is.",
       "ru": {
        "q": "Волокна слухового нерва — одни из самых лабильных, до 1000 Гц",
        "why": "Лабильность определяется прежде всего краткостью рефрактерности."
       }
      },
      {
       "t": "tf",
       "q": "In the brain and spinal cord, myelin is made by Schwann cells",
       "a": false,
       "why": "By oligodendrocytes; Schwann cells make it in peripheral nerves.",
       "ru": {
        "q": "В головном и спинном мозге миелин образуют шванновские клетки",
        "why": "Его образуют олигодендроциты; шванновские клетки — в периферических нервах."
       }
      }
     ]
    },
    {
     "id": "phy-02-watch-19",
     "track": "watch",
     "name": "2.W2 Traps: muscle and gland",
     "about": "True or false, and why",
     "ru": {
      "name": "2.W2 Ловушки: мышца и железа",
      "about": "Верно или неверно, и почему"
     },
     "items": [
      {
       "t": "tf",
       "q": "In contraction the actin and myosin filaments get shorter",
       "a": false,
       "why": "They keep their length and slide; only their overlap changes.",
       "ru": {
        "q": "При сокращении нити актина и миозина укорачиваются",
        "why": "Их длина не меняется, они скользят; меняется только перекрытие."
       }
      },
      {
       "t": "tf",
       "q": "In a tetanus the contractions add up but the action potentials do not",
       "a": true,
       "why": "Each spike stays separate; the Ca²⁺ stays high.",
       "ru": {
        "q": "При тетанусе суммируются сокращения, а потенциалы действия — нет",
        "why": "Каждый спайк отдельный; Ca²⁺ остаётся высоким."
       }
      },
      {
       "t": "tf",
       "q": "Stimuli in the relaxation phase give a smooth tetanus",
       "a": false,
       "why": "They give a serrated tetanus; a smooth one needs the shortening phase.",
       "ru": {
        "q": "Стимулы в фазу расслабления дают гладкий тетанус",
        "why": "Они дают зубчатый тетанус; гладкий — при стимулах в фазу укорочения."
       }
      },
      {
       "t": "tf",
       "q": "In an isometric contraction the sarcomeres still shorten",
       "a": true,
       "why": "They stretch the elastic parts, so the fibre's length stays the same.",
       "ru": {
        "q": "При изометрическом сокращении саркомеры всё же укорачиваются",
        "why": "Они растягивают эластические элементы, и длина волокна не меняется."
       }
      },
      {
       "t": "tf",
       "q": "A muscle does the most work with the heaviest load",
       "a": false,
       "why": "The law of average loads: the most work is with middle loads.",
       "ru": {
        "q": "Наибольшую работу мышца совершает при максимальной нагрузке",
        "why": "Закон средних нагрузок: больше всего — при средних."
       }
      },
      {
       "t": "tf",
       "q": "Static work is more tiring than dynamic work",
       "a": true,
       "why": "Held contraction squeezes the blood flow.",
       "ru": {
        "q": "Статическая работа утомительнее динамической",
        "why": "Удерживаемое сокращение сдавливает кровоток."
       }
      },
      {
       "t": "tf",
       "q": "The single muscle fibre is the functional unit of skeletal muscle",
       "a": false,
       "why": "The motor unit is.",
       "ru": {
        "q": "Функциональная единица скелетной мышцы — отдельное мышечное волокно",
        "why": "Функциональная единица — двигательная единица."
       }
      },
      {
       "t": "tf",
       "q": "Stretched visceral smooth muscle contracts",
       "a": true,
       "why": "Its reaction to stretch: the potential falls and spikes come faster.",
       "ru": {
        "q": "Растянутая висцеральная гладкая мышца сокращается",
        "why": "Реакция на растяжение: потенциал снижается, спайки учащаются."
       }
      },
      {
       "t": "tf",
       "q": "Ca²⁺ starts smooth muscle contraction by binding to troponin",
       "a": false,
       "why": "To calmodulin; troponin is in skeletal and heart muscle.",
       "ru": {
        "q": "Ca²⁺ запускает сокращение гладкой мышцы, связываясь с тропонином",
        "why": "С кальмодулином; тропонин — в скелетной и сердечной мышце."
       }
      },
      {
       "t": "tf",
       "q": "A substance taken from the blood and secreted unchanged is a recretion",
       "a": true,
       "why": "An excretion is a product of the cell's own breakdown.",
       "ru": {
        "q": "Вещество, поглощённое из крови и выделенное в неизменном виде, — рекрет",
        "why": "Экскрет — продукт катаболизма самой клетки."
       }
      },
      {
       "t": "tf",
       "q": "Curare is a non-depolarising muscle relaxant",
       "a": true,
       "why": "It competes with acetylcholine for its receptors. Succinylcholine is the depolarising one.",
       "ru": {
        "q": "Кураре — недеполяризующий миорелаксант",
        "why": "Он конкурирует с ацетилхолином за рецепторы. Деполяризующий — сукцинилхолин."
       }
      },
      {
       "t": "tf",
       "q": "The ciliary muscle of the eye is visceral smooth muscle",
       "a": false,
       "why": "It's multi-unit, like the muscles of the iris.",
       "ru": {
        "q": "Ресничная мышца глаза — висцеральная гладкая мышца",
        "why": "Она мультиунитарная, как и мышцы радужки."
       }
      }
     ]
    },
    {
     "id": "phy-02-apply-20",
     "track": "apply",
     "name": "2.A1 Problems: nerve",
     "about": "Which answer is right?",
     "ru": {
      "name": "2.A1 Задачи: нерв",
      "about": "Какой ответ верный?"
     },
     "items": [
      {
       "t": "case",
       "q": "A cell's absolute refractory period lasts 2 ms. The highest rate it can fire at is …",
       "ask": "Which answer is right?",
       "opts": [
        "500 Hz",
        "200 Hz",
        "1000 Hz"
       ],
       "a": 0,
       "why": "1 s ÷ 2 ms = 500 spikes a second.",
       "ru": {
        "q": "Абсолютная рефрактерность клетки длится 2 мс. Максимальная частота её импульсов — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "500 Гц",
         "200 Гц",
         "1000 Гц"
        ],
        "why": "1 с ÷ 2 мс = 500 импульсов в секунду."
       }
      },
      {
       "t": "case",
       "q": "A nerve is bathed in tetrodotoxin and stimulated. What happens?",
       "ask": "Which answer is right?",
       "opts": [
        "No action potential: Na⁺ channels are blocked",
        "Spikes last longer: repolarisation is slowed",
        "Resting potential falls to zero at once"
       ],
       "a": 0,
       "why": "Tetrodotoxin blocks the fast Na⁺ channels; slowing repolarisation is what TEA does.",
       "ru": {
        "q": "Нерв поместили в раствор тетродотоксина и раздражают. Что произойдёт?",
        "ask": "Какой ответ верный?",
        "opts": [
         "Потенциал действия не возникнет: Na⁺-каналы заблокированы",
         "Спайки удлинятся: реполяризация замедлится",
         "Потенциал покоя сразу упадёт до нуля"
        ],
        "why": "Тетродотоксин блокирует быстрые натриевые каналы; замедляет реполяризацию тетраэтиламмоний."
       }
      },
      {
       "t": "case",
       "q": "After a nerve injury, the chronaxie of the muscle it supplies goes from 0.3 ms to 3 ms. This means …",
       "ask": "Which answer is right?",
       "opts": [
        "Excitability has fallen",
        "Excitability has risen",
        "The rheobase has fallen to zero"
       ],
       "a": 0,
       "why": "A longer chronaxie means the tissue needs longer to excite: it is less excitable.",
       "ru": {
        "q": "После повреждения нерва хронаксия иннервируемой им мышцы выросла с 0,3 до 3 мс. Это значит, что …",
        "ask": "Какой ответ верный?",
        "opts": [
         "возбудимость снизилась",
         "возбудимость повысилась",
         "реобаза упала до нуля"
        ],
        "why": "Чем больше хронаксия, тем дольше ткани нужно для возбуждения: возбудимость ниже."
       }
      },
      {
       "t": "case",
       "q": "The current to a nerve is raised very slowly, and even a strong one fails to excite. The reason is …",
       "ask": "Which answer is right?",
       "opts": [
        "Accommodation",
        "Absolute refractoriness",
        "Supernormal excitability"
       ],
       "a": 0,
       "why": "A slowly rising stimulus inactivates the Na⁺ channels and the critical level moves up.",
       "ru": {
        "q": "Ток, подаваемый на нерв, нарастает очень медленно, и даже сильный ток не вызывает возбуждения. Причина — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "аккомодация",
         "абсолютная рефрактерность",
         "супернормальная возбудимость"
        ],
        "why": "Медленно нарастающий стимул инактивирует натриевые каналы, и критический уровень смещается вверх."
       }
      },
      {
       "t": "case",
       "q": "The Na⁺/K⁺ pump is blocked with ouabain for a long time. What happens to the resting potential?",
       "ask": "Which answer is right?",
       "opts": [
        "It falls slowly towards zero",
        "It doubles",
        "It turns positive at once"
       ],
       "a": 0,
       "why": "The pump keeps the ion gradients; without it they run down over time.",
       "ru": {
        "q": "Na⁺/K⁺-насос надолго заблокировали оуабаином. Что будет с потенциалом покоя?",
        "ask": "Какой ответ верный?",
        "opts": [
         "Он медленно падает к нулю",
         "Он увеличивается вдвое",
         "Он сразу становится положительным"
        ],
        "why": "Насос поддерживает ионные градиенты; без него они постепенно выравниваются."
       }
      },
      {
       "t": "case",
       "q": "A person touches a 50 Hz mains wire. The greatest danger is …",
       "ask": "Which answer is right?",
       "opts": [
        "Ventricular fibrillation",
        "Burns from heating only",
        "Nothing, the current is too slow"
       ],
       "a": 0,
       "why": "Mains frequency can catch the heart's vulnerable phase.",
       "ru": {
        "q": "Человек коснулся провода сети 50 Гц. Главная опасность — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "фибрилляция желудочков",
         "только ожоги от нагрева",
         "никакой, ток слишком медленный"
        ],
        "why": "Сетевая частота может попасть в фазу уязвимости сердца."
       }
      }
     ]
    },
    {
     "id": "phy-02-apply-21",
     "track": "apply",
     "name": "2.A2 Problems: synapse and muscle",
     "about": "Which answer is right?",
     "ru": {
      "name": "2.A2 Задачи: синапс и мышца",
      "about": "Какой ответ верный?"
     },
     "items": [
      {
       "t": "case",
       "q": "A farm worker poisoned by an organophosphate has muscle weakness. The cause is …",
       "ask": "Which answer is right?",
       "opts": [
        "Acetylcholine isn't broken down",
        "Acetylcholine isn't released",
        "Ca²⁺ can't enter the nerve ending"
       ],
       "a": 0,
       "why": "Cholinesterase is blocked, so acetylcholine stays and the end plate is inactivated.",
       "ru": {
        "q": "У работника фермы, отравленного фосфорорганическим соединением, слабость мышц. Причина — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "ацетилхолин не разрушается",
         "ацетилхолин не выделяется",
         "Ca²⁺ не входит в нервное окончание"
        ],
        "why": "Холинэстераза заблокирована, ацетилхолин сохраняется, концевая пластинка инактивируется."
       }
      },
      {
       "t": "case",
       "q": "A patient with botulism has paralysed muscles. The toxin blocks …",
       "ask": "Which answer is right?",
       "opts": [
        "The release of acetylcholine",
        "The breakdown of acetylcholine",
        "The muscle's Na⁺ channels"
       ],
       "a": 0,
       "why": "Without release, the end plate gets no signal.",
       "ru": {
        "q": "У больного ботулизмом мышцы парализованы. Токсин блокирует …",
        "ask": "Какой ответ верный?",
        "opts": [
         "выделение ацетилхолина",
         "разрушение ацетилхолина",
         "натриевые каналы мышцы"
        ],
        "why": "Без выделения медиатора концевая пластинка не получает сигнала."
       }
      },
      {
       "t": "case",
       "q": "Stimuli reach a muscle so often that each comes while it is still shortening. The result is …",
       "ask": "Which answer is right?",
       "opts": [
        "A smooth tetanus",
        "A serrated tetanus",
        "Separate single twitches"
       ],
       "a": 0,
       "why": "Each new contraction starts before the last one relaxes at all.",
       "ru": {
        "q": "Стимулы приходят к мышце так часто, что каждый попадает в фазу укорочения. Результат — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "гладкий тетанус",
         "зубчатый тетанус",
         "отдельные одиночные сокращения"
        ],
        "why": "Каждое новое сокращение начинается раньше, чем предыдущее начнёт расслабляться."
       }
      },
      {
       "t": "case",
       "q": "A weightlifter lifts a record weight. The lift is …",
       "ask": "Which answer is right?",
       "opts": [
        "Slow, because force is greatest at low speeds",
        "Fast, because force grows with speed",
        "Just as quick as with a light weight"
       ],
       "a": 0,
       "why": "The force–velocity curve is a hyperbola: the most force only at very low speeds.",
       "ru": {
        "q": "Штангист поднимает рекордный вес. Подъём …",
        "ask": "Какой ответ верный?",
        "opts": [
         "медленный: наибольшая сила — при малой скорости",
         "быстрый: сила растёт со скоростью",
         "такой же быстрый, как с лёгким весом"
        ],
        "why": "Кривая «сила — скорость» — гипербола: максимальная сила только при очень малой скорости."
       }
      },
      {
       "t": "case",
       "q": "A sprinter runs flat out for about 30 seconds and then must slow down. The main reason is …",
       "ask": "Which answer is right?",
       "opts": [
        "Lactic acid from anaerobic glycolysis",
        "Running out of oxygen in the blood",
        "The motor neurons stop firing completely"
       ],
       "a": 0,
       "why": "At maximal load anaerobic glycolysis adds ATP fast, but only for about 30 s before acidosis and fatigue.",
       "ru": {
        "q": "Спринтер бежит в полную силу около 30 секунд, потом вынужден замедлиться. Главная причина — …",
        "ask": "Какой ответ верный?",
        "opts": [
         "молочная кислота от анаэробного гликолиза",
         "в крови кончился кислород",
         "мотонейроны полностью перестали работать"
        ],
        "why": "При максимальной нагрузке анаэробный гликолиз быстро даёт АТФ, но только около 30 с, затем ацидоз и утомление."
       }
      },
      {
       "t": "case",
       "q": "A patient is given a calcium channel blocker for high blood pressure. It works because …",
       "ask": "Which answer is right?",
       "opts": [
        "Smooth muscle's action potential depends on Ca²⁺ entry",
        "It blocks acetylcholine at the end plate",
        "It stops the Na⁺/K⁺ pump"
       ],
       "a": 0,
       "why": "Less Ca²⁺ into vessel smooth muscle means lower tone.",
       "ru": {
        "q": "Больному с повышенным давлением назначили блокатор кальциевых каналов. Он действует, потому что …",
        "ask": "Какой ответ верный?",
        "opts": [
         "потенциал действия гладкой мышцы зависит от входа Ca²⁺",
         "он блокирует ацетилхолин в концевой пластинке",
         "он останавливает Na⁺/K⁺-насос"
        ],
        "why": "Меньше Ca²⁺ в гладкой мышце сосудов — ниже тонус."
       }
      }
     ]
    }
   ]
  },
  {
   "n": 3,
   "title": "How bodily functions are controlled",
   "ru": {
    "title": "Принципы организации управления функциями"
   },
   "lists": []
  },
  {
   "n": 4,
   "title": "Nervous control of functions",
   "ru": {
    "title": "Нервная регуляция физиологических функций"
   },
   "lists": []
  },
  {
   "n": 5,
   "title": "Hormonal control of functions",
   "ru": {
    "title": "Гормональная регуляция физиологических функций"
   },
   "lists": []
  },
  {
   "n": 6,
   "title": "Blood",
   "ru": {
    "title": "Кровь"
   },
   "lists": []
  },
  {
   "n": 7,
   "title": "The circulation of blood and lymph",
   "ru": {
    "title": "Крово- и лимфообращение"
   },
   "lists": []
  },
  {
   "n": 8,
   "title": "Breathing",
   "ru": {
    "title": "Дыхание"
   },
   "lists": []
  }
 ]
});
