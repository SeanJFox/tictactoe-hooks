import React, { useState, useEffect } from 'react';
import './App.css';
import GameGrid from './Components/GameGrid/GameGrid.js';
import Lobby from './Components/Lobby/Lobby.js';
import socketIOClient from 'socket.io-client';

const socket = socketIOClient('localhost:4001');

const App = () => {

	const paths = {
		waiting: 'waiting',
		lobby: 'lobby',
		inGame: 'inGame',
		gameOver: 'gameOver'
	}

	const newGame = () => {
		return {
			active: false,
			layout: new Array(9).fill(''),
			turn: false,
			character: '',
			result: {
				state: '',
				pattern: [],
			},
		}
	};

	let gameObj = newGame();
	const [game, setGame] = useState(gameObj);
	const [path, setPath] = useState(paths.lobby);

	const gameReset = () => {
		gameObj = newGame();
		setGame(gameObj);
		setPath('lobby');
	};

	useEffect(() => {
		document.title = 'Tic Tac Toe';
		if (socket.id) {
			socket.on('waiting', () => {
				if (path !== paths.waiting) setPath('waiting');
			});

			socket.on('foundGame', (data) => {
				gameObj.character = data.character;
				gameObj.turn = data.turn;
				gameObj.active = true;
				setGame(gameObj);
				setPath('inGame');
			});

			socket.on('update', (data) => {
				if (data.badMove) return;
				gameObj.turn = data.turn;
				gameObj.layout = Array.from(data.layout);
				setGame(gameObj);
			});

			socket.on('gameFinished', (data) => {
				setPath('gameOver');
				gameObj.turn = false;
				gameObj.result.state = data.result;
				gameObj.result.pattern = Array.from(data.pattern);
				setGame(gameObj);
			});

			socket.on('goLobby', () => {
				gameReset();
				setPath('lobby');
			});

			socket.on('serverReset', () => {
				alert('Server Reset. Returning To Lobby');
				gameReset();
			})

			socket.on('disconnect', () => {
				gameReset();
			});
		};

	}, [socket.id]);

	const makeMove = (e) => {
		let position = e.target.id;
		if (game.turn && game.layout[position] === '')  //
			socket.emit('makeMove', position);
	};

	const returnToLobby = () => {
		socket.emit('lobbyPlease');
	};

	const findGameClick = () => {
		socket.emit('findGame');
		setPath('waiting');
	};

	const waiting = (path === paths.waiting);

	return (
			<div>
				{
					(path === paths.lobby || path === paths.waiting) ? 
						<Lobby waiting={waiting} onFindGameClick={findGameClick}/> 
					: 
						<GameGrid game={game} path={path} makeMove={makeMove} returnToLobby={returnToLobby}/>
				}
			</div>
	)

};

export default App;