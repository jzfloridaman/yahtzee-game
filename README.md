# 🎲 Rainbow Yahtzee!

Rainbow Yahtzee is a fun twist on the classic Yahtzee game! It introduces a colorful variation where dice colors play a key role in scoring. Roll the dice, strategize your moves, and aim for the highest score!

---

## 📖 Table of Contents

1. [Features](#-features)
2. [Rules](#-rules)
3. [Getting Started](#-getting-started)
4. [How to Play](#-how-to-play)
5. [Project Structure](#-project-structure)
6. [Contributing](#-contributing)
7. [License](#-license)
8. [Acknowledgments](#-acknowledgments)

---

## 🌈 Features

- **Classic Yahtzee Rules** with an exciting color-based twist.
- **Color Full House**: Score by rolling 3 dice of one color and 2 dice of another color (numbers don’t matter).
- **Color Yahtzee**: Score by rolling 5 dice of the same color (Green, Blue, or Red).
- Multiplayer support (up to 4 players).
- Interactive UI with dice animations and score tracking.

---

## 📜 Rules

The rules are the same as normal Yahtzee, but with additional color-based scoring:

1. **Color Full House**:
   - Roll 3 dice of the same color and 2 dice of another color.
   - The numbers on the dice don’t matter.

2. **Color Yahtzee**:
   - Roll 5 dice of the same color (Green, Blue, or Red).
   - The numbers on the dice don’t matter.

3. **Other Categories**:
   - Standard Yahtzee categories like Ones, Twos, Threes, etc., are still in play.
   - Score based on the numbers rolled.

4. **Top Bonus**:
   - Score 35 bonus points if the total of the upper section (Ones through Sixes) is 63 or higher.

---

## 🚀 Getting Started

Follow these steps to set up and run the game locally.

### Prerequisites

Make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/yahtzee-game.git
   cd yahtzee-game
   ```

### Compile the game

2. Install dependencies and run the game:

   ```bash
   npm install
   ```

### Run the game

3. Run the game
    ```
   npm run dev
   npm run build
   npm run preview
    ```

---

## 🎮 How to Play

1. Select **Single Player** or **Multiplayer** mode.
2. Roll the dice by clicking the **Roll Dice** button.
3. Click on dice to hold them for the next roll.
4. Choose a scoring category after each roll.
5. The game ends when all categories are filled. The player with the highest score wins!

---

## 📂 Project Structure

yahtzee-game/
├── src/
│   ├── __tests__/         # Unit tests
│   ├── enums/             # Game enums (e.g., Categories, GameState)
│   ├── managers/          # Game logic managers (e.g., DiceManager, ScoreManager)
│   ├── types/             # TypeScript types
│   ├── ui/                # UI-related logic
│   ├── game.ts            # Main game logic
├── dist/                  # Production build output
├── [index.html](http://_vscodecontentref_/1)             # Entry point for the game
├── vite.config.js         # Vite configuration
├── [package.json](http://_vscodecontentref_/2)           # Project metadata and scripts
└── [README.md](http://_vscodecontentref_/3)              # Project documentation

---

## 🤝 Contributing
Contributions are welcome! If you’d like to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request with a detailed description of your changes.

---

## 📜 License
This project is licensed under the MIT License.

---

## 💡 Acknowledgments
Inspired by the classic Yahtzee game.
Dice icons provided by Font Awesome.

---

Enjoy playing Rainbow Yahtzee! 🎲🌈