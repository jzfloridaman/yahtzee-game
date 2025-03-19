// Basic structure for a single-player Yahtzee game with Rainbow Dice
// import { Die } from './Die';
// import { YahtzeeScorecard } from './YahtzeeScorecard'; 

// Define dice properties
type Die = {
    value: number;
    color: 'red' | 'green' | 'blue';
    held: boolean;
  };

//   type ScoringCategory = {
//     name: string;
//     value: number;
//     selected: boolean;
//   };
  
//   type Scoreboard = {
//     upper: ScoringCategory[];
//     lower: ScoringCategory[];
//     total: number;
//     upperTotal: number;
//     lowerTotal: number;
//     bonus: number;
//   };

//   const upperCategories: ScoringCategory[] = [
//     { name: 'Ones', value: 0, selected: false },
//     { name: 'Twos', value: 0, selected: false },
//     { name: 'Threes', value: 0, selected: false },
//     { name: 'Fours', value: 0, selected: false },
//     { name: 'Fives', value: 0, selected: false },
//     { name: 'Sixes', value: 0, selected: false },
//   ];
  
//   const lowerCategories: ScoringCategory[] = [
//     { name: 'Three of a Kind', value: 0, selected: false },
//     { name: 'Four of a Kind', value: 0, selected: false },
//     { name: 'Full House', value: 0, selected: false },
//     { name: 'Small Straight', value: 0, selected: false },
//     { name: 'Large Straight', value: 0, selected: false },
//     { name: 'Yahtzee', value: 0, selected: false },
//     { name: 'Chance', value: 0, selected: false },
//   ];
  
//   let scoreboard: Scoreboard = {
//     upper: upperCategories,
//     lower: lowerCategories,
//     total: 0,
//     upperTotal: 0,
//     lowerTotal: 0,
//     bonus: 0,
//   };
  
//   function calculateUpperScore(dice: number[], category: 'Ones' | 'Twos' | 'Threes' | 'Fours' | 'Fives' | 'Sixes'): number {
//     const categoryValue = parseInt(category);
//     return dice.filter(die => die === categoryValue).length * categoryValue;
//   }
  
//   function calculateThreeOfAKind(dice: number[]): number {
//     const counts = countDice(dice);
//     for (let num in counts) {
//       if (counts[num] >= 3) {
//         return dice.reduce((sum, die) => sum + die, 0); // Sum all dice if condition is met
//       }
//     }
//     return 0; // No three of a kind
//   }

//   function calculateFullHouse(dice: number[]): number {
//     const counts = countDice(dice);
//     const hasThree = Object.values(counts).includes(3);
//     const hasPair = Object.values(counts).includes(2);
  
//     return hasThree && hasPair ? 25 : 0;
//   }
  
//   function countDice(dice: number[]): Record<number, number> {
//     const counts: Record<number, number> = {};
//     for (const die of dice) {
//       counts[die] = (counts[die] || 0) + 1;
//     }
//     return counts;
//   }

//   function updateScoreboard(category: ScoringCategory, score: number) {
//     category.value = score;
//     category.selected = true;
  
//     // Update totals
//     scoreboard.upperTotal = scoreboard.upper.reduce((sum, cat) => cat.selected ? sum + cat.value : sum, 0);
//     scoreboard.lowerTotal = scoreboard.lower.reduce((sum, cat) => cat.selected ? sum + cat.value : sum, 0);
  
//     // Calculate total score
//     scoreboard.total = scoreboard.upperTotal + scoreboard.lowerTotal;
  
//     // Check for bonus
//     scoreboard.bonus = scoreboard.upperTotal >= 63 ? 35 : 0;
//   }
  
  
  
  
// Game state
class YahtzeeGame {
    dice: Die[] = [];
    rollsLeft: number = 3;
    // scorecard: { [key: string]: number | null } = {};
    scorecard: { [key: string]: { value: number | null, selected: boolean } } = {};
    // scorecard: YahtzeeScorecard;
    
    constructor() {
        //this.scorecard = new YahtzeeScorecard();
        this.initializeDice();
        this.initializeScorecard();
    }

