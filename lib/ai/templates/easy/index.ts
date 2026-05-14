import { z } from 'zod';
import { RiddleTemplate } from '../types';

export const easyTemplates: RiddleTemplate<any>[] = [
  {
    id: 'easy_percentage_scaling',
    name: 'Percentage of a Number',
    description: 'Calculates P% of a base number N.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      percentage: z.number().int().min(5).max(95).multipleOf(5),
      base: z.number().int().min(20).max(500).multipleOf(10),
    }),
    solve: ({ percentage, base }) => {
      const answer = (percentage / 100) * base;
      return {
        answer: answer.toString(),
        explanation: `To find ${percentage}% of ${base}, multiply ${base} by ${percentage}/100. So, ${base} * ${percentage / 100} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { percentage: 20, base: 150 },
      wording: `What is exactly 20% of 150?`,
      hint1: 'Convert the percentage to a decimal or fraction.',
      hint2: 'Multiply the base number by the decimal.'
    })
  },
  {
    id: 'easy_fraction_reduction',
    name: 'Fraction of a Number',
    description: 'Calculates a fraction (num/den) of a total amount.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      numerator: z.number().int().min(1).max(5),
      denominator: z.number().int().min(2).max(10),
      total: z.number().int().min(10).max(200),
    }).refine(data => data.numerator < data.denominator && data.total % data.denominator === 0, "Must be proper fraction and total must be divisible by denominator"),
    solve: ({ numerator, denominator, total }) => {
      const answer = (total / denominator) * numerator;
      return {
        answer: answer.toString(),
        explanation: `First, find 1/${denominator} of ${total} by dividing ${total} by ${denominator}, which is ${total / denominator}. Then multiply by the numerator ${numerator} to get ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { numerator: 2, denominator: 5, total: 50 },
      wording: `If you have 50 apples and you give away 2/5 of them, how many apples did you give away?`,
      hint1: 'Divide the total by the denominator to find one part.',
      hint2: 'Multiply that part by the numerator.'
    })
  },
  {
    id: 'easy_unit_conversion_hours_mins',
    name: 'Hours to Minutes',
    description: 'Converts hours to minutes and adds extra minutes.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      hours: z.number().int().min(1).max(12),
      minutes: z.number().int().min(5).max(55).multipleOf(5),
    }),
    solve: ({ hours, minutes }) => {
      const answer = (hours * 60) + minutes;
      return {
        answer: answer.toString(),
        explanation: `There are 60 minutes in an hour. So ${hours} hours is ${hours} * 60 = ${hours * 60} minutes. Adding the extra ${minutes} minutes gives ${answer} minutes total.`
      };
    },
    generateFallback: () => ({
      params: { hours: 3, minutes: 15 },
      wording: `How many total minutes are there in 3 hours and 15 minutes?`,
      hint1: 'Convert the hours into minutes first.',
      hint2: 'Multiply the hours by 60.'
    })
  },
  {
    id: 'easy_handshakes',
    name: 'Handshakes',
    description: 'Number of handshakes for n people if everyone shakes hands once.',
    category: 'patterns',
    difficulty: ['easy'],
    paramsSchema: z.object({
      people: z.number().int().min(3).max(20),
    }),
    solve: ({ people }) => {
      const answer = (people * (people - 1)) / 2;
      return {
        answer: answer.toString(),
        explanation: `With ${people} people, each person shakes hands with ${people - 1} others. This gives ${people} * ${people - 1} = ${people * (people - 1)} handshakes. However, since each handshake involves 2 people, we divide by 2 to avoid double counting, yielding ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { people: 5 },
      wording: `If 5 people meet in a room and everyone shakes hands with everyone else exactly once, how many handshakes occur?`,
      hint1: 'Each person shakes hands with everyone except themselves.',
      hint2: 'Be careful not to count the same handshake twice (A shaking B is the same as B shaking A).'
    })
  },
  {
    id: 'easy_consecutive_sum',
    name: 'Sum of Consecutive Integers',
    description: 'Finds the sum of n consecutive integers starting at x.',
    category: 'sequences',
    difficulty: ['easy'],
    paramsSchema: z.object({
      start: z.number().int().min(1).max(20),
      count: z.number().int().min(3).max(7),
    }),
    solve: ({ start, count }) => {
      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += start + i;
      }
      return {
        answer: sum.toString(),
        explanation: `The ${count} consecutive integers starting from ${start} are ${Array.from({length: count}, (_, i) => start + i).join(', ')}. Adding them together gives ${sum}.`
      };
    },
    generateFallback: () => ({
      params: { start: 5, count: 4 },
      wording: `What is the sum of 4 consecutive whole numbers starting with the number 5?`,
      hint1: 'Write out the sequence of numbers first.',
      hint2: 'The numbers are 5, 6, 7, and 8.'
    })
  },
  {
    id: 'easy_clock_angles_simple',
    name: 'Simple Clock Angles',
    description: 'Angle of the hour hand from 12 o\'clock at H exactly.',
    category: 'geometry',
    difficulty: ['easy'],
    paramsSchema: z.object({
      hour: z.number().int().min(1).max(11),
    }),
    solve: ({ hour }) => {
      const angle = hour * 30; // 360 degrees / 12 hours = 30 degrees per hour
      return {
        answer: angle.toString(),
        explanation: `A full clock face is 360 degrees. Since there are 12 hours on the clock, each hour mark is 360 / 12 = 30 degrees apart. At ${hour} o'clock exactly, the hour hand is at ${hour} * 30 = ${angle} degrees from 12.`
      };
    },
    generateFallback: () => ({
      params: { hour: 4 },
      wording: `At exactly 4:00, what is the angle in degrees between the 12 position and the hour hand, measuring clockwise?`,
      hint1: 'A full circle is 360 degrees.',
      hint2: 'Divide 360 by 12 to find the degrees per hour.'
    })
  },
  {
    id: 'easy_perimeter_square',
    name: 'Perimeter of a Square',
    description: 'Find the perimeter of a square given its side length.',
    category: 'geometry',
    difficulty: ['easy'],
    paramsSchema: z.object({
      side: z.number().int().min(2).max(50),
    }),
    solve: ({ side }) => {
      const answer = side * 4;
      return {
        answer: answer.toString(),
        explanation: `A square has 4 equal sides. If one side is ${side}, the perimeter is ${side} * 4 = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { side: 8 },
      wording: `A square courtyard has a side length of 8 meters. What is the total perimeter of the courtyard?`,
      hint1: 'Perimeter is the total length around the outside.',
      hint2: 'A square has four sides of equal length.'
    })
  },
  {
    id: 'easy_area_rectangle',
    name: 'Area of a Rectangle',
    description: 'Find the area of a rectangle given length and width.',
    category: 'geometry',
    difficulty: ['easy'],
    paramsSchema: z.object({
      length: z.number().int().min(2).max(20),
      width: z.number().int().min(2).max(20),
    }).refine(data => data.length !== data.width, "Make it a rectangle, not a square"),
    solve: ({ length, width }) => {
      const answer = length * width;
      return {
        answer: answer.toString(),
        explanation: `The area of a rectangle is length multiplied by width. ${length} * ${width} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { length: 5, width: 3 },
      wording: `A rectangular table is 5 feet long and 3 feet wide. What is the area of the table in square feet?`,
      hint1: 'Area is calculated by multiplying length and width.',
      hint2: 'Multiply 5 by 3.'
    })
  },
  {
    id: 'easy_box_volume',
    name: 'Volume of a Cube',
    description: 'Find the volume of a cube given its side length.',
    category: 'geometry',
    difficulty: ['easy'],
    paramsSchema: z.object({
      side: z.number().int().min(2).max(15),
    }),
    solve: ({ side }) => {
      const answer = side * side * side;
      return {
        answer: answer.toString(),
        explanation: `The volume of a cube is the side length cubed (side * side * side). For a side of ${side}, the volume is ${side} * ${side} * ${side} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { side: 4 },
      wording: `A perfectly cubic box has a side length of 4 inches. What is the total volume of the box?`,
      hint1: 'Volume is length × width × height.',
      hint2: 'For a cube, all three dimensions are the same.'
    })
  },
  {
    id: 'easy_arithmetic_prog_simple',
    name: 'Next Term in Sequence',
    description: 'Find the next term in a simple addition sequence.',
    category: 'sequences',
    difficulty: ['easy'],
    paramsSchema: z.object({
      start: z.number().int().min(1).max(20),
      diff: z.number().int().min(2).max(10),
    }),
    solve: ({ start, diff }) => {
      const t1 = start;
      const t2 = start + diff;
      const t3 = start + diff * 2;
      const t4 = start + diff * 3;
      const answer = start + diff * 4;
      return {
        answer: answer.toString(),
        explanation: `The sequence goes ${t1}, ${t2}, ${t3}, ${t4}. The pattern is adding ${diff} each time. Therefore, the next term is ${t4} + ${diff} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { start: 2, diff: 3 },
      wording: `Consider the sequence: 2, 5, 8, 11... What is the next number in this sequence?`,
      hint1: 'Find the difference between consecutive numbers.',
      hint2: 'Each number is 3 more than the last.'
    })
  },
  {
    id: 'easy_repeating_patterns',
    name: 'Repeating Pattern Nth Item',
    description: 'Find the Nth item in a repeating sequence of length L.',
    category: 'patterns',
    difficulty: ['easy'],
    paramsSchema: z.object({
      length: z.number().int().min(3).max(6),
      n: z.number().int().min(10).max(50),
    }),
    solve: ({ length, n }) => {
      const remainder = n % length;
      const pos = remainder === 0 ? length : remainder;
      return {
        answer: pos.toString(),
        explanation: `The pattern repeats every ${length} items. To find the ${n}th item, we divide ${n} by ${length} and find the remainder. ${n} divided by ${length} leaves a remainder of ${remainder}. A remainder of ${remainder} corresponds to the ${pos}th position in the repeating sequence.`
      };
    },
    generateFallback: () => ({
      params: { length: 4, n: 17 },
      wording: `A pattern of 4 symbols (Star, Circle, Square, Triangle) repeats continuously. What will be the 17th symbol in the sequence? Answer with the position number (1 for Star, 2 for Circle, etc).`,
      hint1: 'The pattern repeats every 4 symbols.',
      hint2: 'Divide 17 by 4 and look at the remainder.'
    })
  },
  {
    id: 'easy_dice_sum_opposite',
    name: 'Opposite Dice Faces',
    description: 'The sum of opposite faces on standard dice.',
    category: 'patterns',
    difficulty: ['easy'],
    paramsSchema: z.object({
      numDice: z.number().int().min(2).max(10),
    }),
    solve: ({ numDice }) => {
      const answer = numDice * 7;
      return {
        answer: answer.toString(),
        explanation: `On any standard 6-sided die, opposite faces always sum to 7 (1+6, 2+5, 3+4). For ${numDice} dice, the total sum of all opposite face pairs is ${numDice} * 7 = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { numDice: 3 },
      wording: `If you have 3 standard six-sided dice, what is the combined sum of the top faces and the bottom faces of all the dice?`,
      hint1: 'Look at a standard die and add the top and bottom faces.',
      hint2: 'The top and bottom of a single standard die always add to 7.'
    })
  },
  {
    id: 'easy_page_numbers',
    name: 'Facing Page Numbers',
    description: 'Sum of page numbers facing each other in a book.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      leftPage: z.number().int().min(10).max(200).refine(n => n % 2 === 0, "Left page is usually even"),
    }),
    solve: ({ leftPage }) => {
      const rightPage = leftPage + 1;
      const answer = leftPage + rightPage;
      return {
        answer: answer.toString(),
        explanation: `If the left page is ${leftPage}, the facing right page must be ${rightPage}. The sum is ${leftPage} + ${rightPage} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { leftPage: 40 },
      wording: `You open a book and see two facing pages. If the left page is page 40, what is the sum of the two page numbers?`,
      hint1: 'The right page is always the next consecutive number.',
      hint2: 'Add 40 and 41 together.'
    })
  },
  {
    id: 'easy_speed_distance_time',
    name: 'Distance Formula',
    description: 'Calculate distance given speed and time.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      speed: z.number().int().min(10).max(100),
      time: z.number().int().min(2).max(10),
    }),
    solve: ({ speed, time }) => {
      const answer = speed * time;
      return {
        answer: answer.toString(),
        explanation: `Distance is equal to speed multiplied by time. ${speed} multiplied by ${time} is ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { speed: 60, time: 3 },
      wording: `A car travels at a constant speed of 60 miles per hour. How many miles will it travel in 3 hours?`,
      hint1: 'Distance = Speed × Time.',
      hint2: 'Multiply 60 by 3.'
    })
  },
  {
    id: 'easy_shared_cost',
    name: 'Splitting a Bill',
    description: 'Split a total cost equally among people.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      total: z.number().int().min(20).max(200),
      people: z.number().int().min(2).max(10),
    }).refine(data => data.total % data.people === 0, "Must divide evenly"),
    solve: ({ total, people }) => {
      const answer = total / people;
      return {
        answer: answer.toString(),
        explanation: `To split the cost equally, divide the total (${total}) by the number of people (${people}). ${total} / ${people} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { total: 60, people: 4 },
      wording: `Four friends go to a restaurant and the total bill is $60. If they split the cost equally, how much does each person pay?`,
      hint1: 'Divide the total bill by the number of people.',
      hint2: 'Divide 60 by 4.'
    })
  },
  {
    id: 'easy_leg_counting',
    name: 'Counting Legs',
    description: 'Total legs for a given number of 2-legged and 4-legged animals.',
    category: 'algebra',
    difficulty: ['easy'],
    paramsSchema: z.object({
      twoLegs: z.number().int().min(2).max(15),
      fourLegs: z.number().int().min(2).max(15),
    }),
    solve: ({ twoLegs, fourLegs }) => {
      const answer = (twoLegs * 2) + (fourLegs * 4);
      return {
        answer: answer.toString(),
        explanation: `There are ${twoLegs} animals with 2 legs (${twoLegs * 2} legs) and ${fourLegs} animals with 4 legs (${fourLegs * 4} legs). The total is ${twoLegs * 2} + ${fourLegs * 4} = ${answer} legs.`
      };
    },
    generateFallback: () => ({
      params: { twoLegs: 5, fourLegs: 3 },
      wording: `On a farm, there are 5 chickens and 3 cows. How many total animal legs are there?`,
      hint1: 'Chickens have 2 legs and cows have 4.',
      hint2: 'Multiply the number of animals by their legs and add them up.'
    })
  },
  {
    id: 'easy_age_difference_simple',
    name: 'Constant Age Difference',
    description: 'Age difference remains constant over time.',
    category: 'algebra',
    difficulty: ['easy'],
    paramsSchema: z.object({
      diff: z.number().int().min(2).max(20),
      yearsPass: z.number().int().min(5).max(30),
    }),
    solve: ({ diff, yearsPass }) => {
      const answer = diff;
      return {
        answer: answer.toString(),
        explanation: `The age difference between two people never changes as time passes because they both age at the exact same rate. If the difference was ${diff} years initially, it remains ${diff} years after ${yearsPass} years.`
      };
    },
    generateFallback: () => ({
      params: { diff: 4, yearsPass: 10 },
      wording: `When John was born, his older sister was 4 years old. How much older will his sister be when 10 years have passed?`,
      hint1: 'Do people age at different rates?',
      hint2: 'The difference in age between two people is always exactly the same.'
    })
  },
  {
    id: 'easy_digit_sum',
    name: 'Sum of Digits',
    description: 'Sum the digits of a 2-digit number.',
    category: 'number theory',
    difficulty: ['easy'],
    paramsSchema: z.object({
      tens: z.number().int().min(1).max(9),
      ones: z.number().int().min(0).max(9),
    }),
    solve: ({ tens, ones }) => {
      const answer = tens + ones;
      return {
        answer: answer.toString(),
        explanation: `The number is composed of the digits ${tens} and ${ones}. Their sum is ${tens} + ${ones} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { tens: 4, ones: 7 },
      wording: `Consider the number 47. What is the sum of its individual digits?`,
      hint1: 'The digits are 4 and 7.',
      hint2: 'Add 4 and 7 together.'
    })
  },
  {
    id: 'easy_discount_price',
    name: 'Price after Discount',
    description: 'Calculate final price after a simple percentage discount.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      price: z.number().int().min(10).max(200).multipleOf(10),
      discount: z.number().int().min(10).max(50).multipleOf(10),
    }),
    solve: ({ price, discount }) => {
      const discountAmount = (discount / 100) * price;
      const answer = price - discountAmount;
      return {
        answer: answer.toString(),
        explanation: `The discount is ${discount}% of ${price}, which is ${discountAmount}. Subtracting this from the original price gives ${price} - ${discountAmount} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { price: 100, discount: 20 },
      wording: `A jacket originally costs $100. If it is on sale for 20% off, what is the final price?`,
      hint1: 'Find what 20% of the price is.',
      hint2: 'Subtract the discount from the original price.'
    })
  },
  {
    id: 'easy_ratio_sharing',
    name: 'Sharing in a Ratio',
    description: 'Find one person\'s share when dividing an amount in a simple ratio a:b.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      ratioA: z.number().int().min(1).max(5),
      ratioB: z.number().int().min(1).max(5),
      totalPartsMultiplier: z.number().int().min(2).max(10),
    }),
    solve: ({ ratioA, ratioB, totalPartsMultiplier }) => {
      const totalParts = ratioA + ratioB;
      const totalAmount = totalParts * totalPartsMultiplier;
      const shareA = ratioA * totalPartsMultiplier;
      return {
        answer: shareA.toString(),
        explanation: `The total ratio parts are ${ratioA} + ${ratioB} = ${totalParts}. The total amount is ${totalAmount}, so each part is worth ${totalAmount} / ${totalParts} = ${totalPartsMultiplier}. The first share is ${ratioA} parts, so ${ratioA} * ${totalPartsMultiplier} = ${shareA}.`
      };
    },
    generateFallback: () => ({
      params: { ratioA: 2, ratioB: 3, totalPartsMultiplier: 5 },
      wording: `A prize of $25 is divided between two people in the ratio 2:3. How much money does the person with the smaller share receive?`,
      hint1: 'Add the two numbers in the ratio together to find the total number of parts.',
      hint2: 'Divide the total amount by the total parts, then multiply by the smaller ratio number.'
    })
  },
  {
    id: 'easy_work_rate_simple',
    name: 'Simple Work Rate Scaling',
    description: 'If 1 takes T, how long for N to do N tasks?',
    category: 'algebra',
    difficulty: ['easy'],
    paramsSchema: z.object({
      time: z.number().int().min(2).max(20),
      count: z.number().int().min(3).max(10),
    }),
    solve: ({ time, count }) => {
      const answer = time;
      return {
        answer: answer.toString(),
        explanation: `If one worker takes ${time} minutes to do one task, then ${count} workers working simultaneously will take the exact same ${time} minutes to do ${count} tasks. The rate doesn't change.`
      };
    },
    generateFallback: () => ({
      params: { time: 5, count: 5 },
      wording: `If it takes 1 machine 5 minutes to make 1 widget, how many minutes does it take 5 machines to make 5 widgets?`,
      hint1: 'Think about the machines working at the same time.',
      hint2: 'Each machine is still making just 1 widget.'
    })
  },
  {
    id: 'easy_even_parity',
    name: 'Summing Even Numbers',
    description: 'Sum of the first N positive even numbers.',
    category: 'sequences',
    difficulty: ['easy'],
    paramsSchema: z.object({
      n: z.number().int().min(3).max(10),
    }),
    solve: ({ n }) => {
      // The sum of first N even numbers is N(N+1)
      const answer = n * (n + 1);
      return {
        answer: answer.toString(),
        explanation: `The first ${n} even numbers are 2, 4, 6... up to ${n * 2}. Their sum is given by the formula N * (N + 1), which is ${n} * ${n + 1} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { n: 4 },
      wording: `What is the sum of the first 4 positive even numbers?`,
      hint1: 'List out the first four even numbers greater than zero.',
      hint2: 'The numbers are 2, 4, 6, and 8.'
    })
  },
  {
    id: 'easy_odd_parity',
    name: 'Summing Odd Numbers',
    description: 'Sum of the first N positive odd numbers.',
    category: 'sequences',
    difficulty: ['easy'],
    paramsSchema: z.object({
      n: z.number().int().min(3).max(10),
    }),
    solve: ({ n }) => {
      // The sum of first N odd numbers is N^2
      const answer = n * n;
      return {
        answer: answer.toString(),
        explanation: `The sum of the first N odd numbers is always exactly N squared. For ${n} odd numbers, the sum is ${n} * ${n} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { n: 5 },
      wording: `What is the sum of the first 5 positive odd numbers?`,
      hint1: 'List out the odd numbers starting from 1.',
      hint2: 'Add 1, 3, 5, 7, and 9.'
    })
  },
  {
    id: 'easy_geometric_prog_simple',
    name: 'Next Term in Doubling Sequence',
    description: 'Find the next term in a sequence that doubles.',
    category: 'sequences',
    difficulty: ['easy'],
    paramsSchema: z.object({
      start: z.number().int().min(1).max(5),
    }),
    solve: ({ start }) => {
      const t1 = start;
      const t2 = start * 2;
      const t3 = start * 4;
      const t4 = start * 8;
      const answer = start * 16;
      return {
        answer: answer.toString(),
        explanation: `The sequence goes ${t1}, ${t2}, ${t3}, ${t4}. The pattern is multiplying by 2 each time. The next term is ${t4} * 2 = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { start: 3 },
      wording: `Consider the sequence: 3, 6, 12, 24... What is the next number?`,
      hint1: 'Look at how each number relates to the one before it.',
      hint2: 'Each number is exactly double the previous one.'
    })
  },
  {
    id: 'easy_calendar_weeks',
    name: 'Days in Weeks',
    description: 'Total days in W weeks and D days.',
    category: 'arithmetic reasoning',
    difficulty: ['easy'],
    paramsSchema: z.object({
      weeks: z.number().int().min(2).max(10),
      days: z.number().int().min(1).max(6),
    }),
    solve: ({ weeks, days }) => {
      const answer = (weeks * 7) + days;
      return {
        answer: answer.toString(),
        explanation: `There are exactly 7 days in a week. ${weeks} weeks is ${weeks} * 7 = ${weeks * 7} days. Adding the extra ${days} days gives ${answer} days total.`
      };
    },
    generateFallback: () => ({
      params: { weeks: 4, days: 3 },
      wording: `How many total days are there in 4 weeks and 3 days?`,
      hint1: 'Multiply the number of weeks by 7.',
      hint2: 'Add the extra days to the total from the weeks.'
    })
  }
];
