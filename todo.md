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



Online Multiplayer Game Flow
- Host, creates room with unique room code
- Client, types in room code and clicks join
- Host/Client will see Start Game button (only host can click)
- game starts with Host (sends gamestate to client)
    - client gets initial gamestate, updates its state, waits for host.
- Host completes a turn (dice roll, dice hold, category select)
    - host sends gamestate

the host handles the dice manager state
    - client side should be listening for events from host 
        - if host rolls, client gets the dice manager, updates its dice manager with data
        - host clicks a category, client will click same category
        - host holds a die, client will hold same die
    - clients turn
        - after a host category the host should set dice to reset (blanks), client will update.
        - client needs to check if its not host inside, selectCategory, rollDice and toggleHold
            - client will send to the host an event. host will acknowledge and run that command on its end
            - host only needs to run rollDice locally to send back.
            
            GameBoard.vue uses
            peerStore.sendData

            this needs to be reworked for category



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