    initializeDice() {
        this.dice = Array.from({ length: 5 }, () => this.rollNewDie());
    }

    rollNewDie(): Die {
        return {
        value: Math.floor(Math.random() * 6) + 1,
        color: ['red', 'green', 'blue'][Math.floor(Math.random() * 3)] as 'red' | 'green' | 'blue',
        held: false,
        };
    }

    rollDice() {
        if (this.rollsLeft > 0) {
        this.dice = this.dice.map(die => (die.held ? die : this.rollNewDie()));
        this.rollsLeft--;
        }
    }

    toggleHold(index: number) {
        this.dice[index].held = !this.dice[index].held;
    }

    // initializeScorecard() {
    //     this.scorecard = {
    //     'Ones': null,
    //     'Twos': null,
    //     'Threes': null,
    //     'Fours': null,
    //     'Fives': null,
    //     'Sixes': null,
    //     'Three of a Kind': null,
    //     'Four of a Kind': null,
    //     'Full House': null,
    //     'Small Straight': null,
    //     'Large Straight': null,
    //     'Yahtzee': null,
    //     'Chance': null,
    //     'Color Flush': null,
    //     'Color Straight': null,
    //     'Color Majority Bonus': null,
    //     };
    // }


    initializeScorecard() {
        this.scorecard = {
            'Ones': { value: null, selected: false },
            'Twos': { value: null, selected: false },
            'Threes': { value: null, selected: false },
            'Fours': { value: null, selected: false },
            'Fives': { value: null, selected: false },
            'Sixes': { value: null, selected: false },
            'Three of a Kind': { value: null, selected: false },
            'Four of a Kind': { value: null, selected: false },
            'Full House': { value: null, selected: false },
            'Small Straight': { value: null, selected: false },
            'Large Straight': { value: null, selected: false },
            'Yahtzee': { value: null, selected: false },
            'Chance': { value: null, selected: false },
            'Color Flush': { value: null, selected: false },
            'Color Straight': { value: null, selected: false },
            'Color Majority Bonus': { value: null, selected: false },
        };
    }

    calculateUpperScore(category: 'Ones' | 'Twos' | 'Threes' | 'Fours' | 'Fives' | 'Sixes'): number {
        //const categoryValue = parseInt(category);
        //return this.dice.filter(die => die.value === categoryValue).length * categoryValue;
        const categoryValues: { [key: string]: number } = {
            'Ones': 1,
            'Twos': 2,
            'Threes': 3,
            'Fours': 4,
            'Fives': 5,
            'Sixes': 6,
        };
    
        const categoryValue = categoryValues[category];
    
        if (categoryValue) {
            // Count how many times the category value appears in the dice
            return this.dice.filter(die => die.value === categoryValue).length * categoryValue;
        }
        return 0; // If category is invalid, return 0
    
    }

    calculateThreeOfAKind(): number {
        const counts = this.countDice();
        for (let num in counts) {
            if (counts[num] >= 3) {
                return this.dice.reduce((sum, die) => sum + die.value, 0); // Sum all dice if condition is met
            }
        }
        return 0; // No three of a kind
    }

    calculateFourOfAKind(): number {
        const counts = this.countDice();
        for (let num in counts) {
            if (counts[num] >= 4) {
                return this.dice.reduce((sum, die) => sum + die.value, 0); // Sum all dice if condition is met
            }
        }
        return 0; // No four of a kind
    }

    calculateFullHouse(): number {
        const counts = this.countDice();
        const hasThree = Object.values(counts).includes(3);
        const hasPair = Object.values(counts).includes(2);
        return hasThree && hasPair ? 25 : 0;
    }

    calculateSmallStraight(): number {
        const distinctDice = [...new Set(this.dice.map(die => die.value))];
        const smallStraights = [
            [1, 2, 3, 4],
            [2, 3, 4, 5],
            [3, 4, 5, 6],
        ];
        return smallStraights.some(straight => straight.every(num => distinctDice.includes(num))) ? 30 : 0;
    }

    calculateLargeStraight(): number {
        const distinctDice = [...new Set(this.dice.map(die => die.value))];
        const largeStraights = [
            [1, 2, 3, 4, 5],
            [2, 3, 4, 5, 6],
        ];
        return largeStraights.some(straight => straight.every(num => distinctDice.includes(num))) ? 40 : 0;
    }

