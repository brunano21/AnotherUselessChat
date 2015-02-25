
var express     = require('express');
var path        = require('path');
var favicon     = require('serve-favicon');
var logger      = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser  = require('body-parser');
var fs          = require('fs');
var mongoose    = require('mongoose');
var util        = require('util');
var socketioJwt = require('socketio-jwt');

// secret for socketioJwt - json web token
var jwtSecret = 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';


// FOR HTTPS SERVER
/*
var https = require('https');
var options = {
    key: fs.readFileSync('test/keys/key.pem'),
    cert: fs.readFileSync('test/keys/key-cert.pem')
};
*/

var mongodb_address = 'mongodb://localhost/chatlan';

var app = module.exports = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(require('stylus').middleware(path.join(__dirname, 'public')));
//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/tmp_files'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

app.use('/',            require('./routes/index'));
app.use('/users',       require('./routes/users'));
app.use('/login',       require('./routes/login'));
app.use('/register',    require('./routes/register'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    //app.use(express.errorHandler());

    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
    // connecting to mongoDB
    mongoose.connect(mongodb_address);
}

// production error handler 
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var debug = require('debug')('generated-express-app');
app.set('port', process.env.PORT || 3000);

//var server = https.createServer(options, app).listen(443);

var server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
});


var io = require('socket.io').listen(server);

// authorization through socketioJwt
io.set('authorization', socketioJwt.authorize({
    secret: jwtSecret,
    handshake: true
}));



// connected clients map
var clients = {};

io.sockets.on('connection', function (socket) {
    console.log('User \"' + socket.client.request.decoded_token.username + '\" connected!');
    console.log("New Socket/Client Id = " + socket.id);
    //console.log("TOKEN : " + util.inspect(socket.client.request._query.token));
    var client = new Client(socket.id, socket.client.request.decoded_token.username);

    // saving new client into the clients map
    clients[socket.id] = client;
    
    // send back its data!
    socket.emit('message', { type: "user_authenticated", payload: client });
    
    console.log("#clients: " + Object.keys(clients).length);
    io.sockets.emit('message', {type: 'user_list', payload: buildUserList() });


    socket.on('sendMsg', function (data) {
        io.sockets.emit('message', {type: 'new_message', payload: data});
        console.log("### New Message ###");
        console.log(data);
    });

    // coming from the file sender.
    socket.on('peer_receiver_ids_request', function (data) {
        console.log("### File Transfer Request ###");
        console.log("# file sender: " + socket.id + " - username: " + clients[socket.id].username);
        //console.log("# filename: " + data.filename);
        //console.log("# filesize: " + data.filesize);
        var peer_receiver_ids = {};
        for(var index in data.receivers) {
            console.log("# file receiver: " + data.receivers[index] + " - username: " + clients[data.receivers[index]].username);
            console.log(index, data.receivers[index], clients[data.receivers[index]].peer_client_id);
            peer_receiver_ids[data.receivers[index]] = clients[data.receivers[index]].peer_client_id;
        }

        socket.emit('message', {
            type: 'peer_receiver_ids_response', 
            payload: {
                peer_receiver_ids: peer_receiver_ids,
                file_id: data.file_id
            }
        });
        
    });

    socket.on('disconnect', function() {
        console.log("user disconnected");
        delete clients[socket.id];
        console.log("#clients: " + Object.keys(clients).length);
        io.sockets.emit('message', {type: 'user_list', payload: buildUserList()});
    });
    
    console.log("socket.io initialized!");
});


/*************************
 *  UTILITY FUNCTIONS    *
 *************************/

function Client(s, u) {
    this.socket_id = s;
    this.username = u;
    this.peer_client_id = peerIdGenerator();
}

function buildUserList() {
    var user_list = {};
    for(var index in clients)
        user_list[index] = clients[index].username;
    return user_list;
}

function peerIdGenerator() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 12; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

// comment for test!