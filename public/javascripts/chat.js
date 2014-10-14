window.onload = function() {

    var chatLog = [];
    var socket = io.connect('http://localhost:3000');
    var inputText = $("#inputText");
    var sendBtn = $("#sendBtn");
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

    sendBtn.on('click', function() {
        var text = inputText.val();
        
        socket.emit('sendMsg', { message: text });
        /*TODO: bisogna capire se ha senso inviare il messaggio al server e quando questo mi risponde con un ack allora stampo il messaggio 
        oppure se lo attacco direttamente, cosi come viene fatto per ora. */
        console.log(text);
        
        $("#chat-container > ul").append(
        '<li>' +
            '<div class="bubble2">' +
              '<span class="personName2"> '+ 'Nick' + '<span>' +
              '<span class="personSay2"> '+ text + '<span>' +
              '<span class="time2 round"> '+ '12.55 AM' + '<span>' +
        '</li>');
        $("#chat-container").animate({scrollTop: $("#chat-container")[0].scrollHeight}, 600);
        
    });

    // momentanea
    //$("#signInModal").modal('toggle');
    /*$("#signUpBtn").onclick = function() {
        ('toggle');
    }*/


}
