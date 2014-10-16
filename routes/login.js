var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');

var User = require(__dirname + '/../models/User')

router.post('/', function(req, res) {
	console.log("Richiesta di login: " + req.body);

	var jwtSecret = 'AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow';
		
	User.findOne({email: req.body.email}, function(err, result) {
		if(err) console.log(err);
		console.log(result);
		
		if(result == null) {
			console.log("user NOT present into db");
			res.json({status :'KO'});
		} else {
			console.log("user present into db!");
    		console.log("checking for password!");
			// check password
			console.log("Passing to compare(): " + req.body.password + " & " + result.password);
			
    		bcrypt.compare(req.body.password, result.password, function(err, match) {
			    if(err) console.log(err);
			    if(match) {
				    // res == true --> passwords matching! So,
	    			// we are sending the profile in the token
		    		console.log("Password Matching!");
		    		var profile = {
		    			username: result.username,
		    			email: result.email
		    		};
	    			console.log(profile);
		  			var token = jwt.sign(profile, jwtSecret, { expiresInMinutes: 60*5 });
					res.json({status :'OK', username: result.username, token: token}); 
				} else {
					console.log("wrong pwd");
					res.json({status :'KO'});
				}
			});
    	}
	});

});

module.exports = router;