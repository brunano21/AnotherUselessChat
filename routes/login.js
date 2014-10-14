var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

router.post('/', function(req, res) {
	console.log("Richiesta di login");
	console.log(req.body.username);
	console.log(req.body.password);
	mongoose.model('users').count({username: req.body.username, password: req.body.password}, function(err, count) {
		console.log(count);
		
		if(count) {
			console.log("user present into db!");
			res.json({status :'OK', username : req.body.username}); 
		} else {
			console.log("user NOT present into db");
			res.json({status :'KO'}); 
		}
	});

});

module.exports = router;