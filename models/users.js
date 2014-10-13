var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema({
	usernname : String,
	password : String
});


mongoose.model('users', usersSchema);