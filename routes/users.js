var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var User = require(__dirname + '/../models/User');

/* GET users listing. */
router.get('/', function(req, res) {
	User.find(function(err, users) {
		res.send(users);
	}); 
});

module.exports = router;
