var board,
        game = new Chess();

// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function (source, piece, position, orientation) {
    if (game.in_checkmate() === true || game.in_draw() === true ||
            piece.search(/^b/) !== -1) {
        return false;
    }
};

var makeRandomMove = function () {
    if (game.turn() == 'b') {
        var possibleMoves = game.moves();

        // game over
        if (possibleMoves.length === 0)
            return;

        var randomIndex = Math.floor(Math.random() * possibleMoves.length);
        move = game.move(possibleMoves[randomIndex]);
        board.position(game.fen());
        websocket.send("send /dev/ttyACM0 " + JSON.stringify(move) + '\n');
    }
};

var onDrop = function (source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null)
        return 'snapback';

    // make random legal move for black
    window.setTimeout(makeRandomMove, 250);
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function () {
    board.position(game.fen());
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: baseUrl + '/js/chessboardjs/www/img/chesspieces/alpha/{piece}.png',
};
board = ChessBoard('board', cfg);

function parseCoordenate(coordenate) {
    var parsed = String.fromCharCode(parseInt(coordenate.charAt(0)) + 96) + coordenate.charAt(1);
    return parsed || "";
}

var movePiece = function (from, to) {
    var algebraicNotationCoordinateFrom = parseCoordenate(from);
    var algebraicNotationCoordinateTo = parseCoordenate(to);
    var move = game.move({
        from: algebraicNotationCoordinateFrom,
        to: algebraicNotationCoordinateTo,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });
    // illegal move
    if (move === null)
        return 'snapback';

    board.move(algebraicNotationCoordinateFrom.concat('-').concat(algebraicNotationCoordinateTo));
    websocket.send("send /dev/ttyACM0 " + JSON.stringify(move));
    // make random legal move for black
    window.setTimeout(makeRandomMove, 250);
};

var newGame = function () {
    game.reset();
    board.start();
};

var undo = function (numberOfMoviments) {
    if (numberOfMoviments === undefined) {
        numberOfMoviments = 1;
    }
    numberOfMoviments = convertNumberInWordsToNumeral(numberOfMoviments);
    var successful = null;
    for (var times = 0; times < numberOfMoviments; times++) {
        successful = game.undo();
        board.position(game.fen());
        if (successful === null)
            break;
    }
    makeRandomMove();
};

var disconnectArduino = function(){
    websocket.send('close /dev/ttyACM0');
};
var connectArduino = function(){
    websocket.send('open /dev/ttyACM0 9600');
};

var convertNumberInWordsToNumeral = function (number) {
    switch (number) {
        case 'um':
            return 1;
            break;
        case 'dois':
            return 2;
            break;
        case 'três':
            return 3;
            break;
        case 'quatro':
            return 4;
            break;
        case 'cinco':
            return 5;
            break;
        case 'seis':
            return 6;
            break;
        case 'sete':
            return 7;
            break;
        case 'oito':
            return 8;
            break;
        case 'nove':
            return 9;
            break;
        case 'dez':
            return 10;
            break;
        default :
            return number;
    }

};

// SpeechRecognition Library
if (annyang) {
    // Let's define a command.
    var commands = {
        '(mover de) :coordenada1 para :coordenada2': movePiece,
        'novo jogo': newGame,
        'desfazer': undo,
        'desfazer :n movimentos': undo,
        'fechar (a) porta': disconnectArduino,
        'abrir (a) porta': connectArduino
    };

    annyang.addCommands(commands);
    annyang.setLanguage('pt-BR');
    annyang.debug();
    annyang.start();
}

var websocket = new WebSocket('ws://192.168.1.34:8989/ws');
websocket.onopen = function (event) {
    websocket.send("open /dev/ttyACM0 9600");
};
websocket.onerror = function (e) {
    console.log('Error with WebSocket uid: ' + e.target.uid);
};
websocket.onmessage = function (e) {
    console.log(e.data);
}