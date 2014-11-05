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
    var client_username = null;
    var client_peer_id = null;

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

    function hashCode(s){
        return s.split("").reduce(function(a,b) {a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
    }

    function fileIdGenerator(file) {
        return hashCode(file.name + file.lastModified + file.type);
    }


    function peerSetup(peer_id) {
        peer = new Peer(peer_id, {key: 'wxhelisx5h2xogvi', debug: 3});
        peer.on('close', function() { 
            console.log('R: on close');
        });
        peer.on('disconnected', function() { 
            console.log('R: on disconnected');
        });
        peer.on('error', function(err) { 
            console.log('R: on error', err);
        });

        peer.on('connection', function(connection) {
            console.log("R: on connection");
            //console.log(connection.metadata.sender_username); // funziona!!!
            connection.on('open', function() {
                console.log("R: on open");
                // Receive
                var receiver_handle = peer_file.receive(connection)
                    .on('incoming', function(file) {
                        var self = this;
                        console.log("R: on incoming:" + file.name + " (" + file.size + ")");
                        
                        $("#transfer_file_box").append(
                            '<div id="' + connection.metadata.file_id + '" class="incoming_file">' +
                                '<div class="fileinfo">' +
                                    '<span class="label label-default"> From: ' + connection.metadata.sender_username + '</span>' +
                                    '<span class="label label-default"> Filename: </span>' + 
                                    '<span class="label label-info">' + file.name + '</span>' +
                                    '<span class="label label-default"> Size: </span>' + 
                                    '<span class="label label-info">' + bytesToSize(file.size) + '</span>' +
                                '</div>' +
                                '<div class="filestatus">' + 
                                    '<span>Incoming</span>' +
                                '</div>' +
                                '<div class="fileprogress progress">' +
                                    '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">' +
                                        '<span>0%</span>'+
                                    '</div>' +
                                '</div>' +
                                '<div class="filecontrols">' +
                                    '<div class="accept_reject">' +
                                        '<button id="accept_btn" type="button" class="btn btn-primary navbar-btn">Yep!</button>' +
                                        '<button id="reject_btn" type="button" class="btn btn-primary navbar-btn">No!</button>' +
                                    '</div>' +
                                    '<div class="pause_resume_cancel" style="display:none">' +
                                        '<button id="pause_resume_btn"  type="button" class="btn btn-primary navbar-btn"><span class="glyphicon glyphicon-pause"></span></button>' +
                                        '<button id="cancel_btn"        type="button" class="btn btn-primary navbar-btn"><span class="glyphicon glyphicon-stop"></span></button>' +
                                    '</div>' +
                                '</div>' +
                            '</div>'
                        );

                        $("#" + connection.metadata.file_id).find("#accept_btn").on('click', function(event) {
                            event.preventDefault();
                            console.log("File:", connection.metadata.file_id, "accepted!");
                            self.accept(file);
                            $("#" + connection.metadata.file_id + " > .filestatus > span").text("Downloading...");
                            $("#" + connection.metadata.file_id).find(".pause_resume_cancel").show();
                            $("#" + connection.metadata.file_id).find(".accept_reject").hide();
                        });
                        
                        $("#" + connection.metadata.file_id).find("#reject_btn").on('click', function(event) {
                            event.preventDefault();
                            console.log(connection.metadata.file_id, "rejected!");
                            self.reject(file); 
                            $("#" + self.file_id + " > .filestatus > span").text("Rejected!");
                            //setTimeout(function() {$('#' + self.file_id).remove();},3000);   
                        });
                        
                        $("#" + connection.metadata.file_id).find("#pause_resume_btn").on('click', function(event) {
                            event.preventDefault();
                            console.log("R:", connection.metadata.file_id, "pause - resume!");
                            
                            if(($(this)).find('span').hasClass('glyphicon-pause'))
                                self.pause(file);
                            else
                                self.resume(file);
                            ($(this)).find('span').toggleClass('glyphicon-pause glyphicon-play');
                        });

                        $("#" + connection.metadata.file_id).find("#cancel_btn").on('click', function(event) {
                            event.preventDefault();
                            console.log(connection.metadata.file_id, "cancelled!");
                            self.cancel(file);
                        });
                    })
                    .on('progress', function(file, bytesReceived) {
                        var progress = Math.ceil(bytesReceived / file.size * 100);
                        $('#'+ connection.metadata.file_id + ' > .fileprogress > .progress-bar').css('width', progress+'%').attr('aria-valuenow', progress);
                        $('#'+ connection.metadata.file_id + ' > .fileprogress > .progress-bar > span').text(progress+'%');
                        console.log("R: on progress", progress+'%');
                    })
                    .on('cancel', function(file) {
                        console.log("R: on cancel");
                        $('#' + connection.metadata.file_id + ' > .fileprogress > .progress-bar').addClass('progress-bar-danger');
                        $("#" + connection.metadata.file_id + ' > .filestatus > span').text("Cancelled!");
                        //setTimeout(function() {$('#' + self.file_id).remove();},3000);
                    })
                    .on('resume', function(file) {
                        console.log("R: on resume");
                        $("#" + connection.metadata.file_id).find("#pause_resume_btn").find('span').toggleClass('glyphicon-pause glyphicon-play');
                        $("#" + connection.metadata.file_id + ' > .filestatus > span').text("Downloading...");
                    })
                    .on('pause', function(file) {
                        console.log("R: on pause");
                        $("#" + connection.metadata.file_id).find("#pause_resume_btn").find('span').toggleClass('glyphicon-pause glyphicon-play');
                        $("#" + connection.metadata.file_id + ' > .filestatus > span').text("Paused!");
                    })
                    .on('complete', function(file) {
                        console.log("R: on complete");
                        $('#' + connection.metadata.file_id + ' > .fileprogress > .progress-bar').addClass('progress-bar-success');
                        $("#" + connection.metadata.file_id + ' > .filestatus > span').text("Completed!");
                        //setTimeout(function() {$('#' + connection.metadata.file_id).remove();},3000);
                        var blob = new Blob(file.data, { type: file.type });
                        saveAs(blob, file.name);
                    });
            });
        });
    }

    function sendFile(peer_receiver_id, file_id) {
        var connection = peer.connect(peer_receiver_id, { 
            reliable: true, 
            metadata: {
                sender_username: client_username, 
                file_id: file_id 
            }
        });
        
        peer.on('error', function(err) {
            console.log("Error type:", err.type);
            console.log(err);
            // TODO: handle when error's type is 'peer-unavailable'
        } );

        //TODO: add the receiver username!!
        $("#transfer_file_box").append(
            '<div id="' + file_id + '" class="outcoming_file">' +
                '<div class="fileinfo">' +
                    '<span class="label label-default"> Filename: </span>' + 
                    '<span class="label label-info">' + transfer_file_map[file_id].file.name + '</span>' +
                    '<span class="label label-default"> Size: </span>' + 
                    '<span class="label label-info">' + bytesToSize(transfer_file_map[file_id].file.size) + '</span>' +
                '</div>' +
                '<div class="filestatus">' + 
                    '<span>Contacting destination user...</span>' +
                '</div>' +
                '<div class="fileprogress progress">' +
                    '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">' +
                        '<span>0%</span>'+
                    '</div>'+
                '</div>'+
                '<div class="filecontrols">' +
                    '<div class="pause_resume_cancel">' +
                        '<button id="pause_resume_btn"  type="button" class="btn btn-primary navbar-btn" disabled><span class="glyphicon glyphicon-pause"></span></button>' +
                        '<button id="cancel_btn"        type="button" class="btn btn-primary navbar-btn"><span class="glyphicon glyphicon-stop"></span></button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );

        console.log("S: Try to connenct to " + peer_receiver_id);
        connection.on('open', function() {
            console.log("S: on open");
            var sender_handle = peer_file.send(connection, transfer_file_map[file_id].file)
                .on('accept', function() {
                    console.log("S: on accept");
                    $("#" + file_id + " > .filestatus > span").text("Sending...");
                    $("#" + file_id).find("#pause_resume_btn").prop('disabled', false);  // Now the button will be clickable!
                })
                .on('reject', function() {
                    console.log("S: on reject");
                    $("#" + file_id + " > .filestatus > span").text("Rejected!");
                    //setTimeout(function() {$('#' + file_id).remove();}, 3000);
                })
                .on('cancel', function() {
                    console.log("S: on cancel");
                    $("#" + file_id + " > .filestatus > span").text("Cancelled!");
                    //setTimeout(function() {$('#' + file_id).remove();}, 3000);
                })
                .on('pause', function() {
                    console.log("S: on pause");
                    $("#" + file_id + " > .filestatus > span").text("Paused!");
                    $("#" + file_id).find("#pause_resume_btn").find('span').toggleClass('glyphicon-pause glyphicon-play');
                })
                .on('resume', function() {
                    console.log("S: on resume");
                    $("#" + file_id + " > .filestatus > span").text("Downloading...");
                    $("#" + file_id).find("#pause_resume_btn").find('span').toggleClass('glyphicon-pause glyphicon-play');
                })
                .on('progress', function(bytesSent) {
                    var progress = Math.ceil(bytesSent / transfer_file_map[file_id].file.size * 100);
                    $('#'+ file_id + ' > .fileprogress > .progress-bar').css('width', progress+'%').attr('aria-valuenow', progress);
                    $('#'+ file_id + ' > .fileprogress > .progress-bar > span').text(progress+'%');
                    console.log("S: on progress:", progress, "%");
                })
                .on('complete', function() {
                    console.log("S: on complete");
                    $('#' + file_id + ' > .fileprogress > .progress-bar').addClass('progress-bar-success');
                    $('#' + file_id + ' > .filestatus > span').text("Completed!");
                    //setTimeout(function() {$('#' + file_id).remove();}, 3000);
                })
            
            // setting listeners!
            $("#" + file_id).find("#pause_resume_btn").on('click', function(event) {
                event.preventDefault();
                console.log("R:", connection.metadata.file_id, "pause - resume!");
                if(($(this)).find('span').hasClass('glyphicon-pause')) {
                    $("#" + file_id + " > .filestatus > span").text("Paused!");
                    sender_handle.pause();
                }
                else {
                    $("#" + file_id + " > .filestatus > span").text("Downloading...");
                    sender_handle.resume();
                }
                ($(this)).find('span').toggleClass('glyphicon-pause glyphicon-play');
            });

            $("#" + file_id).find("#cancel_btn").on('click', function(event) {
                event.preventDefault();
                console.log(file_id, "cancelled!");
                sender_handle.cancel();
            });

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
                    client_username = data.payload.username;
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
                case 'peer_receiver_ids_response':
                    // connect to the receiver peer 
                    console.log(data.payload.peer_receiver_ids);
                    for(var i in data.payload.peer_receiver_ids)
                        sendFile(data.payload.peer_receiver_ids[i], data.payload.file_id);
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
            sender:     client_username,
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
        var file_id = "file-" + fileIdGenerator(file);
        
        transfer_file_map[file_id] = {};
        transfer_file_map[file_id] = {
            file: file,
            receivers: receivers
        };

        socket.emit('peer_receiver_ids_request', { 
            receivers: receivers,   // array containing the connection's socket.id of users
            file_id : file_id
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
