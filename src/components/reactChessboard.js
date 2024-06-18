
import { Chessboard } from 'react-chessboard';
import React, { useState, useRef } from 'react';
import InformationModal from './modals/informationModal.js';
import ReactButton from './reactButton.js';
import { poll } from '../service/pollService.js';
import './reactChessboard.css';
import NumberInputModal from './modals/numberInputModal.js';
import Info from '@mui/icons-material/Info';
const { Chess } = require('chess.js');


export default function ReactChessboard() {

  const WHITE = "white";
  const BLACK = "black";


  //setting up constants & utilizing useState hook to reflect the state in order to get the board to properly update when the state changes
  const [gamePosition, setGamePosition] = useState('');
  const [dragEnabled, setDragEnabled] = useState(true);
  const [game, setGame] = useState(new Chess());
  const [endGameButtonVisible, setEndGameButtonVisible] = useState(false);
  const [endSpectateButtonVisible, setEndSpectateButtonVisible] = useState(false);
  const [initGameButtonsVisible, setInitGameButtonsVisible] = useState(true);
  const [playerPromptText, setPlayerPromptText] = useState("");
  const [boardPosition, setBoardPosition] = useState(WHITE);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalText, setInfoModalText] = useState("");
  const [showJoinGameModal, setShowJoinGameModal] = useState(false);
  const [showSpectateGameModal, setShowSpectateGameModal] = useState(false);
  const initGameButtons = [
    <ReactButton id="new-game-button" visible={initGameButtonsVisible} onClick={beginGame} label="New Game" variant='outlined' />,
    <ReactButton id="join-game-button" visible={initGameButtonsVisible} onClick={promptUserToJoin} label="Join Game" variant='outlined' />,
    <ReactButton id="spectate-game-button" visible={initGameButtonsVisible} onClick={promptUserToSpectate} label="Spectate Game" variant='outlined' />
  ];
  const [inGameButtons, setInGameButtons] = useState(initGameButtons);
  const [castlingButtons, setCastlingButtons] = useState([]);

  const queensideRookMovedFromStart = useRef(false);
  const kingsideRookMovedFromStart = useRef(false);
  const kingMovedFromStart = useRef(false);

  //standardizing data format of: White objects are listed before Black objects, Queenside objects listed before Kingside
  const startingCastlePositions = useRef([['e1', 'a1', 'h1'], ['e8', 'a8', 'h8']]);
  //data for paths organized in spaces moving away from king
  //this is necessary to standardize in order to properly handle queen-side castling
  //because, when checking attack paths, the 'b' column square needs to be clear, but can be under attack for a valid castle move
  const standardCastlingPaths = useRef([[['d1', 'c1', 'b1'], ['f1', 'g1']], [['d8', 'c8', 'b8'], ['f8', 'g8']]]);
  const castlingTargets = [['c1', 'g1'], ['c8', 'g8']];
  const queensideAttackableCastlingSquare = ['b1', 'b8'];

  const boardId = useRef(0);
  const playerColor = useRef(WHITE);
  const playAgainString = useRef("You may still start, join, or spectate a different game.")
  const otherPlayedEndedText = useRef("The other player has chosen to end the game. " + playAgainString.current);
  const currentPlayerEndedText = useRef("You have successfully ended your game. " + playAgainString.current);
  const gameToJoinHasEnded = useRef("The game whose ID you have entered is no longer active. " + playAgainString.current);
  const gameToSpectateHasEnded = useRef("The game whose ID you have entered is no longer active.");
  const gameToJoinDoesNotExist = useRef("We're sorry, but the ID you've provided does not match any live games.");

  const isSpectating = useRef(false);
  const operationFailure = useRef("Sorry, we couldn't perform this action just now. Please try again.");
  const joinGameModalText = useRef("Enter the game ID of the game you are trying to join below.");
  const spectateGameModalText = useRef("Enter the game ID of the game you are trying to spectate below.");


  //TODO: configure more appropriate environment based properties system
  function getServerPath() {
    let serverPath = ""
    if (window.location.href.includes('localhost')) {
      serverPath = "http://localhost";
    } else {
      //due to not having an available domain to attach to my AWS load balancer, 
      //i was unable to set up SSL for secure resource access. NExt best thing for the purposes of 
      //this demo project was to deploy the react app on heroku which allows ssl to be disabled and allows us to access the golang
      //server running on aws ec2 directly
      serverPath = "http://ec2-18-224-251-47.us-east-2.compute.amazonaws.com";
    }
    serverPath = serverPath + ":8080";
    return serverPath;
  }


  function initButtons(isGameLive) {
    console.log("button init");
    let buttonComponents = [];
    if (isGameLive) {
      //if game is live, buttons we want are: king/queenside castle, end game IF user is playing, ELSE only display end spectate button
      if (isSpectating.current) {
        console.log("providing spectator controls");
        buttonComponents.push(<ReactButton id="end-game-button" onClick={endSpectate} label="Leave Spectator Mode" variant='contained' />);
      } else {
        console.log("providing player controls");
        buttonComponents.push(<ReactButton id="end-game-button" onClick={quitGame} label="End Game" variant='contained' />);
      }
    } else {
      //if game is not live, we want to display join game, new game, spectate
      buttonComponents = initGameButtons;

    }
    setInGameButtons(buttonComponents);
  }

  //Method to perform a castling move based on a button push, if not kingside then is queenside
  //validation if castling should occur will have already happened under handleBeginningOfTurn, and 
  //intention is that validation will enable/disable castling buttons as is appropriate
  function doCastle(isQueenside) {
    console.log("Doing castle");
    let playerColorIndex = getPlayerColorIndex();
    let piece = "";
    if (playerColor.current === WHITE) {
      piece += "w";
    } else {
      piece += "b";
    }
    piece += "K";
    let castlingTarget;
    if (isQueenside) {
      castlingTarget = castlingTargets[playerColorIndex][0];
    } else {
      castlingTarget = castlingTargets[playerColorIndex][1];
    }
    let kingSource = startingCastlePositions.current[playerColorIndex][0];
    console.log("attempting castle move: " + kingSource + ", " + castlingTarget + ", " + piece);
    attemptMovePiece(kingSource, castlingTarget, piece);
  }

  async function spectateGame() {
    setEndSpectateButtonVisible(true);
    setInitGameButtonsVisible(false);
    setEndGameButtonVisible(false);
    setDragEnabled(false);
    console.log("attempting game spectate");
    let response = await fetch(getServerPath() + '/live/' + boardId.current, {
      method: 'GET',
    })
    let data = await response.json();
    if (response.status === 200) {
      if (data.IsGameLive) {
        initButtons(true);
        setGamePosition('start');
        setDragEnabled(false);
        pollForSpectatorView();
      }
      else {
        setInfoModalText(gameToSpectateHasEnded.current);
        setShowInfoModal(true);
        handleBoardReset();
      }
    } else if (response.status === 404) {
      setInfoModalText(gameToJoinDoesNotExist.current);
      setShowInfoModal(true);
      handleBoardReset();
    }
    else {
      console.log("ERROR " + response.statusText);
      showSomethingIsWrongModal();
    }
  }

  async function beginGame() {

    console.log("init chess game attempt");
    let response = await fetch(getServerPath() + '/new', {
      method: 'GET',
    });

    let data = await response.json();

    if (response.status === 200) {
      initButtons(true);
      handleBeginningOfTurn();
      updateControlButtonVisibility(true);
      setGamePosition('start');
      //Initiating player automatically set to the white pieces
      setBoardPosition(WHITE);
      boardId.current = data.ID;
      let boardIdText = `Your game's ID is ${data.ID}. Send it to a friend to have them join your game!`;
      setInfoModalText(boardIdText);
      setShowInfoModal(true);
    }
    else {
      showSomethingIsWrongModal();
    }
  }

  function showSomethingIsWrongModal() {
    setInfoModalText(operationFailure.current);
    setShowInfoModal(true);
  }

  function handleBoardReset() {
    console.log("resetting board");
    setGame(new Chess());
    setDragEnabled(false);
    setBoardPosition("");
    setGamePosition("");
    setPlayerPromptText("");
    setCastlingButtons([]);
    isSpectating.current = false;
    updateControlButtonVisibility(false);
    setEndSpectateButtonVisible(false);
    initButtons(false);
  }

  async function joinGame() {
    setDragEnabled(false);
    console.log("attempting game join");
    let response = await fetch(getServerPath() + '/live/' + boardId.current, {
      method: 'GET',
    })
    let data = await response.json();
    if (response.status === 200) {
      console.log(data);
      if (data.IsGameLive) {
        initButtons(true);
        //for simplicity, players who join a game will automatically be assigned the black chess pieces 
        setBoardPosition(BLACK);
        playerColor.current = BLACK;
        updateControlButtonVisibility(true);
        setGamePosition('start');
        setDragEnabled(false);
        pollForOpponentResponse();
      }
      else {
        setInfoModalText(gameToJoinHasEnded.current);
        setShowInfoModal(true);

      }
    } else if (response.status === 404) {
      setInfoModalText(gameToJoinDoesNotExist.current);
      setShowInfoModal(true);
    }
    else {
      console.log("ERROR " + response.statusText);
      showSomethingIsWrongModal();
    }
  }


  function sendEndGameRequest(isQuit) {
    console.log("ATTEMPTING TO END GAME");
    fetch(getServerPath() + (isQuit ? '/quit/' : '/end/') + boardId.current + '/' + playerColor.current, {
      method: 'DELETE',

    }).then((response) => response.json())
      .then((data) => {
        console.log("Game ended successfully");
        //should only need to handle quitting in this method, 
        if (isQuit) {
          setInfoModalText(data.EndingPlayer === playerColor.current ? currentPlayerEndedText.current : otherPlayedEndedText.current);
          setShowInfoModal(true);
          handleBoardReset();
        }

      })
      .catch((err) => {
        console.log(err.message);
      });
  }

  function endSpectate() {
    setEndSpectateButtonVisible(false);
    isSpectating.current = false;
    handleBoardReset();
  }

  function quitGame() {
    sendEndGameRequest(true);
  }
  function updateControlButtonVisibility(gameIsLive) {

    setInitGameButtonsVisible(!gameIsLive);
    if (isSpectating.current) {
      setEndGameButtonVisible(false);
    }
    else {
      setEndGameButtonVisible(gameIsLive);
    }

  }


  //todo: impelement additional poll for heartbeat on game? pollForOpponenentResponse works well as this heartbeat only when
  //the current user is waiting for the opponent to move, otherwise the other user won't know the game ends until they make their next move

  //built based off of https://dev.to/jakubkoci/polling-with-async-await-25p4
  async function pollForOpponentResponse() {
    const fetchTurn = () => fetch(getServerPath() + "/live/" + boardId.current, { method: 'GET' }).then(response => response.json());
    const compareTurn = (response) => {

      //should restructure, when we poll we receive the information that we need to operate on anyway, no need to duplicate the call
      //and add one additional REST call for board state fetch 
      //console.log(response);

      if (!response instanceof String && !response.IsGameLive) {
        //while polling for opponent, call updateBoardSTate if the game has been ended to alert the current player as to why the game has ended
        // updateBoardState(response.PGN);
      }
      //stop the poll for opponent moves if the game has ended, OR if it becomes the current player's turn once again
      return response.IsGameLive && ((response instanceof String) || (response.CurrentTurn.localeCompare(playerColor.current[0]) !== 0));
    }
    await poll(fetchTurn, compareTurn, 1000);
    //once the poll has completed, then we can fetch the board position
    fetchBoardState();
  }

  async function pollForSpectatorView() {
    const fetchTurn = () => fetch(getServerPath() + "/live/" + boardId.current, { method: 'GET' }).then(response => response.json());
    const checkSpectate = (response) => {

      // console.log("Waiting for next move...");
      //only ever want to update the board state IFF
      //the game record has not yet been deleted, the game is still currently live, AND the current user is still spectating
      if (!response !== "Game Not Found" && response.IsGameLive && isSpectating.current) {
        updateBoardState(response.PGN);
      }
      else {

        if (response === "Game Not Found") {
          setInfoModalText(gameToJoinDoesNotExist.current)
        }
        else if (!response.IsGameLive) {
          setInfoModalText(gameToSpectateHasEnded.current);
        }
        if (isSpectating.current) {
          //if user is no longer spectating, do not show user updates 
          setShowInfoModal(true);
        }
        isSpectating.current = false;
      }

      //stop the poll for all moves if the game cannot be found, if the game ends, or if the current user decides to stop spectating
      return !(!response.IsGameLive || response === "Game Not Found" || !isSpectating.current);
    }
    await poll(fetchTurn, checkSpectate, 1000);
  }

  //returns boolean value -> true indicates piece move is allowable, false indicates it should return to its original position
  function attemptMovePiece(sourceSquare, targetSquare, piece) {
    console.log("Source: " + sourceSquare);
    console.log("Target: " + targetSquare);
    console.log("Piece: " + piece);

    const move = {
      from: sourceSquare, to: targetSquare
    };

    //add promotion property for pawns (will appear as Q piece due to autopromotion flag),
    // because queens cannot be promoted so the promotion value will not affect them if they pass this boolean gate
    if (piece[1] === 'Q' && targetSquare[targetSquare.length - 1]) {
      console.log("promoting to Queen");
      move.promotion = 'q';
    }

    const moves = game.moves();
    
    try {

      var attemptedMove = game.move(move);
      console.log(move);
      if (attemptedMove !== null) {
        setGamePosition(game.fen());
        setGame(game);
        if (game.isGameOver()) {
          let gameCopy = new Chess();
          gameCopy.loadPgn(game.pgn());
          handleBoardReset();
          handleGameOver(gameCopy);

        }
        postMoveToServer(!game.isGameOver());
      }
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  function updateBoardState(PGN) {
    let gameCopy = new Chess();
    gameCopy.loadPgn(PGN);


    setGamePosition(gameCopy.fen());
    setGame(gameCopy);
    console.log("inCheck: " + gameCopy.inCheck());
    console.log("inCheckmate:" + gameCopy.isCheckmate());
    if (!isSpectating.current) {

      if (gameCopy.isGameOver()) {
        handleGameOver(gameCopy);

        // } else if (gameCopy.isCheck()) {
        //   setInfoModalText("You are in check");
        //   setShowInfoModal(true);
        // }
      }
    }
  }



  //alerts the player who is receiving the turn to the reason the game has ended, 
  function handleGameOver(chessGame) {
    if (chessGame.isDraw()) {
      let drawText = "The game has ended in a draw. ";
      if (chessGame.isInsufficientMaterial()) {
        drawText += "Neither player has sufficient material to continue.";
      }
      else if (chessGame.isThreefoldRepetition()) {
        drawText += "This board configuration has been repeated too many times.";
      } else if (chessGame.isStalemate()) {
        drawText += "This is a stalemate.";
      }
      setInfoModalText(drawText);
    }
    else if (chessGame.isCheckmate()) {
      //this method operates at a step ahead. of the move that was just made. If the current player took a move that caused checkmate
      //the turn() method would return the next player's color, because it is *technically* their turn
      if (chessGame.turn() === playerColor.current[0]) {
        setInfoModalText("You have lost. Checkmate");
      } else {
        setInfoModalText("You have won!")
      }
    }
    setShowInfoModal(true);
    handleBoardReset();
  }

  async function handleFetchBoardStateResponse(response) {
    let data = await response.json();
    if (response.status === 200) {
      console.log(data);
      updateBoardState(data.PGN);
      if (!isSpectating.current && data.IsGameLive) {
        handleBeginningOfTurn();
      }
    } else if (response.status === 404) {
      //in this method, a response of 404 indicates that the ID we are providing to the GET GET/live/:id endpoint
      //no longer exists in the database. Therefore, we can assume (Barring any malicious actors) that the game has been ended by the other user
      setInfoModalText(otherPlayedEndedText.current);
      //Known Bug: sometimes this poll response occurs before the endGame response, so the ending user is shown a message that the other
      //user has ended the game. T
      setShowInfoModal(true);
      handleBoardReset();
    }
    else {
      showSomethingIsWrongModal();
    }
  }

  async function fetchBoardState() {
    let response = await fetch(getServerPath() + '/live/' + boardId.current, {
      method: 'GET',
    });
    handleFetchBoardStateResponse(response);
  }

  function postMoveToServer(isGameLive) {
    let postBody = createChessGameObject(isGameLive);

    fetch(getServerPath() + '/live/' + boardId.current, {
      method: 'POST',
      body: JSON.stringify(postBody),
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        handleEndOfTurn();
      })
      .catch((err) => {
        console.log("ERROR: " + err);
      });
  }

  function handleEndOfTurn() {
    setDragEnabled(false);
    setPlayerPromptText("Waiting for opponent...");
    pollForOpponentResponse();
  }

  function handleBeginningOfTurn() {
    console.log("beginning Turn");
    setDragEnabled(true);

    let tempPromptText = "It's your turn! ";
    //this is behind a turn, TODO: investigate
    // if (game.inCheck()) {
    //   tempPromptText += "You are in check!";
    // }

    setPlayerPromptText(tempPromptText);
    setCastlingRights();
  }

  function getPlayerColorIndex() {
    return playerColor.current === WHITE ? 0 : 1;
  }

  //perform examination of state to see what, if any, castling rights are available to the current player
  function setCastlingRights() {
    let playerColorIndex = getPlayerColorIndex();
    let attackingColor = playerColor.current === WHITE ? BLACK : WHITE;
    let castlingLocations = startingCastlePositions.current[playerColorIndex];
    let castlingPaths = standardCastlingPaths.current[playerColorIndex];
    let castlingRights = game.getCastlingRights(playerColor.current);
    let king = game.get(castlingLocations[0]);
    let kingsideRook = game.get(castlingLocations[2]);
    let queensideRook = game.get(castlingLocations[1]);
    console.log(king);
    console.log("Has King Moved? " + kingMovedFromStart.current);
    console.log(kingsideRook);
    console.log("Has Kingside Rook Moved? " + kingsideRookMovedFromStart.current);
    console.log(queensideRook);
    console.log("Has Queenside Rook Moved? " + queensideRookMovedFromStart.current);
    let kingMoved = kingMovedFromStart.current || king === false || king.type !== 'k';

    //if the king is in check, we automatically know that castling is unavailable
    if (game.inCheck() || kingMoved) {
      castlingRights.k = false;
      castlingRights.q = false;
      if (kingMoved) {
        kingMovedFromStart.current = true;
      }
    } else {
      // below logic checks are as follows:
      //if the rook has moved from its starting position (meaning the flag has been updated, the piece returned by game.get() is no piece,
      //or if the piece returned is not a rook)
      
      //TODO: if opponent rook takes the rook, how does that flow through this gate? may need a color indicator as well
      if (kingsideRookMovedFromStart.current || kingsideRook === false || kingsideRook.type !== 'r') {
        castlingRights.k = false;
        kingsideRookMovedFromStart.current = true;
      } else {
        let clearKingsidePath = isCastlingPathClear(attackingColor, castlingPaths[1], false);
        castlingRights.k = clearKingsidePath;
      }

      if (queensideRookMovedFromStart.current || queensideRook.type === false || queensideRook.type !== 'r') {
        castlingRights.q = false;
        queensideRookMovedFromStart.current = true;
      } else {
        let clearQueensidePath = isCastlingPathClear(attackingColor, castlingPaths[0], true);
        castlingRights.q = clearQueensidePath;
      }

    }
    console.log(castlingRights);
  
    //need to recreate castling buttons to have  updated knowledge about current castling rights
    //TODO: fix bugs with castling buttons OR implement some instructions section explaining how app works
    // reInitCastlingButtons(castlingRights.q, castlingRights.k);
    game.setCastlingRights(playerColor.current, castlingRights);
  }

  // function reInitCastlingButtons(queensideFlag, kingsideFlag) {
  //   console.log("updating castling buttons based on state after current turn");
  //   let castlingButtonsNew = [];
  //   castlingButtonsNew.push(
  //     <div className='castling-buttons'>
  //       <ReactButton id="castle-button" onClick={doCastle(true)} disabled={queensideFlag} label="Queenside Castle" variant='outlined' />
  //       <ReactButton id="castle-button" onClick={doCastle(false)} disabled={kingsideFlag} label="Kingside Castle" variant='outlined' />
  //     </div>);
  //   setCastlingButtons(castlingButtonsNew);
  // }


  function isCastlingPathClear(opposingColor, path) {
    console.log("Checking path:");
    console.log(path);
    let clearPath = true;
    let playerColorIndex = getPlayerColorIndex();
    for (let square of path) {

      console.log("Square " + square);
      //need to shore up logic for attacking detection, think this is wrong anyway
      console.log("Piece on Square " + JSON.stringify(game.get(square)));
      console.log(square + " is false?");
      console.log(game.get(square));
      console.log(square + " is attacked?");
      console.log(game.isAttacked(square, opposingColor));

      //TODO: correct for queenside logic, where there can be a square under attack (b1, b8)
      if (game.get(square)) {
        //if the square is occupied, we cannot castle
        clearPath = false;
        console.log("breaking, no castle");
        break;
      } else if (square !== queensideAttackableCastlingSquare[playerColorIndex] && game.isAttacked(square, opposingColor)) {
        //if the square is being attacked AND is a square that the king has to cross in order for the castle to occur,
        //we also cannot castle

        clearPath = false;
        console.log("breaking, no castle");
        break;
      }

    }
    return clearPath;
  }

  function createChessGameObject(isGameLive) {

    let currentTurn = game.fen().split(" ")[1];

    let jsonObject = {
      "ID": boardId.current,
      "PGN": game.pgn(),
      "CurrentTurn": currentTurn,
      "IsGameLive": isGameLive
    }
    return jsonObject;
  }

  function isDraggablePiece(piece) {
    return piece.piece[0] === playerColor.current[0];
  }

  function onPieceDragBegin(piece, sourceSquare) {
    console.log("Current Game State: " + game.fen());
  }

  function closeInformationModal() {
    setShowInfoModal(false);
  }

  function closeTextInputModal() {
    setShowJoinGameModal(false);
    setShowSpectateGameModal(false);
  }

  function promptUserToJoin() {
    setShowJoinGameModal(true);
  }

  function promptUserToSpectate() {
    isSpectating.current = true;
    setShowSpectateGameModal(true);
  }

  function retreiveTextInput(submittedBoardId) {
    closeTextInputModal();
    boardId.current = submittedBoardId;
    if (isSpectating.current) {
      setPlayerPromptText("Spectator Mode");
      spectateGame(submittedBoardId);
    } else {
      setPlayerPromptText("Waiting for opponent...");
      joinGame(submittedBoardId);
    }
  }


  return (
    <div className='react-chessboard'>


      <div className="game-area">
      <h2>React Chess</h2>
        <Chessboard id="myBoard" position={gamePosition} onPieceDragBegin={onPieceDragBegin} onPieceDrop={attemptMovePiece} boardWidth="400" autoPromoteToQueen={true}
          arePiecesDraggable={dragEnabled} boardOrientation={boardPosition} isDraggablePiece={isDraggablePiece} />
        <p>
          {playerPromptText}
        </p>
      </div>
      <div className='button-container'>
        {castlingButtons.map((cmp, i) => {
          return (cmp);
        })
        }
        {inGameButtons.map((cmp, i) => {
          return (cmp);
        })}
      </div>
      <div className='modal-container'>
        <InformationModal id="info-modal" isOpen={showInfoModal} modalText={infoModalText} closeAction={closeInformationModal} />
        <NumberInputModal id="join-game-modal" isOpen={showJoinGameModal} inputLabel={joinGameModalText.current} declineAction={closeTextInputModal}
          declineLabel='Cancel' acceptAction={retreiveTextInput} acceptLabel='Submit' />
        <NumberInputModal id="spectate-game-modal" isOpen={showSpectateGameModal} inputLabel={spectateGameModalText.current} declineAction={closeTextInputModal}
          declineLabel='Cancel' acceptAction={retreiveTextInput} acceptLabel='Submit' />
      </div>
    </div>
  );

};
