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
- handle the game state better
- refactor all functions to be cleaner named
- add more stats (high score, games played, time played, wins, losses)
- simplify game input (button clicks)
- add computer player ai mode


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



PWA Stuff

- add the service worker
  if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
       navigator.serviceWorker.register('/service-worker.js');
     });
   }

- fix subdomain to point correctly so we dont use a subdirectory on the server
- clean up assets
- create icons / splash screens / logos (need new game name)