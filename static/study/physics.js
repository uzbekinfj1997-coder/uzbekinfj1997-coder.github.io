/* Study Quest: Physics, for Maryamxon's app. One example chapter so far; the others are listed as coming.
   Written for her, school level. Built by ~/study/school/books.py; edit that, not this file. */
"use strict";
window.StudyBooks = window.StudyBooks || [];
window.StudyBooks.push({
 "id": "physics",
 "name": "Physics",
 "title": "Motion, forces and energy",
 "about": "One example chapter so far; the others are coming",
 "chapters": [
  {
   "n": 1,
   "title": "Motion",
   "lists": [
    {
     "id": "phy-01-know-1",
     "track": "know",
     "name": "1.1 Words and units",
     "about": "Distance, speed, velocity, acceleration",
     "items": [
      {
       "key": "How far something travels along its path is its …",
       "text": "distance",
       "why": "Measured in metres (m)."
      },
      {
       "key": "The straight-line change in position, with a direction, is …",
       "text": "displacement",
       "why": "It has a size and a direction."
      },
      {
       "key": "Speed = …",
       "text": "distance ÷ time",
       "why": "v = s / t."
      },
      {
       "key": "The SI unit of speed is …",
       "text": "m/s",
       "why": "Metres per second."
      },
      {
       "key": "Speed in a stated direction is …",
       "text": "velocity",
       "why": "20 m/s north is a velocity; 20 m/s is a speed."
      },
      {
       "key": "How fast velocity changes is …",
       "text": "acceleration",
       "why": "a = (v − u) / t: the change in velocity divided by the time taken."
      },
      {
       "key": "The SI unit of acceleration is …",
       "text": "m/s²",
       "why": "Metres per second, every second."
      },
      {
       "key": "A quantity with a size but no direction is a …",
       "text": "scalar",
       "why": "Distance, speed and time are scalars; displacement, velocity and acceleration are vectors."
      }
     ]
    },
    {
     "id": "phy-01-know-2",
     "track": "know",
     "name": "1.2 Graphs and conversions",
     "about": "Reading graphs, changing units",
     "items": [
      {
       "key": "On a distance–time graph, the steepness of the line shows …",
       "text": "speed",
       "why": "Steeper means faster."
      },
      {
       "key": "A flat line on a distance–time graph means the object is …",
       "text": "at rest",
       "why": "The distance isn't changing."
      },
      {
       "key": "On a speed–time graph, the area under the line is …",
       "text": "the distance travelled"
      },
      {
       "key": "To change km/h into m/s, …",
       "text": "divide by 3.6",
       "why": "1 km/h = 1000 m ÷ 3600 s, so 72 km/h = 20 m/s."
      },
      {
       "key": "Average speed = …",
       "text": "total distance ÷ total time"
      },
      {
       "key": "Moving at the same speed in a straight line is called …",
       "text": "uniform motion"
      }
     ]
    },
    {
     "id": "phy-01-structure-3",
     "track": "structure",
     "name": "1.S Solving a motion problem",
     "about": "Put the steps in order",
     "items": [
      {
       "t": "order",
       "q": "Solving a motion problem",
       "steps": [
        "Write down what you know, with units",
        "Change the units to metres and seconds",
        "Choose the formula: v = s / t or a = (v − u) / t",
        "Put in the numbers and calculate",
        "Check the units and whether the answer makes sense"
       ],
       "why": ""
      }
     ]
    },
    {
     "id": "phy-01-watch-4",
     "track": "watch",
     "name": "1.W Traps",
     "about": "True or false, and why",
     "items": [
      {
       "t": "tf",
       "q": "Speed and velocity are the same thing",
       "a": false,
       "why": "Velocity also has a direction."
      },
      {
       "t": "tf",
       "q": "A car going round a bend at a steady 50 km/h is accelerating",
       "a": true,
       "why": "Its direction changes, so its velocity changes."
      },
      {
       "t": "tf",
       "q": "If you walk 3 m east and 3 m back west, your displacement is 6 m",
       "a": false,
       "why": "You end where you started: the displacement is 0 m. The distance is 6 m."
      },
      {
       "t": "tf",
       "q": "72 km/h is the same as 20 m/s",
       "a": true,
       "why": "72 ÷ 3.6 = 20."
      },
      {
       "t": "tf",
       "q": "A negative acceleration always means the object is moving backwards",
       "a": false,
       "why": "It means the acceleration points the other way: a car moving forwards and braking has a negative acceleration."
      }
     ]
    },
    {
     "id": "phy-01-apply-5",
     "track": "apply",
     "name": "1.A Problems",
     "about": "Which answer is right?",
     "items": [
      {
       "t": "case",
       "q": "A cyclist rides 30 km in 2 hours. What is her average speed?",
       "ask": "Which answer is right?",
       "opts": [
        "15 km/h",
        "60 km/h",
        "32 km/h"
       ],
       "a": 0,
       "why": "30 km ÷ 2 h = 15 km/h."
      },
      {
       "t": "case",
       "q": "A car goes from 0 to 20 m/s in 5 s. What is its acceleration?",
       "ask": "Which answer is right?",
       "opts": [
        "4 m/s²",
        "100 m/s²",
        "0.25 m/s²"
       ],
       "a": 0,
       "why": "(20 − 0) ÷ 5 = 4 m/s²."
      },
      {
       "t": "case",
       "q": "A train moves at 90 km/h. How fast is that in m/s?",
       "ask": "Which answer is right?",
       "opts": [
        "25 m/s",
        "324 m/s",
        "9 m/s"
       ],
       "a": 0,
       "why": "90 ÷ 3.6 = 25 m/s."
      },
      {
       "t": "case",
       "q": "How far does a car going at 15 m/s travel in 8 s?",
       "ask": "Which answer is right?",
       "opts": [
        "120 m",
        "1.9 m",
        "23 m"
       ],
       "a": 0,
       "why": "s = v × t = 15 × 8 = 120 m."
      }
     ]
    }
   ]
  },
  {
   "n": 2,
   "title": "Forces and Newton's laws",
   "lists": []
  },
  {
   "n": 3,
   "title": "Work, energy and power",
   "lists": []
  },
  {
   "n": 4,
   "title": "Pressure",
   "lists": []
  },
  {
   "n": 5,
   "title": "Heat",
   "lists": []
  },
  {
   "n": 6,
   "title": "Electricity",
   "lists": []
  }
 ]
});
