var express = require('express');
var router = express.Router();

router.post('/', function(req, res) {
	console.log("PATH FILE: " + req.param("file_path"));
	var file = './tmp_files/' + req.param("file_path");
	console.log("FILE: " + file);
	res.download(file); // Set disposition and send it.
});

module.exports = router;