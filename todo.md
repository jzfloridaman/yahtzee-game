ScoreManager.TS
- abstract score card
- create score card templates (rainbow, regular, etc)


Player Class
- this class will separate player specific data
- player types: local, online, computer
- player id (future use for db / online multiplayer)
- player stats (player level, powerups, etc)
- player name


UI.TS
- this should handle all game input from the user
- use updated scoremanager.ts 
- abstract the audio / music / sfx functionality. 
- abstract animations
- handle the game state better
- refactor all functions to be cleaner named
- add vue for reactivity? 
- abstract game stats save and localstorage functionality
- add more stats (high score, games played, time played, wins, losses)
- simplify game input (button clicks)
- add pinia for state?
- add socket.io for online multiplayer mode
- add computer player ai mode
- use async functions, computed 


Game.TS
- this is the main game logic


Game Modes
- Single Player Game Modes
    - Classic, Rainbow, Puzzle
- Multi-Player Game Modes
    - Battle, Classic, Rainbow, Puzzle

Multiplayer Modes
- Online, Local (Computer), Single


-- MISC --
- Remove any reference to Yahtzee
- Rename game, update artwork
- map out the flow of the game from page load 
    - page loads, initalize ui, game, storage, assets, etc