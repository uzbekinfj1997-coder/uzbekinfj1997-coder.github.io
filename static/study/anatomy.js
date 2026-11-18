/* Study Quest: Anatomy, for Robiyaxon's app. One example chapter so far; the others are listed as coming.
   Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py; edit that, not this file. */
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
       "why": "Also called ventral."
      },
      {
       "key": "Towards the back of the body is …",
       "text": "posterior",
       "why": "Also called dorsal."
      },
      {
       "key": "Towards the head is …",
       "text": "superior",
       "why": "Also called cranial."
      },
      {
       "key": "Towards the feet is …",
       "text": "inferior",
       "why": "Also called caudal."
      },
      {
       "key": "Nearer the midline of the body is …",
       "text": "medial",
       "why": "The nose is medial to the eyes."
      },
      {
       "key": "Further from the midline is …",
       "text": "lateral",
       "why": "The ears are lateral to the eyes."
      },
      {
       "key": "On a limb, nearer the point where it joins the trunk is …",
       "text": "proximal",
       "why": "The elbow is proximal to the wrist."
      },
      {
       "key": "On a limb, further from the trunk is …",
       "text": "distal",
       "why": "The fingers are distal to the wrist."
      },
      {
       "key": "Nearer the body's surface is …",
       "text": "superficial",
       "why": "The skin is superficial to the muscles."
      },
      {
       "key": "Further from the body's surface is …",
       "text": "deep",
       "why": "The bones are deep to the muscles."
      }
     ]
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
       "why": "Every directional term is described from this position."
      },
      {
       "key": "A plane that divides the body into left and right parts is …",
       "text": "sagittal"
      },
      {
       "key": "The sagittal plane that divides the body into equal left and right halves is the …",
       "text": "median plane",
       "why": "Also called the midsagittal plane."
      },
      {
       "key": "A plane that divides the body into front and back parts is …",
       "text": "coronal",
       "why": "Also called the frontal plane."
      },
      {
       "key": "A plane that divides the body into upper and lower parts is …",
       "text": "transverse",
       "why": "Also called horizontal or axial: the plane of CT slices."
      },
      {
       "key": "Lying on the back, face up, is …",
       "text": "supine"
      },
      {
       "key": "Lying on the front, face down, is …",
       "text": "prone"
      }
     ]
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
       ]
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
       "why": "The arm, in anatomy, is only the part between the shoulder and the elbow."
      }
     ]
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
       "why": "They face forwards, so the radius and ulna lie side by side, not crossed."
      },
      {
       "t": "tf",
       "q": "The elbow is proximal to the wrist",
       "a": true,
       "why": "It's nearer the shoulder, where the limb joins the trunk."
      },
      {
       "t": "tf",
       "q": "The coronal plane divides the body into left and right parts",
       "a": false,
       "why": "That's the sagittal plane; the coronal plane divides front from back."
      },
      {
       "t": "tf",
       "q": "The sternum is medial to the humerus",
       "a": true,
       "why": "The sternum lies in the midline; the humerus is out in the arm."
      },
      {
       "t": "tf",
       "q": "Supine means lying face down",
       "a": false,
       "why": "Supine is face up; prone is face down."
      }
     ]
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
       "why": "A sagittal plane runs front to back, splitting left from right."
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
       "why": "The knee is nearer to where the lower limb joins the trunk."
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
       "why": "It divides upper from lower parts."
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
       "why": "It's nearer the body's surface."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Bones and joints",
   "lists": []
  },
  {
   "n": 3,
   "title": "Muscles",
   "lists": []
  },
  {
   "n": 4,
   "title": "The thorax: heart and lungs",
   "lists": []
  },
  {
   "n": 5,
   "title": "The abdomen",
   "lists": []
  },
  {
   "n": 6,
   "title": "Head and neck",
   "lists": []
  },
  {
   "n": 7,
   "title": "The nervous system",
   "lists": []
  }
 ]
});
