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

- clean up assets
- create icons / splash screens / logos (need new game name)


QA STUFF
- after select category, make sure it deselects the button (no focus it)
- message that its your turn (needs to play after scoring category animation)
- fix layout for landscape mode , desktop mode
- if hosts ends game, do not log the save, only save completed games.
- add sound effect when player joins, game started, game ended, your turn.
- preload sound effects / assets
- add the move dice order feature. ()
- add peek other player's scorecard.
- resync should send all scorecards.
- add feature to add ur name.
- buzz/alert player or add a timer countdown til it auto rolls
    - shake screen / play a sound (nudge)
- add resync option for host.
- heart beat log (debug for host)
- prevent host from refreshing or leaving page 
- have host only allow max connections (security)