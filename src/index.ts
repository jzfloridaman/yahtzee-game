import { Die } from './Die.js';
import { ScoringStrategy } from './strategies/ScoringStrategy.js';
import { UpperScoreStrategy } from './strategies/UpperScoreStrategy.js';
import { ThreeOfAKindStrategy } from './strategies/ThreeOfAKindStrategy.js';
import { Categories } from './Categories.js';

// Game state
class YahtzeeGame {
    dice: Die[] = [];
    rollsLeft: number = 3;
    scorecard: { [key in Categories]: { value: number | null, selected: boolean } } = {} as any;

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
        this.calculateAllScores();
    }

    toggleHold(index: number) {
        this.dice[index].held = !this.dice[index].held;
    }

    initializeScorecard() {
        this.scorecard = {
            [Categories.Ones]: { value: null, selected: false },
            [Categories.Twos]: { value: null, selected: false },
            [Categories.Threes]: { value: null, selected: false },
            [Categories.Fours]: { value: null, selected: false },
            [Categories.Fives]: { value: null, selected: false },
            [Categories.Sixes]: { value: null, selected: false },
            [Categories.ThreeOfAKind]: { value: null, selected: false },
            [Categories.FourOfAKind]: { value: null, selected: false },
            [Categories.FullHouse]: { value: null, selected: false },
            [Categories.SmallStraight]: { value: null, selected: false },
            [Categories.LargeStraight]: { value: null, selected: false },
            [Categories.Yahtzee]: { value: null, selected: false },
            [Categories.Chance]: { value: null, selected: false },
            [Categories.ColorFlush]: { value: null, selected: false },
            [Categories.ColorStraight]: { value: null, selected: false },
            [Categories.ColorMajorityBonus]: { value: null, selected: false },
        };
    }

    calculateScore(category: Categories): number {
        let strategy: ScoringStrategy;

        switch (category) {
            case Categories.Ones:
                strategy = new UpperScoreStrategy(1);
                break;
            case Categories.Twos:
                strategy = new UpperScoreStrategy(2);
                break;
            case Categories.Threes:
                strategy = new UpperScoreStrategy(3);
                break;
            case Categories.Fours:
                strategy = new UpperScoreStrategy(4);
                break;
            case Categories.Fives:
                strategy = new UpperScoreStrategy(5);
                break;
            case Categories.Sixes:
                strategy = new UpperScoreStrategy(6);
                break;
            case Categories.ThreeOfAKind:
                strategy = new ThreeOfAKindStrategy();
                break;
            // Add other strategies here...
            default:
                return 0;
        }

        return strategy.calculateScore(this.dice);
    }

    calculateAllScores() {
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const score = this.calculateScore(Categories[category as keyof typeof Categories]);
                this.updateScorecard(Categories[category as keyof typeof Categories], score);
            }
        }
    }

    updateScorecard(category: Categories, score: number) {
        //console.log(`Updating scorecard for category: ${category} with score: ${score}`);
        if (!this.scorecard[category].selected ) {  //&& this.scorecard[category].value === null
            this.scorecard[category].value = score;
            //this.scorecard[category].selected = true;
        }
    }

    updateSelectedScore(category: Categories, score: number) {
        this.updateScorecard(category, score);
        this.scorecard[category].selected = true;
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
const scoreButtons = document.querySelectorAll(".score-cell");

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
    game.calculateAllScores();
    document.querySelectorAll('.score-cell').forEach(cell => {
        const category = cell.getAttribute('data-category') as Categories;
        if (category != null) {
            const score = game.scorecard[category]?.value;
            cell.textContent = score !== null ? score.toString() : '-';
        }
    });
}

rollButton.addEventListener("click", () => {
    game.rollDice();
    renderDice(game.dice);
    updateScoreboard();
    console.log(game);
});

scoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const scoreType = button.getAttribute("data-category") as Categories;
        if (scoreType) {
            const scoreValue = game.calculateScore(scoreType);
            game.updateSelectedScore(scoreType, scoreValue);
            updateScoreboard();
        } else {
            console.error('Score type not found on button.');
        }
    });
});

// Initial render
renderDice(game.dice);