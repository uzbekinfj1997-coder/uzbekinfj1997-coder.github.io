/* Study Quest: Pathology, for Robiyaxon's app. One example chapter so far; the others are listed as coming.
   Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py; edit that, not this file. */
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
       "why": "For example the heart muscle in long-standing hypertension."
      },
      {
       "key": "An increase in the number of cells is …",
       "text": "hyperplasia",
       "why": "For example the endometrium in the proliferative phase, or benign prostatic hyperplasia."
      },
      {
       "key": "A decrease in the size of cells, often with fewer of them, is …",
       "text": "atrophy",
       "why": "For example a limb that isn't used, or after its nerve supply is lost."
      },
      {
       "key": "One kind of mature cell replaced by another kind is …",
       "text": "metaplasia",
       "why": "For example ciliated columnar cells in a smoker's bronchi replaced by squamous cells."
      },
      {
       "key": "Squamous oesophageal lining replaced by columnar cells, from acid reflux, is …",
       "text": "Barrett oesophagus",
       "why": "A metaplasia that raises the risk of adenocarcinoma."
      },
      {
       "key": "Disordered growth with abnormal cells, which can lead to cancer, is …",
       "text": "dysplasia",
       "why": "Not an adaptation: it's a precancerous change."
      }
     ]
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
       "why": "Swelling comes from the Na⁺/K⁺ pump failing as ATP falls."
      },
      {
       "key": "Cell death with membrane rupture and inflammation is …",
       "text": "necrosis"
      },
      {
       "key": "Programmed cell death without inflammation is …",
       "text": "apoptosis",
       "why": "The cell shrinks, its chromatin condenses, and it breaks into apoptotic bodies that are eaten."
      },
      {
       "key": "Shrinkage of the nucleus in a dying cell is …",
       "text": "pyknosis"
      },
      {
       "key": "Breaking up of the nucleus is …",
       "text": "karyorrhexis"
      },
      {
       "key": "Fading away of the nucleus is …",
       "text": "karyolysis"
      },
      {
       "key": "Necrosis typical of an infarct in the heart or kidney is …",
       "text": "coagulative necrosis",
       "why": "The tissue's outline is kept for some days."
      },
      {
       "key": "Necrosis typical of an infarct in the brain, or an abscess, is …",
       "text": "liquefactive necrosis"
      },
      {
       "key": "Cheese-like necrosis typical of tuberculosis is …",
       "text": "caseous necrosis"
      },
      {
       "key": "Chalky white necrosis around the pancreas in acute pancreatitis is …",
       "text": "fat necrosis",
       "why": "Released fatty acids combine with calcium (saponification)."
      }
     ]
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
       ]
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
       ]
      }
     ]
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
       "why": "The apoptotic bodies are removed quietly; it's necrosis that brings inflammation."
      },
      {
       "t": "tf",
       "q": "Metaplasia can go back to normal if the cause is removed",
       "a": true,
       "why": "It's reversible, though it may lead on to dysplasia if the cause persists."
      },
      {
       "t": "tf",
       "q": "A brain infarct shows coagulative necrosis",
       "a": false,
       "why": "The brain shows liquefactive necrosis."
      },
      {
       "t": "tf",
       "q": "Caseous necrosis is typical of tuberculosis",
       "a": true,
       "why": "Cheese-like, crumbly material inside a granuloma."
      },
      {
       "t": "tf",
       "q": "Hypertrophy is an increase in the number of cells",
       "a": false,
       "why": "That's hyperplasia; hypertrophy is an increase in their size."
      }
     ]
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
       "why": "One mature type is replaced by another that copes better with smoke."
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
       "why": "Heart muscle cells can hardly divide, so they grow in size."
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
       "why": "Caseous means cheese-like: typical of tuberculosis."
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
       "why": "Programmed cell death keeps its membranes intact, so nothing leaks to cause inflammation."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Inflammation and repair",
   "lists": []
  },
  {
   "n": 3,
   "title": "Haemodynamic disorders: thrombosis, embolism and infarction",
   "lists": []
  },
  {
   "n": 4,
   "title": "Immunopathology",
   "lists": []
  },
  {
   "n": 5,
   "title": "Neoplasia",
   "lists": []
  },
  {
   "n": 6,
   "title": "Genetic disorders",
   "lists": []
  },
  {
   "n": 7,
   "title": "Infectious diseases",
   "lists": []
  }
 ]
});
