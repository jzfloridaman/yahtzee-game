// Basic structure for a single-player Yahtzee game with Rainbow Dice

import { Die } from './Die.js';
import { ScoringStrategy } from './strategies/ScoringStrategy.js';
import { UpperScoreStrategy } from './strategies/UpperScoreStrategy.js';
import { ThreeOfAKindStrategy } from './strategies/ThreeOfAKindStrategy.js';
import { Categories } from './Categories.js';

// Game state
    class YahtzeeGame {
        dice: Die[] = [];
        rollsLeft: number = 3;
        scorecard: { [key: string]: { value: number | null, selected: boolean } } = {};
    
        constructor() {
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
    
        calculateScore(category: string): number {
            let strategy: ScoringStrategy;
    
            switch (category) {
                case 'Ones':
                    strategy = new UpperScoreStrategy(1);
                    break;
                case 'Twos':
                    strategy = new UpperScoreStrategy(2);
                    break;
                case 'Threes':
                    strategy = new UpperScoreStrategy(3);
                    break;
                case 'Fours':
                    strategy = new UpperScoreStrategy(4);
                    break;
                case 'Fives':
                    strategy = new UpperScoreStrategy(5);
                    break;
                case 'Sixes':
                    strategy = new UpperScoreStrategy(6);
                    break;
                case 'Three of a Kind':
                    strategy = new ThreeOfAKindStrategy();
                    break;
                // Add other strategies here...
                default:
                    return 0;
            }
    
            return strategy.calculateScore(this.dice);
        }
    
        updateScorecard(category: string, score: number) {
            console.log(`Updating scorecard for category: ${category} with score: ${score}`);
            if (!this.scorecard[category].selected && this.scorecard[category].value === null) {
                this.scorecard[category].value = score;
                this.scorecard[category].selected = true;
            }
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
const scoreButtons = document.querySelectorAll(".score-btn");

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
    document.querySelectorAll('.score-btn').forEach(cell => {
        const category = cell.getAttribute('data-score');
        if (category != null) {
            const score = game.scorecard[category]?.value || 0;
            cell.textContent = score.toString();
        }
    });
}

rollButton.addEventListener("click", () => {
    game.rollDice();
    renderDice(game.dice);
    updateScoreboard();
});

scoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const scoreType = button.getAttribute("data-score");
        if (scoreType) {
            const scoreValue = game.calculateScore(scoreType);
            game.updateScorecard(scoreType, scoreValue);
            updateScoreboard();
        }
    });
});

// Initial render
renderDice(game.dice);
