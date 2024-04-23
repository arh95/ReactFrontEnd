
import { Chessboard } from 'react-chessboard';
import React, { useState, useRef } from 'react';
import InformationModal from './modals/informationModal.js';
import ReactButton from './reactButton.js';
import { poll } from '../service/pollService.js';
import './reactChessboard.css';
import NumberInputModal from './modals/numberInputModal.js';
const { Chess } = require('chess.js');


//todo

//figure out how to use game.move, how to check provided values on a move
//investigate further onmove properties
//plan out front end rest calls

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

  //considering time constraints, figured a janky 'environment driven property' is better than  nothing
  function getServerPath() {
    let serverPath = ""
    if (window.location.href.includes('localhost')) {
      serverPath = "http://localhost";
    }
    else {
      //due to not having an available domain to attach to my AWS load balancer, 
      //i was unable to set up SSL for secure resource access. NExt best thing for the purposes of 
      //this demo project was to deploy the react app on heroku which allows ssl to be disabled and allows us to access the golang
      //server running on aws ec2 directly
      serverPath = "http://ec2-18-224-251-47.us-east-2.compute.amazonaws.com";
    }
    serverPath = serverPath + ":8080";
    return serverPath;

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
      console.log(data);
      if (data.IsGameLive) {
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
    else if (response.status === 409)
    {
      setInfoModalText(data);
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
      console.log(data);
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
    isSpectating.current = false;
    updateControlButtonVisibility(false);
    setEndSpectateButtonVisible(false);
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
        console.log("Game ended successfully")
        setInfoModalText(data.EndingPlayer === playerColor.current ? currentPlayerEndedText.current : otherPlayedEndedText.current);
        setShowInfoModal(true);
        handleBoardReset();
      })
      .catch((err) => {
        console.log(err.message);
      });
  }

  function endSpectate()
  {
    setEndSpectateButtonVisible(false);
    isSpectating.current = false;
    handleBoardReset();
  }

  function quitGame() {
    sendEndGameRequest(true);
  }
  function endGame() {
    //todo: call from within some handler function attached to the chessboard to evaluate if checkmate/statelmate/game end has been reached
    sendEndGameRequest(false);
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
      console.log(response);

      if (!response instanceof String && !response.IsGameLive)
      {
        //while polling for opponent, call updateBoardSTate if the game has been ended to alert the current player as to why the game has ended
        updateBoardState(response.PGN);
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

      console.log("Waiting for next move...");
      //only ever want to update the board state IFF
      //the game record has not yet been deleted, the game is still currently live, AND the current user is still spectating
      if (response !== "Game Not Found" && response.IsGameLive && isSpectating.current) {
        updateBoardState(response.PGN);
      }
      else {

        if (response === "Game Not Found") {
          setInfoModalText(gameToJoinDoesNotExist.current)
        }
        else if (!response.IsGameLive) {
          setInfoModalText(gameToSpectateHasEnded.current);
        }
        if (isSpectating.current)
        {
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
  function onPieceDrop(sourceSquare, targetSquare, piece) {

    console.log("Current Piece: " + piece);
    const move = {
      from: sourceSquare, to: targetSquare
    };
    const moves = game.moves();
    console.log(moves);

    try {
      console.log("fen before move:" + game.fen())
      var attemptedMove = game.move(move);
      if (attemptedMove !== null) {
        setGamePosition(game.fen());
        setGame(game);
        if (game.isGameOver())
        {
          if (game.isCheckmate())
          {
            setInfoModalText("You have won!");
            setShowInfoModal(true);
          } else 
          {
            handleGameOver(game);
          }
        }
        console.log("fen after move: " + game.fen());
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
  
    if (gameCopy.isGameOver()) {
      handleGameOver(gameCopy);
      //because we can't rely on 
    } else if (gameCopy.isCheck() && gameCopy.turn() === playerColor[0]) {
      setInfoModalText("You are in check");
      setShowInfoModal(true);
    }
  }

  //known bug: inconsisent cache clearing on different game end situations can make 


  //alerts the player who is receiving the turn to the reason the game has ended, 
  function handleGameOver(chessGame)
  {
  
      if (chessGame.isDraw())
      {
        let drawText = "The game has ended in a draw./n";
        if (chessGame.isInsufficientMaterial())
        {
          drawText += "Neither player has sufficient material to continue.";
        }
        else {
          drawText += "The 50 move rule has been exceeded";
        }
        setInfoModalText(drawText);
     
      }
      else if (chessGame.isStalemate())
      {
        setInfoModalText("This game has ended in a stalemate.");
      }
      else if (chessGame.isThreefoldRepetition())
      {
        setInfoModalText("This game has ended because this board position has been repeated too many times.");
      }
      else if (chessGame.isCheckmate())
      {
        setInfoModalText("You have lost. Checkmate");
      }
      setShowInfoModal(true);
  }

  async function handleFetchBoardStateResponse(response) {
    let data = await response.json();
    if (response.status === 200) {
      console.log(data);
      updateBoardState(data.PGN);
      if (!isSpectating.current) {
        handleBeginningOfTurn();
      }
    } else if (response.status === 404) {
      //in this method, a response of 404 indicates that the ID we are providing to the GET GET/live/:id endpoint
      //no longer exists in the database. Therefore, we can assume (Barring any malicious actors) that the game has been ended by the other user
      setInfoModalText(otherPlayedEndedText.current);
      //BUG: sometimes this poll response occurs before the endGame response, so the ending user is shown a message that the other
      //user has ended the game
      setShowInfoModal(true);
      handleBoardReset();
    }
    else if (response.status === 409)
    {
      setInfoModalText(data);
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
    setPlayerPromptText("It's your turn!");
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
    console.log(game.moves());
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
        <Chessboard id="myBoard" position={gamePosition} onPieceDragBegin={onPieceDragBegin} onPieceDrop={onPieceDrop} boardWidth="400"
          arePiecesDraggable={dragEnabled} boardOrientation={boardPosition} isDraggablePiece={isDraggablePiece} />
        <p>
          {playerPromptText}
        </p>
      </div>
      <div className='button-container'>
        <ReactButton id="new-game-button" visible={initGameButtonsVisible} onClick={beginGame} label="New Game" />
        <ReactButton id="join-game-button" visible={initGameButtonsVisible} onClick={promptUserToJoin} label="Join Game" />
        <ReactButton id="spectate-game-button" visible={initGameButtonsVisible} onClick={promptUserToSpectate} label="Spectate Game" />
        <ReactButton id="end-game-button" visible={endGameButtonVisible} onClick={quitGame} label="End Game" />
        <ReactButton id="end-game-button" visible={endSpectateButtonVisible} onClick={endSpectate} label="Leave Spectator Mode" />
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
