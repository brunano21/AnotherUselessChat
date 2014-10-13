window.onload = function() {

    var chatLog = [];
    var socket = io.connect('http://localhost:3000');
    var field = $("#field");
    var sendButton = $("#send");
    var content = $("#content");
    var signInBtn = $("#signInBtn");

    socket.on('message', function (data) {
        if(data.message) {
            chatLog.push(data.message);
            var chatMsg = '';
            for(var i=0; i<chatLog.length; i++) {
                chatMsg += chatLog[i] + '<br />';
            }
            content.innerHTML = chatMsg;
            console.log("il payload e'"+data.message);
        } else {
            console.log("There is a problem:", data);
        }
    });

    sendButton.onclick = function() {
        var text = field.value;
        socket.emit('sendMsg', { message: text });
        console.log(text);
    };

    // momentanea
    //$("#signInModal").modal('toggle');
    /*$("#signUpBtn").onclick = function() {
        ('toggle');
    }*/
}
