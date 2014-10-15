window.onload = function() {

    var server_address = 'http://192.168.0.8:3000';

    var chatLog = [];
    var socket; //= io.connect(server_address);
    var inputText = $("#inputText");
    var sendBtn = $("#sendBtn");
    var content = $("#content");
    var signInBtn = $("#signInBtn");
    var dataSignInSendBtn = $("#dataSignInSendBtn");
    var clientId = null;

    function connect_socket (token) {
        var socket = io.connect(server_address, {
            query: 'token=' + token
        });

        socket.on('connect', function () {
            console.log('authenticated');
        });

        socket.on('disconnect', function () {
            console.log('disconnected');
        });

        socket.on('message', function (data) {
            if(data.message) {
                chatLog.push(data.message);
                console.log("il payload e'"+data.message);

                if(data.id == clientId)
                    $("#chat-container > ul").append(
                        '<li>' +
                            '<div class="bubble2">' +
                              '<span class="personName2"> '+ 'Nick' + '<span>' +
                              '<span class="personSay2"> '+ data.message + '<span>' +
                              '<span class="time2 round"> '+ '12.55 AM' + '<span>' +
                        '</li>');
                else
                    $("#chat-container > ul").append(
                        '<li>' +
                            '<div class="bubble">' +
                              '<span class="personName"> '+ 'Nick' + '<span>' +
                              '<span class="personSay"> '+ data.message + '<span>' +
                              '<span class="time round"> '+ '12.55 AM' + '<span>' +
                        '</li>');
                $("#chat-container").animate({scrollTop: $("#chat-container")[0].scrollHeight}, 600);


            } else if(data.clientId) {
                clientId = data.clientId;
            }
            else {
                console.log("There is a problem: ", data);
            }
        });
    }

   

    sendBtn.on('click', function(event) {
        event.preventDefault();
        var text = inputText.val();

        socket.emit('sendMsg', { message: text, id: clientId });
        console.log(text);



    });

    dataSignInSendBtn.on('click', function(event) {
        event.preventDefault();

        var formData = $("#dataInput :input").serializeArray();
        $.ajax({
            url : server_address + '/login',
            type: "post",
            async: false,
            data : formData,

            success: function(data, textStatus, jqXHR) {
                if(data.status == 'OK') {
                    console.log('user logged!');
                    $("#loginNavBar > li:first-child").text($("#loginNavBar > li:first-child").text() + data.username);
                    $("#loginNavBar > li:last-child").hide();
                    $("#loginNavBar > li:not(:last-child)").show();
                    $("#signInModal").modal('toggle')
                    connect_socket(data.token);

                } else {
                    console.log('user NOT logged!')
                    // TODO: poco elegante, I know!
                    $("#dataInput .alert").remove();
                    $("#dataInput").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> User not found, please check your credentials.</div>');
                    $("#dataInput .alert").show();
                }
            },

            error: function (jqXHR, textStatus, errorThrown) {
                console.log('Ops, server error communication!');
            }
        });
    });

}
