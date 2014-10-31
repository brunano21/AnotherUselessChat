
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var util = require('util');
var fs = require('fs');

var ss = require('socket.io-stream');

var socketioJwt = require('socketio-jwt');
var jwtSecret = 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';

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


// load all files in model dir (for MongoDB)
/*fs.readdirSync(__dirname + '/models').forEach(function(filename) {
    if(~filename.indexOf('.js'))
        require(__dirname + '/models/' + filename); 
});
*/
var debug = require('debug')('generated-express-app');
app.set('port', process.env.PORT || 3000);

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
    
    var client = new Client(socket.id, socket.client.request.decoded_token.username);

    // saving new client into the clients map
    clients[socket.id] = client;
    
    // send back its data!
    socket.emit('message', { type: "user_authenticated", payload : client });
    
    console.log("#clients: " + Object.keys(clients).length);
    io.sockets.emit('message', {type: 'user_list', payload: buildUserList() });


    socket.on('sendMsg', function (data) {
        io.sockets.emit('message', {type: 'new_message', payload: data});
        console.log("### New Message ###");
        console.log(data);
    });

    // coming from the file sender.
    socket.on('file_transfer_request', function (data) {
        console.log("### File Transfer Request ###");
        console.log("# filename: " + data.filename);
        console.log("# filesize: " + data.filesize);
        console.log("# sender: " + socket.id + " - username: " + clients[socket.id].username);
        for(var index in data.receivers)
            console.log("# receiver: " + data.receivers[index] + " - username: " + clients[data.receivers[index]].username);
        
        io.to(data.receivers[index]).emit("message", {
            type: "file_transfer_notification", 
            payload: { 
                sender_id: socket.id, 
                sender_username: clients[socket.id].username, 
                filename: data.filename, 
                filesize: data.filesize 
            }
        });
    });

    // coming from the possible receiver.
    socket.on('file_transfer_response', function (data) {
        console.log("### File Transfer Response ###");
        console.log("# receiver: " + socket.id + " - username: " + clients[socket.id].username);
        console.log("# filename: " + data.filename);
        console.log("# filesize: " + data.filesize);
        console.log("# accepted: " + data.accepted);
        console.log("# peer_client_id: " + data.peer_client_id);
        console.log("# request'sender : " +  data.sender_id + " - username: " + clients[data.sender_id].username);
        
        if(data.accepted) {
            // file transfer accepted -> send ack to the file sender.
            io.to(data.sender_id).emit("message", {type: "file_transfer_accepted", payload: { receiver_id: data.peer_client_id }});
        }
        else {
            // 
            io.to(data.sender_id).emit("message", {type: "file_transfer_cancelled", payload: {}});

        }
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
    this.peer_client_id = makeid();
}

function buildUserList() {
    var user_list = {};
    for(var index in clients)
        user_list[index] = clients[index].username;
    return user_list;
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 12; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}