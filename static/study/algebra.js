/* Study Quest: Algebra, for Maryamxon's app. One example chapter so far; the others are listed as coming.
   Written for her, school level. Built by ~/study/school/books.py; edit that, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "algebra",
 "name": "Algebra",
 "title": "Equations and functions",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Linear equations",
   "lists": [
    {
     "id": "alg-01-know-1",
     "track": "know",
     "name": "1.1 Words and ideas",
     "about": "Variable, coefficient, equation, solution",
     "items": [
      {
       "key": "A letter that stands for an unknown number",
       "text": "variable",
       "why": "In 3x + 2 = 11, x is the variable: the number we want to find."
      },
      {
       "key": "In 5x, the number 5 is the …",
       "text": "coefficient",
       "why": "The coefficient multiplies the variable: 5x means 5 × x."
      },
      {
       "key": "A number on its own, like 7 in 2x + 7, is a …",
       "text": "constant",
       "why": "It stays the same whatever x is."
      },
      {
       "key": "Two expressions joined by an equals sign make an …",
       "text": "equation",
       "why": "2x + 3 = 11 is an equation; 2x + 3 on its own is an expression."
      },
      {
       "key": "The value of x that makes an equation true is its …",
       "text": "solution",
       "why": "x = 4 is the solution of 2x + 3 = 11, because 2 × 4 + 3 = 11."
      },
      {
       "key": "Terms with the same variable, like 3x and 5x, are …",
       "text": "like terms",
       "why": "Like terms can be added: 3x + 5x = 8x."
      },
      {
       "key": "An equation where x appears only to the first power, like 2x + 3 = 11, is …",
       "text": "linear",
       "why": "Its graph is a straight line: no x², no 1/x."
      },
      {
       "key": "Doing the same thing to both sides keeps an equation …",
       "text": "balanced",
       "why": "Like scales: add, subtract, multiply or divide both sides by the same number (not zero)."
      }
     ]
    },
    {
     "id": "alg-01-know-2",
     "track": "know",
     "name": "1.2 Rules for solving",
     "about": "Undo each step, keep the balance",
     "items": [
      {
       "key": "To undo + 5 on one side, …",
       "text": "subtract 5 from both sides",
       "why": "x + 5 = 12 → x = 12 − 5 = 7."
      },
      {
       "key": "To undo × 3, as in 3x = 12, …",
       "text": "divide both sides by 3",
       "why": "3x = 12 → x = 12 ÷ 3 = 4."
      },
      {
       "key": "A term moved to the other side changes its …",
       "text": "sign",
       "why": "x + 7 = 10 → x = 10 − 7: the +7 becomes −7."
      },
      {
       "key": "Opening the brackets: 3(x + 2) = …",
       "text": "3x + 6",
       "why": "Multiply every term inside the brackets by 3."
      },
      {
       "key": "If an equation simplifies to 0 = 5, it has …",
       "text": "no solution",
       "why": "No value of x can make 0 equal 5."
      },
      {
       "key": "If an equation simplifies to 0 = 0, it has …",
       "text": "infinitely many solutions",
       "why": "Every value of x works."
      }
     ]
    },
    {
     "id": "alg-01-structure-3",
     "track": "structure",
     "name": "1.S Solving in order",
     "about": "Put the steps in order",
     "items": [
      {
       "t": "order",
       "q": "Solving 3(x − 2) = 2x + 5",
       "steps": [
        "Open the brackets: 3x − 6 = 2x + 5",
        "Gather the x terms on one side: 3x − 2x = 5 + 6",
        "Simplify: x = 11",
        "Check: 3(11 − 2) = 27 and 2 × 11 + 5 = 27 ✓"
       ],
       "why": "Brackets first, then gather, then simplify, then check."
      },
      {
       "t": "order",
       "q": "Solving x/4 + 1 = 3",
       "steps": [
        "Subtract 1 from both sides: x/4 = 2",
        "Multiply both sides by 4: x = 8",
        "Check: 8/4 + 1 = 3 ✓"
       ],
       "why": "Undo the last thing done to x first: here the + 1, then the ÷ 4."
      }
     ]
    },
    {
     "id": "alg-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "3x + 2x = 5x²",
       "a": false,
       "why": "Like terms add their coefficients: 3x + 2x = 5x. The power doesn't change."
      },
      {
       "t": "tf",
       "q": "If 2x = 10, then x = 5",
       "a": true,
       "why": "Divide both sides by 2."
      },
      {
       "t": "tf",
       "q": "x + 3 = 7 has the solution x = 10",
       "a": false,
       "why": "Subtract 3 from both sides: x = 4."
      },
      {
       "t": "tf",
       "q": "−(x − 4) = −x + 4",
       "a": true,
       "why": "A minus sign in front of brackets changes the sign of every term inside."
      },
      {
       "t": "tf",
       "q": "You may divide both sides of an equation by 0",
       "a": false,
       "why": "Dividing by zero has no meaning. Never multiply or divide both sides by 0."
      }
     ]
    },
    {
     "id": "alg-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "Solve 2x + 3 = 11",
       "ask": "Which answer is right?",
       "opts": [
        "x = 4",
        "x = 7",
        "x = 5.5"
       ],
       "a": 0,
       "why": "Subtract 3: 2x = 8. Divide by 2: x = 4."
      },
      {
       "t": "case",
       "q": "Solve 5x − 7 = 3x + 9",
       "ask": "Which answer is right?",
       "opts": [
        "x = 8",
        "x = 1",
        "x = −8"
       ],
       "a": 0,
       "why": "5x − 3x = 9 + 7, so 2x = 16 and x = 8."
      },
      {
       "t": "case",
       "q": "A notebook costs x so'm. Four notebooks and a 3,000-so'm pen cost 23,000 so'm. Which equation fits?",
       "ask": "Which answer is right?",
       "opts": [
        "4x + 3000 = 23000",
        "4(x + 3000) = 23000",
        "x + 4 × 3000 = 23000"
       ],
       "a": 0,
       "why": "Four notebooks cost 4x; add the pen: 4x + 3000 = 23000, so x = 5000 so'm."
      },
      {
       "t": "case",
       "q": "Ali is 3 years older than his sister, and together they are 21. How old is his sister?",
       "ask": "Which answer is right?",
       "opts": [
        "9",
        "12",
        "10.5"
       ],
       "a": 0,
       "why": "Sister x, Ali x + 3: x + x + 3 = 21, so 2x = 18 and x = 9. Ali is 12."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Inequalities",
   "lists": []
  },
  {
   "n": 3,
   "title": "Systems of linear equations",
   "lists": []
  },
  {
   "n": 4,
   "title": "Powers and polynomials",
   "lists": []
  },
  {
   "n": 5,
   "title": "Quadratic equations",
   "lists": []
  },
  {
   "n": 6,
   "title": "Functions and graphs",
   "lists": []
  }
 ]
});
