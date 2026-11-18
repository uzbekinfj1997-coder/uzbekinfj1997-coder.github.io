/* Study Quest: Geometry, for Maryamxon's app. One example chapter so far; the others are listed as coming.
   Written for her, school level. Built by ~/study/school/books.py; edit that, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "geometry",
 "name": "Geometry",
 "title": "Shapes, angles and space",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Angles and triangles",
   "lists": [
    {
     "id": "geo-01-know-1",
     "track": "know",
     "name": "1.1 Angles",
     "about": "Kinds of angles and how they add up",
     "items": [
      {
       "key": "An angle smaller than 90° is …",
       "text": "acute"
      },
      {
       "key": "An angle of exactly 90° is a …",
       "text": "right angle",
       "why": "Drawn with a small square in the corner."
      },
      {
       "key": "An angle between 90° and 180° is …",
       "text": "obtuse"
      },
      {
       "key": "An angle of exactly 180° is a …",
       "text": "straight angle",
       "why": "It's a straight line."
      },
      {
       "key": "Two angles that add up to 90° are …",
       "text": "complementary",
       "why": "35° and 55° are complementary."
      },
      {
       "key": "Two angles that add up to 180° are …",
       "text": "supplementary",
       "why": "Angles next to each other on a straight line are supplementary."
      },
      {
       "key": "Vertically opposite angles, where two lines cross, are …",
       "text": "equal"
      },
      {
       "key": "The angles around a point add up to …",
       "text": "360°"
      }
     ]
    },
    {
     "id": "geo-01-know-2",
     "track": "know",
     "name": "1.2 Triangles",
     "about": "Kinds of triangles and their angles",
     "items": [
      {
       "key": "The angles of a triangle add up to …",
       "text": "180°"
      },
      {
       "key": "A triangle with all three sides equal is …",
       "text": "equilateral",
       "why": "Each of its angles is 60°."
      },
      {
       "key": "A triangle with two equal sides is …",
       "text": "isosceles",
       "why": "The angles opposite the equal sides are equal."
      },
      {
       "key": "A triangle with no equal sides is …",
       "text": "scalene"
      },
      {
       "key": "A triangle with a 90° angle is a …",
       "text": "right triangle"
      },
      {
       "key": "An exterior angle of a triangle equals …",
       "text": "the sum of the two opposite interior angles",
       "why": "Both make 180° with the angle beside it."
      },
      {
       "key": "The longest side of a right triangle is the …",
       "text": "hypotenuse",
       "why": "It's opposite the right angle."
      }
     ]
    },
    {
     "id": "geo-01-structure-3",
     "track": "structure",
     "name": "1.S Finding a missing angle",
     "about": "Put the steps in order",
     "items": [
      {
       "t": "order",
       "q": "A triangle has angles of 50° and 60°. Find the third.",
       "steps": [
        "The angles of a triangle add up to 180°",
        "Add the known angles: 50° + 60° = 110°",
        "Subtract: 180° − 110° = 70°"
       ],
       "why": ""
      },
      {
       "t": "order",
       "q": "An isosceles triangle has 40° between its equal sides. Find the base angles.",
       "steps": [
        "The two base angles are equal",
        "Together they make 180° − 40° = 140°",
        "Each base angle is 140° ÷ 2 = 70°"
       ],
       "why": ""
      }
     ]
    },
    {
     "id": "geo-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "A triangle can have two right angles",
       "a": false,
       "why": "90° + 90° is already 180°, leaving nothing for the third angle."
      },
      {
       "t": "tf",
       "q": "Every equilateral triangle is also isosceles",
       "a": true,
       "why": "It has (at least) two equal sides."
      },
      {
       "t": "tf",
       "q": "An obtuse angle can be 180°",
       "a": false,
       "why": "180° is a straight angle; obtuse angles are between 90° and 180°."
      },
      {
       "t": "tf",
       "q": "Supplementary angles add up to 90°",
       "a": false,
       "why": "Supplementary angles add up to 180°; complementary ones add up to 90°."
      },
      {
       "t": "tf",
       "q": "In a right triangle, the two acute angles add up to 90°",
       "a": true,
       "why": "180° − 90° = 90° is left for the other two."
      }
     ]
    },
    {
     "id": "geo-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "Two angles are complementary and one is 35°. What is the other?",
       "ask": "Which answer is right?",
       "opts": [
        "55°",
        "145°",
        "65°"
       ],
       "a": 0,
       "why": "90° − 35° = 55°."
      },
      {
       "t": "case",
       "q": "Where two straight lines cross, one angle is 110°. What is the angle next to it?",
       "ask": "Which answer is right?",
       "opts": [
        "70°",
        "110°",
        "250°"
       ],
       "a": 0,
       "why": "Angles next to each other on a straight line add up to 180°: 180° − 110° = 70°."
      },
      {
       "t": "case",
       "q": "A triangle's angles are x, 2x and 3x. Find x.",
       "ask": "Which answer is right?",
       "opts": [
        "30°",
        "36°",
        "60°"
       ],
       "a": 0,
       "why": "x + 2x + 3x = 180°, so 6x = 180° and x = 30°."
      },
      {
       "t": "case",
       "q": "An exterior angle of a triangle is 120°, and one opposite interior angle is 50°. What is the other?",
       "ask": "Which answer is right?",
       "opts": [
        "70°",
        "60°",
        "10°"
       ],
       "a": 0,
       "why": "The exterior angle equals the two opposite interior angles together: 120° − 50° = 70°."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Parallel lines and angles",
   "lists": []
  },
  {
   "n": 3,
   "title": "Quadrilaterals and polygons",
   "lists": []
  },
  {
   "n": 4,
   "title": "Circles",
   "lists": []
  },
  {
   "n": 5,
   "title": "Area and perimeter",
   "lists": []
  },
  {
   "n": 6,
   "title": "Pythagoras' theorem and similar triangles",
   "lists": []
  }
 ]
});
