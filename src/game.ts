import { Die } from './enums/Die.js';
import { Categories } from './types/Categories.js';
import { useCalculateScore } from './utils/CalculateScore.js';

// Game state
class YahtzeeGame {
    dice: Die[] = [];
    rollsLeft: number = 2;
    scorecard: { [key in Categories]: { value: number | null, selected: boolean } } = {} as any;

    constructor() {
        this.initializeDice();
        this.initializeScorecard();
    }

    initializeDice() {
        this.dice = Array.from({ length: 5 }, () => this.rollNewDie());
    }

    isGameOver(){
        // add logic here to loop scorecard and check if all categories are selected
        const totalCategories = Object.keys(this.scorecard).length;
        const completedCategories = Object.values(this.scorecard).filter(item => item.selected).length;
        if(totalCategories === completedCategories){
            console.log("game is over");
            return true;
        }

        // check to see if the last category is just the top bonus
        if(completedCategories === (totalCategories - 1) && this.scorecard[Categories.TopBonus].selected === false){
            console.log("game is over due to not selecting top bonus");
            return true;
        }   
        return false;
    }

    rollNewDie(): Die {
        return {
            value: Math.floor(Math.random() * 6) + 1,
            color: ['red', 'green', 'blue'][Math.floor(Math.random() * 3)] as 'red' | 'green' | 'blue',
            held: false,
        };
    }

    startNewRoll(){
        if(!this.isGameOver()){
            this.rollsLeft = 2;
            this.initializeDice();
        }
    }

    rollDice() {
        if (this.rollsLeft > 0 && !this.isGameOver()) {
            this.dice = this.dice.map(die => (die.held ? die : this.rollNewDie()));
            this.rollsLeft--;
        }
        //this.calculateAllScores();
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

            [Categories.Blues]: { value: null, selected: false },
            [Categories.Reds]: { value: null, selected: false },
            [Categories.Greens]: { value: null, selected: false },
            [Categories.ColorFullHouse]: { value: null, selected: false },
            [Categories.TopBonus]: { value: null, selected: false },
        };
    }

    calculateScore(category: Categories): number {
        return useCalculateScore(category, this.dice);
    }

    calculateAllScores() {
        for (const category in Categories) {
            if (isNaN(Number(category))) { // Ensure it's a string key, not a numeric index
                const score = this.calculateScore(Categories[category as keyof typeof Categories]);
                this.updateScorecard(Categories[category as keyof typeof Categories], score);
            }
        }

        // check if upper score bonus is applicable
        this.isUpperScoreBonusApplicable();

    }

    isUpperScoreBonusApplicable(){
        const upperSectionCategories = [
            Categories.Ones,
            Categories.Twos,
            Categories.Threes,
            Categories.Fours,
            Categories.Fives,
            Categories.Sixes
        ];
        
        const totalScore = upperSectionCategories.reduce((sum, category) => {
            if(this.scorecard[category].selected){
                return sum + (this.scorecard[category].value || 0);
            }
            return sum;
        }, 0);

        if(totalScore >= 63){
            // make sure it doesnt roll the die after selection.
            this.updateSelectedScore(Categories.TopBonus, 35, false);
            return true;
        }else{
            console.log("Top score counter " + totalScore);
        }
    }

    updateScorecard(category: Categories, score: number) {
        if (!this.scorecard[category].selected ) { 
            this.scorecard[category].value = score;
        }
    }

    updateSelectedScore(category: Categories, score: number, roll: boolean = true){ 
        if(this.scorecard[category].selected){
            return;
        }
        this.updateScorecard(category, score);
        this.scorecard[category].selected = true; 
        if(roll){
            this.startNewRoll();
        }
    }

    getTotalScore(): number {
        return Object.values(this.scorecard)
            .filter(item => item.selected)
            .reduce((total, item) => total + (item.value || 0), 0);
    }
}

const game = new YahtzeeGame();

const diceContainer = document.getElementById("dice-container") as HTMLDivElement;
const rollButton = document.getElementById("roll-button") as HTMLButtonElement;
const scoreButtons = document.querySelectorAll(".score-item");
const totalScore = document.getElementById("player-score") as HTMLDivElement;

function renderDice(dice: Die[]) {
    diceContainer.innerHTML = "";
    dice.forEach((die, index) => {
        const dieElement = document.createElement("div");
        //dieElement.textContent = `${die.value}`;
        setDieIcon(dieElement, die.value);
        dieElement.classList.add("die");
        setDieColor(dieElement, die.color);
        if (die.held) dieElement.classList.add("held");

        dieElement.addEventListener("click", () => {
            game.toggleHold(index);
            renderDice(game.dice);
        });

        diceContainer.appendChild(dieElement);
    });

    updateScoreboard();
}

function setDieColor(el: HTMLDivElement, color: string) {
    el.classList.remove('red', 'green', 'blue');
    el.classList.add(color);
}

function setDieIcon(el: HTMLDivElement, value: number) {
    switch(value){
        case 1:
            el.textContent = '⚀';
            break;
        case 2:
            el.textContent = '⚁';
            break;
        case 3:
            el.textContent = '⚂';
            break;
        case 4:
            el.textContent = '⚃';
            break;
        case 5:
            el.textContent = '⚄';
            break;
        case 6:
            el.textContent = '⚅';
            break; 
    }
}

function updateScoreboard() {
    game.calculateAllScores();
    document.querySelectorAll('.score-item').forEach(cell => {
        const category = cell.getAttribute('data-category') as Categories;
        if (category != null) {
            const score = game.scorecard[category]?.value;
            const cellScore = cell.querySelector('.score-cell');
            if(cellScore){
                cellScore.textContent = score !== null ? score.toString() : '-';
            }
        }
    });
    totalScore.textContent = game.getTotalScore().toString();

    if(game.isGameOver()){
        rollButton.textContent = `Game Over`;
        rollButton.disabled = true;
    }
}

function updateDice() {
    if(!game.isGameOver()){
        renderDice(game.dice);
        updateScoreboard();
        rollButton.textContent = `Roll Dice (${game.rollsLeft})`;
    }else{
        rollButton.textContent = `Game Over`;
    }
}


/* action listeners */
rollButton.addEventListener("click", () => {
    game.rollDice();
    updateDice();
});


scoreButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const scoreType = button.getAttribute("data-category") as Categories;
        if (scoreType && scoreType !== 'Top Bonus') {
            button.classList.add('selected');
            const scoreValue = game.calculateScore(scoreType);
            game.updateSelectedScore(scoreType, scoreValue);
            updateDice();
        } else {
            console.error('Score type not found on button.');
        }
    });
});

// Initial render
renderDice(game.dice);

// start game function, remove initial roll.

/* 
    TODO:
    - Add a game over screen
    - Add a new game button
    - Add computer player
    - Add multiplayer
    - Add animations
    - Add sounds
*/