    calculateYahtzee(): number {
        const counts = this.countDice();
        return Object.values(counts).includes(5) ? 50 : 0;
    }

    calculateChance(): number {
        return this.dice.reduce((sum, die) => sum + die.value, 0);
    }

/*
    calculateColorFlush(): number {
        const colors = this.dice.map(die => die.color);
        const allSameColor = colors.every(color => color === colors[0]);
        return allSameColor ? 40 : 0;  // Award 40 points for a color flush
    }

    calculateColorStraight(): number {
        const colors = this.dice.map(die => die.color);
        const distinctColors = [...new Set(colors)];
        if (distinctColors.length !== 1) {
            return 0;  // Not all dice are the same color
        }
    
        const distinctDice = [...new Set(this.dice.map(die => die.value))];
        const colorStraights = [
            [1, 2, 3, 4],  // Small straight
            [2, 3, 4, 5],
            [3, 4, 5, 6],
            [1, 2, 3, 4, 5],  // Large straight
            [2, 3, 4, 5, 6],
        ];
    
        return colorStraights.some(straight => straight.every(num => distinctDice.includes(num))) ? 30 : 0;
    }

    calculateColorMajorityBonus(): number {
        const colorCounts = this.dice.reduce((acc, die) => {
            acc[die.color] = (acc[die.color] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    
        const maxColor = Object.entries(colorCounts).reduce(
            (max, [color, count]) => (count > max.count ? { color, count } : max),
            { color: '', count: 0 }
        );
    
        return maxColor.count >= 3 ? 20 : 0;  // 20 points for majority color if it appears at least 3 times
    }
*/

    countDice(): Record<number, number> {
        const counts: Record<number, number> = {};
        for (const die of this.dice) {
            counts[die.value] = (counts[die.value] || 0) + 1;
        }
        return counts;
    }

    updateScorecard(category: string, score: number) {
        if (!this.scorecard[category].selected && this.scorecard[category].value === null) {
            this.scorecard[category].value = score;
            this.scorecard[category].selected = true;
        }
        console.log("updating scorecard", category);
    }

    getTotalScore(): number {
        return Object.values(this.scorecard)
            .filter(item => item.selected)
            .reduce((total, item) => total + (item.value || 0), 0);
    }
}

const game = new YahtzeeGame();
console.log(game);  
const diceContainer = document.getElementById("dice-container") as HTMLDivElement;
const rollButton = document.getElementById("roll-button") as HTMLButtonElement;

// Function to render dice on screen
function renderDice(dice: Die[]) {
    diceContainer.innerHTML = "";
    dice.forEach((die, index) => {
        const dieElement = document.createElement("div");
        dieElement.textContent = `${die.value}`;
        dieElement.style.backgroundColor = die.color;
        dieElement.classList.add("die");
        if (die.held) dieElement.classList.add("held");
        
        dieElement.addEventListener("click", () => {
            game.toggleHold(index);
            renderDice(game.dice);
        });
        
        diceContainer.appendChild(dieElement);
    });

    updateScoreboard();
}

function updateScoreboard() {

    const onesScore = game.calculateUpperScore('Ones');
    const twosScore = game.calculateUpperScore('Twos');
    const threesScore = game.calculateUpperScore('Threes');

    // console.log("Calculating scores");
    // console.log(onesScore);
    // console.log(twosScore);
    // console.log(threesScore);
    // console.log("End calculating");
    game.updateScorecard('Ones', onesScore);
    game.updateScorecard('Twos', twosScore);
    game.updateScorecard('Threes', threesScore);

    document.querySelectorAll('.score-cell').forEach(cell => {
        const category = cell.getAttribute('data-category');
        if (category != null){
            const score = game.scorecard[category]?.value || 0;
            cell.textContent = score.toString();
        }
    });

    console.log(game.scorecard);
}


// Hook up roll button
rollButton.addEventListener("click", () => {
    game.rollDice();
    renderDice(game.dice);
    updateScoreboard();
});

// Initial render
renderDice(game.dice);
