var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema({
	usernname : String,
	password : String,
	email: String;

});


mongoose.model('users', usersSchema);