var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('chat', { title: 'txtbox' });
});

router.get('/login', function(req, res) {
  res.render('login', { title: 'Login' });
});

router.get('/chat', function(req, res) {
  res.render('chat', { title: 'txtbox' });
});

module.exports = router;
