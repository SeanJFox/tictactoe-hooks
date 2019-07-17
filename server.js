const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const port = process.env.PORT || 4001;
const winner = require('./gameCode.js');
const app = express();

app.use(express.static(`${__dirname}`));

const path = require('path')

const server = http.createServer(app);
const io = socketIo(server); 

let queuing = [];
let games = {};
let gameIDs = {};
let ips = {};
let interva = null;

class game {
	constructor(player1ID, player2ID, gameLayout) {
		this.player1 = {ID: player1ID, character: 'o'};
		this.player2 = {ID: player2ID, character: 'x'};
		this.gameLayout = gameLayout;
		this.turn = player1ID;
		this.moves = 0;
	};
};

const getGameID = (player) => gameIDs[player];
const getGame = (player) => games[getGameID(player)];
const getMyCharacter = (player) => {
	let game = getGame(player);
	if (game.player1.ID === player) return game.player1.character;
	if (game.player2.ID === player) return game.player2.character;
};
const getOpponentID = (player) => {
	let game = getGame(player);
	return game.player1.ID === player ? game.player2.ID : game.player1.ID;
};

const findGame = (s, f) => {
	let player1 = s.id;
	if (f) queuing.push(player1);
	if (queuing.length > 1) {		
		queuing.pop();
		let player2 = queuing.pop();
		let gameID = (Math.random()+1).toString(36).slice(2, 18);
		games[gameID] = new game (player1, player2, new Array(9).fill(''));
		gameIDs[player1] = gameID;
		gameIDs[player2] = gameID;
		s.emit('foundGame', {character: games[gameID].player1.character, turn: true});
	} else
	if (queuing.length === 0) {
		clearInterval(interva);
		s.emit('foundGame', {character: getMyCharacter(player1), turn: false});
	} else
	{	
		s.emit('waiting');
		if (f) interva = setInterval(() => findGame(s, false), 500);
	};
};

io.on("connection", socket => {
	socket.emit('connection');

	socket.on("disconnect", () => {
		let player = socket.id;
		let gameID = gameIDs[player];
		let game = games[gameID];

		delete ips[socket.request.connection.remoteAddress];

		if (game) {
			let opponent = getOpponentID(player);

			if (opponent) try {
				io.sockets.connected[opponent].emit('gameFinished', {result: 'opponent-disconnected', pattern: []});
			} catch (err) {
				console.log(err);
			}

			socket.emit('gameFinished', {result: 'disconnect'});

			delete games[gameID];
			delete gameIDs[player];
			delete gameIDs[opponent];
		};

	});

	socket.on('findGame', () => {
		findGame(socket, true);
	});

	socket.on('makeMove', (data) => {
		let player, gameID, game, arr, opponent;
		try {
			player = socket.id;
			gameID = gameIDs[player];
			game = games[gameID];
			arr = game.gameLayout;
			opponent = getOpponentID(player);
		} catch (err) {
			console.log(err);
			try {
				delete games[gameID];
				delete gameIDs[player];
				delete gameIDs[opponent];		
			} catch (err) {
				console.log(err);
			}
			return;
		};

		if (arr[data] !== '') {
			socket.emit('update', {layout:arr,turn:true,badMove:true});
			return;
		};

		arr[data] = getMyCharacter(player);
		game.moves++;

		io.sockets.connected[opponent].emit('update', {layout:arr, turn:true});
		socket.emit('update', {layout:arr, turn:false});

		let results = judge(arr);

		let win = (results.result === 'win');

		if (win) {
			let winningPattern = results.pattern;
			console.log('sending gameFinished to', socket.id);
			socket.emit('gameFinished', {result: 'winner', pattern: winningPattern});
			console.log('sending gameFinished to', io.sockets.connected[opponent].id);			
			io.sockets.connected[opponent].emit('gameFinished', {result: 'looser', pattern: winningPattern});
			delete games[gameID];
			delete gameIDs[player];
			delete gameIDs[opponent];
		} else if (game.moves === 9) {
			socket.emit('gameFinished', {result: 'draw'});
			io.sockets.connected[opponent].emit('gameFinished', {result: 'draw'});		
			delete games[gameID];
			delete gameIDs[player];
			delete gameIDs[opponent];
		}

	});

	socket.on('lobbyPlease', () => {
		socket.emit('goLobby');
	});

});

server.listen(port, () => {
	io.emit('serverReset');
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '/index.html')));