var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var User = require(__dirname + '/../models/User')

router.post('/', function (req, res) {
	console.log("Richiesta di registrazione");
	console.log(req.body.username);
	console.log(req.body.password);
	console.log(req.body.password2);
	console.log(req.body.email);

	
	User.count({email: req.body.email}, function(err, count) {
		if (err)
			console.log(err);
		
		console.log("email: " + req.body.email + " - Found: " + count);
		
		if(count) {
			console.log("Email gia presente nel sistema");
			res.json({status :'KO', error: "Email already registered. Use another one."}); 
		} else {
				console.log("Email non presente nel sistema");

				bcrypt.genSalt(10, function(err, salt) {
				    bcrypt.hash(req.body.password, salt, function(err, hash) {
		        		console.log("password_hash: " + hash);
				        // Store hash in your password DB.
						var user = new User({username: req.body.username, password: hash, email: req.body.email});
						user.save(function(error, data){
					        console.log(data);
						    if(error) {
						        res.json(error); 
						        console.log(error);
						    }
						    else
								res.json({status :'OK', }); 
						});  //end user.save()			
		   			}); // end bcrypt.hash
				}); //end bcrypt.genSalt()
		} //end else
	});


});

module.exports = router;