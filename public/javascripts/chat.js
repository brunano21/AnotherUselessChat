window.onload = function() {

    //var server_address = 'http://br1srpi.crabdance.com:3000';
    var server_address = 'http://192.168.0.8:3000';
    //var server_address = 'http://localhost:3000';

    var socket;
    var $inputText = $("#inputText");
    var $sendBtn = $("#sendBtn");
    var $signUpBtn = $("#signUpBtn");
    var $sendDataSignInBtn = $("#sendDataSignInBtn");
    var $sendDataSignUpBtn = $("#sendDataSignUpBtn");
    var $sendFileBtn = $("#sendFileBtn");
    var $transferCancelBtn = $("#transferCancelBtn");
    var $transferAcceptBtn = $("#transferAcceptBtn");

    // user's info. 
    var client_id = null; // Note: client_id == socket.id
    var username = null;
    var peer_client_id = null;

    // temporary file transfer map    
    var transfer_file_map = {};

    var peer_file = require('peer-file');
    var peer = null; 

    /*************************
     *  UTILITY FUNCTIONS    *
     *************************/

    function bytesToSize(bytes) {
        if(bytes == 0) return '0 Byte';
        var k = 1000;
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
    }


    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 8; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    function peerSetup(peer_client_id) {
        peer = new Peer(peer_client_id, {key: 'wxhelisx5h2xogvi'});
        peer.on('connection', function(connection) {
            console.log("R: on connection");
            connection.on('open', function() {
                
                // Receive
                peer_file.receive(connection)
                  .on('incoming', function(file) {
                    console.log("R: incoming file: " + file.name + " (" + file.size + ")");
                    this.accept(file);
                  })
                  .on('progress', function(file, bytesReceived) {
                    
                    console.log("R: progress " + Math.ceil(bytesReceived / file.size * 100));
                  })
                  .on('complete', function(file) {
                    console.log("R: complete");
                    var blob = new Blob(file.data, { type: file.type });
                    saveAs(blob, file.name);
                  })
            });
        });
    }

    function sendFile(peer_receiver_id, file_id) {
        var connection = peer.connect(peer_receiver_id, { reliable:true });
        console.log("S: Connencting to " + peer_receiver_id);
        connection.on('open', function() {
            console.log("S: on open");
            peer_file.send(connection, transfer_file_map[file_id].file)
                .on('accept', function() {

                    <div class="progress">
  <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style="width: 45%">
    <span class="sr-only">45% Complete</span>
  </div>
</div>
                })
                .on('progress', function(bytesSent) {
                    // TODO: work on progress bar.
                    console.log("S:" + Math.ceil(bytesSent / transfer_file_map[file_id].file.size * 100));
                })
                .on('complete', function() {
                    // TODO: work on progress bar.
                    console.log("S: upload file completed");
                })
        });
    }

    /*************************
     *  SOCKET MANAGMENT     *
     *************************/

    function connect_socket (token) {
            socket = io.connect(server_address, {
            query: 'token=' + token
        });

        socket.on('connect', function () {
            console.log('authenticated');
        });

        socket.on('disconnect', function () {
            console.log('disconnected');
        });

        socket.on("error", function(error) {
            if (error.type == "UnauthorizedError" || error.code == "invalid_token") {
                // redirect user to login page perhaps?
                console.log("User's token has expired");
            }
        });
  
        socket.on('message', function (data) {
            console.log("MSG_TYPE: " + data.type);
            switch(data.type) {
                case 'user_authenticated': 
                    // saving user data.
                    client_id = data.payload.socket_id;
                    username = data.payload.username;
                    peer_client_id = data.payload.peer_client_id;
                    
                    console.log("clientPeerId: " + peer_client_id);
                    
                    // setup for receiver peer
                    peerSetup(peer_client_id);
                 
                    break;
                case 'new_message': 
                    if(data.payload.id == client_id) // if the sender is me!
                        $("#chat-container > ul").append(
                            '<li>' +
                                '<div class="bubble2">' +
                                  '<span class="personName2"> '+ data.payload.sender + '<span>' +
                                  '<span class="personSay2"> '+ data.payload.message + '<span>' +
                                  '<span class="time2 round"> '+ data.payload.time + '<span>' +
                            '</li>');
                    else
                        $("#chat-container > ul").append(
                            '<li>' +
                                '<div class="bubble">' +
                                  '<span class="personName"> '+ data.payload.sender + '<span>' +
                                  '<span class="personSay"> '+ data.payload.message + '<span>' +
                                  '<span class="time round"> '+ data.payload.time + '<span>' +
                            '</li>');
                    $("#chat-container").animate({scrollTop: $("#chat-container")[0].scrollHeight}, 600);
                    break;
                case 'user_list':
                    $("#user-container > ul").empty();
                    $("#user-picker").empty();
                    for(i in data.payload) {
                        $("#user-container > ul").append(
                            '<li>' +
                                '<h4>' +
                                    '<span class=\"label label-default\" id=\"' + i + '">' + data.payload[i] + '</span>' + 
                                '</h4>' +
                            '</li>'    
                        );
                    
                        if(client_id != i)  
                            $("#user-picker").append('<option value=\"' + i + '\">' + data.payload[i] + '</option>');
                        else
                            $("#user-picker").append('<option disabled value=\"' + i + '\">' + data.payload[i] + '</option>');
                    }

                    // refreshing select-picker
                    $('#user-picker').selectpicker('refresh');
                    break;
                case 'file_transfer_notification':
                    $("#file_sender_username").text("User " + data.payload.file_sender_username + " is sending you a file. Accept?");
                    $("#file_sender_id").text(data.payload.file_sender_id);
                    $("#file_id").text(data.payload.file_id);
                    $("#filename").text(data.payload.filename);
                    $("#filesize").text(bytesToSize(data.payload.filesize));
                    $('.flip').find('.card').toggleClass('flipped');
                    break;
                case 'file_transfer_accepted':
                    // connect to the receiver peer 
                    sendFile(data.payload.peer_receiver_id, data.payload.file_id);
                break;

                case 'file_transfer_cancelled':
                    // TODO: work on cancelled transfer dialog.
                    break;
                default: 
                    console.log("Ops! There is a problem: ", data);
            }
        });
    }

    
    /*************************
     *   EVENT LISTENERS     *
     *************************/

    $sendBtn.on('click', function(event) {
        event.preventDefault();
        if($inputText.val() == "")
            return;

        var text = $inputText.val();
        var time = new Date();
        var ampm = time.getHours() < 12 ? "AM" : "PM";
        var timestamp = ("0" + time.getHours()).slice(-2) + ":" + ("0" + time.getMinutes()).slice(-2) + " " + ampm;
        
        socket.emit('sendMsg', { 
            id:         client_id, 
            sender:     username,
            message:    text, 
            time:       timestamp
        });

        //reset input text value
        $inputText.val("");
    });

    // listener for pressing Enter key
    $inputText.keydown(function (e){
        if(e.keyCode == '13'){
            $sendBtn.trigger('click');
        }
    })

    $sendDataSignInBtn.on('click', function(event) {
        event.preventDefault();

        if($("#signInUsername").val() == "" || $("#signInPassword").val() == "") { 
            console.log("campo vuoto");
            $("#signUpDataForm .alert").remove();
            $("#signUpDataForm").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> Fill all input fields.</div>');
            $("#signUpDataForm .alert").show();
            return;
        }

        var formData = $("#signInDataForm :input").serializeArray();
        $.ajax({
            url : server_address + '/login',
            type: "post",
            async: false,
            data : formData,

            success: function(data, textStatus, jqXHR) {
                if(data.status == 'OK') {
                    console.log('User logged!');
                    $("#loginNavBar > li:first-child > p").text($("#loginNavBar > li:first-child > p").text() + data.username);
                    $("#loginNavBar > li").toggle();
                    //$("#loginNavBar > li:last-child").hide();
                    //$("#loginNavBar > li:not(:last-child)").show();
                    $("#signInModal").modal('toggle')
                    connect_socket(data.token);

                } else {
                    console.log('User NOT logged!')
                    // TODO: poco elegante, I know!
                    $("#signInDataForm .alert").remove();
                    $("#signInDataForm").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> User not found, please check your credentials.</div>');
                    $("#signInDataForm .alert").show();
                }
            },

            error: function (jqXHR, textStatus, errorThrown) {
                console.log('Ops, server error communication!');
            }
        });
    });

    $signUpBtn.on('click', function(event) {
        event.preventDefault();
        $("#signInModal").modal('toggle');
    });

    $sendDataSignUpBtn.on('click', function(event) {
        event.preventDefault();
        
        if($("#signUpUsername").val() == "" || $("#signUpPassword").val() == "" || $("#signUpConfirmPassword").val() == "" || $("#signUpEmail").val() == "") { 
            console.log("campo vuoto");
            $("#signUpDataForm .alert").remove();
            $("#signUpDataForm").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> Fill all input fields.</div>');
            $("#signUpDataForm .alert").show();
            return;
        }
      
        if($("#signUpPassword").val() != $("#signUpConfirmPassword").val()) {
            console.log("password non uguali");
            $("#signUpDataForm .alert").remove();
            $("#signUpDataForm").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> Passwords do not match, please type again.</div>');
            $("#signUpDataForm .alert").show();
            return;
        }

        var formData = $("#signUpDataForm :input").serializeArray();
        $.ajax({
            url : server_address + '/register',
            type: "post",
            async: false,
            data : formData,

            success: function(data, textStatus, jqXHR) {
                console.log(data);
                
                if(data.status == 'OK') {
                    console.log('user registered!');
                    $("#signUpDataForm .alert").remove();
                    $("#signUpDataForm").prepend('<div class=\"alert alert-success alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>YEEAAH!1!</strong> You have been registered successfully.</div>');
                    $("#signUpDataForm .alert").show();
                    $sendDataSignUpBtn.unbind('click');

                    setTimeout(function() {
                        if($("#signUpModal").is(":visible")) {
                            $("#signUpModal").remove();
                            $("#signInModal").modal('toggle')
                        }
                    }, 3000);

                    
                } else {
                    console.log('user NOT registered!')
                    // TODO: poco elegante, I know!
                    $("#signUpDataForm .alert").remove();
                    $("#signUpDataForm").prepend('<div class=\"alert alert-danger alert-dismissible\" role=\"alert\"><button type=\"button\" class=\"close\" data-dismiss=\"alert\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button><strong>OPS!1!</strong> ' + data.error + '</div>');
                    $("#signUpDataForm .alert").show();
                }
                
            },

            error: function (jqXHR, textStatus, errorThrown) {
                console.log('Ops, server error communication!');
            }
        });
    });

    $sendFileBtn.on('click', function(event) {
        event.preventDefault();
        if($("#file_input").prop('files').length == 0 || $('#user-picker').val().length == 0) {
            // TODO: show an alert at least!
            console.log("file or destination user: empty field!!");
            return;
        }

        var receivers = [];
        $.each($('#user-picker').val(), function(index, val) {
            receivers.push(val);
        });
        
        var file = $("#file_input").prop('files')[0];
        var file_id = makeid();
        
        transfer_file_map[file_id] = {};
        transfer_file_map[file_id] = {
            file: file,
            receivers: receivers
        };

        socket.emit('file_transfer_request', { 
            receivers: receivers,   // array containing the connection's socket.id of users
            file_id : file_id,
            filename: file.name, 
            filesize: file.size 
        });
    });

    $transferAcceptBtn.on('click', function(event) {
        event.preventDefault();
        socket.emit('file_transfer_response', {
            accepted:   true,
            sender_id:  $("#file_sender_id").text(),
            file_id:    $("#file_id").text(),
            peer_client_id: peer_client_id
        });

        // setup for peer connection
    });

    $transferCancelBtn.on('click', function(event) {
        event.preventDefault();
        socket.emit('file_transfer_response', {
            accepted:   false,
            sender_id:  $("#sender_id").text(),
            filename:   $("#filename").text(),
            filesize:   $("#filesize").text() 
        });
    });

    // on change listener for input file
    $('#file_input').on('change', function(event) {
        console.log("Selected file: " + $(this).prop('files')[0].name);
        $(this).parent().parent().siblings(':text').val($(this).prop('files')[0].name);
    });

    /*
    $('.flip').click(function(){
        $(this).find('.card').toggleClass('flipped');
    }); */

}
