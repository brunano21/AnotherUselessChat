var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');

router.post('/', function(req, res) {
	console.log("Richiesta di login");
	console.log(req.body.username);
	console.log(req.body.password);
	
	var jwtSecret = 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';
	var profile = {
    	username: req.body.username,
    	email: req.body.username
    };
    
	
	mongoose.model('users').count({username: req.body.username, password: req.body.password}, function(err, count) {
		console.log(count);
		
		if(count) {
			console.log("user present into db!");
    		// we are sending the profile in the token
  			var token = jwt.sign(profile, jwtSecret, { expiresInMinutes: 60*5 });
			res.json({status :'OK', username : req.body.username, token: token}); 
		} else {
			console.log("user NOT present into db");
			res.json({status :'KO'}); 
		}
	});

});

module.exports = router;