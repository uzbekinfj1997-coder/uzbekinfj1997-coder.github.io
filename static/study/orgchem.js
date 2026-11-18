/* Study Quest: Organic Chemistry, for Robiyaxon's app. One example chapter so far; the others are listed as coming.
   Written for her from standard textbook facts. Built by ~/study/school/books_robiyaxon.py; edit that, not this file. */
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
       "why": "Carbon is tetravalent."
      },
      {
       "key": "Compounds of carbon and hydrogen only are …",
       "text": "hydrocarbons"
      },
      {
       "key": "Hydrocarbons with only C–C single bonds are …",
       "text": "alkanes",
       "why": "General formula CₙH₂ₙ₊₂, for example methane, CH₄."
      },
      {
       "key": "Hydrocarbons with a C=C double bond are …",
       "text": "alkenes",
       "why": "General formula CₙH₂ₙ, for example ethene, C₂H₄."
      },
      {
       "key": "Hydrocarbons with a C≡C triple bond are …",
       "text": "alkynes",
       "why": "General formula CₙH₂ₙ₋₂, for example ethyne, C₂H₂."
      },
      {
       "key": "The bond angle around an sp³ carbon, as in methane, is …",
       "text": "109.5°",
       "why": "Tetrahedral."
      },
      {
       "key": "The bond angle around an sp² carbon, as in ethene, is …",
       "text": "120°",
       "why": "Trigonal planar."
      },
      {
       "key": "The bond angle around an sp carbon, as in ethyne, is …",
       "text": "180°",
       "why": "Linear."
      },
      {
       "key": "Compounds with the same molecular formula but different structures are …",
       "text": "isomers",
       "why": "Ethanol and dimethyl ether are both C₂H₆O."
      }
     ]
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
       "why": "Name ending -ol, for example ethanol."
      },
      {
       "key": "–CHO, a C=O at the end of the chain, makes an …",
       "text": "aldehyde",
       "why": "Name ending -al, for example ethanal."
      },
      {
       "key": "A C=O inside the chain makes a …",
       "text": "ketone",
       "why": "Name ending -one, for example propanone (acetone)."
      },
      {
       "key": "–COOH makes a …",
       "text": "carboxylic acid",
       "why": "Name ending -oic acid, for example ethanoic (acetic) acid."
      },
      {
       "key": "–NH₂ makes an …",
       "text": "amine",
       "why": "For example methylamine, CH₃NH₂."
      },
      {
       "key": "–COO– between two carbon chains makes an …",
       "text": "ester",
       "why": "Made from an acid and an alcohol, for example ethyl ethanoate."
      },
      {
       "key": "–CONH₂ makes an …",
       "text": "amide"
      },
      {
       "key": "A halogen atom on a carbon chain makes a …",
       "text": "haloalkane",
       "why": "Also called an alkyl halide, for example chloromethane."
      }
     ]
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
       ]
      }
     ]
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
       "why": "Both are C₂H₆O, with different structures."
      },
      {
       "t": "tf",
       "q": "Alkenes have the general formula CₙH₂ₙ₊₂",
       "a": false,
       "why": "That's alkanes; alkenes are CₙH₂ₙ."
      },
      {
       "t": "tf",
       "q": "The carbon in methane is sp² hybridised",
       "a": false,
       "why": "It's sp³: four single bonds, tetrahedral."
      },
      {
       "t": "tf",
       "q": "In a ketone the C=O group is at the end of the chain",
       "a": false,
       "why": "At the end it would be an aldehyde; in a ketone it's within the chain."
      },
      {
       "t": "tf",
       "q": "Propanone is a ketone",
       "a": true,
       "why": "Its C=O is on the middle carbon: CH₃COCH₃."
      }
     ]
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
       "why": "–OH on a two-carbon chain: ethanol."
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
       "why": "–COOH on a two-carbon chain."
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
       "why": "Three carbons, one double bond: an alkene, CₙH₂ₙ."
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
       "why": "The carbons are sp hybridised, so the molecule is linear."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Alkanes and alkenes: their reactions",
   "lists": []
  },
  {
   "n": 3,
   "title": "Stereochemistry",
   "lists": []
  },
  {
   "n": 4,
   "title": "Alcohols, aldehydes and ketones",
   "lists": []
  },
  {
   "n": 5,
   "title": "Carboxylic acids and their derivatives",
   "lists": []
  },
  {
   "n": 6,
   "title": "Amines and amino acids",
   "lists": []
  },
  {
   "n": 7,
   "title": "Aromatic compounds",
   "lists": []
  }
 ]
});
