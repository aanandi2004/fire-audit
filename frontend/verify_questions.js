
import { getQuestions } from './src/config/questionBanks.js';

console.log("Checking Group D, D-1 questions:");
const questions = getQuestions('D', 'D-1');
console.log("Count:", questions.length);
if (questions.length > 0) {
    console.log("First question:", questions[0]);
} else {
    console.log("No questions found.");
}

console.log("Checking Group A, A-1 questions:");
const questionsA = getQuestions('A', 'A-1');
console.log("Count:", questionsA.length);
