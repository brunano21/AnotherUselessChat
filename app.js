
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var mongoose = require('mongoose');
var util = require('util');

var socketioJwt = require('socketio-jwt');
var jwtSecret = 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';

var mongodb_address = 'mongodb://localhost/chatlan';

var routes = require('./routes/index');
var users = require('./routes/users');
var login = require('./routes/login');

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
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname + '/public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/', routes);
app.use('/users', users);
app.use('/login', login);

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
fs.readdirSync(__dirname + '/models').forEach(function(filename) {
    if(~filename.indexOf('.js'))
        require(__dirname + '/models/' + filename); 
});

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

io.sockets.on('connection', function (socket) {
    console.log(socket.client.request.decoded_token.first_name, 'connected');

    console.log("New Socket/Client Id = " + socket.id);
    socket.emit('message', {clientId: socket.id });
    
    socket.on('sendMsg', function (data) {
        io.sockets.emit('message', data);
        console.log(data);
    });

    socket.on('disconnect', function() {
        //console.log(util.inspect(socket, false, null));
        console.log("user disconnected");
    });
    
    console.log("socket.io initialized!");
});