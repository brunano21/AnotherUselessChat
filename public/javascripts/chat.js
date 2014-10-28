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
    var clientId = null; //Note: clientId == socket.id
    var username = null;

    // set when user selects a file.
    var file = null;
    var filename = null;
    
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
                    clientId = data.payload.clientId;
                    username = data.payload.username;
                    break;
                case 'new_message': 
                    if(data.payload.id == clientId) // if the sender is me!
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
                case 'incoming_file':
                    $("#sender_username").text("User " + data.payload.sender_username + " is sending you a file. Accept?");
                    $("#sender_id").text(data.payload.sender_id);
                    $("#filename").text(data.payload.filename);
                    $("#filesize").text(bytesToSize(data.payload.filesize));
                    $('.flip').find('.card').toggleClass('flipped');
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
                    
                        if(clientId != i)  
                            $("#user-picker").append('<option value=\"' + i + '\">' + data.payload[i] + '</option>');
                        else
                            $("#user-picker").append('<option disabled value=\"' + i + '\">' + data.payload[i] + '</option>');
                    }

                    // refresh select-picker
                    $('#user-picker').selectpicker('refresh');
                    break;
                case 'download_file':
                    console.log("send request for getting file");
                    $('<form action="/download" method="POST">' + 
                        '<input type="hidden" name="file_path" value="' + data.payload.file_path + '">' +
                        '</form>')
                    .submit();
                    break;
                case 'start_upload_file':
                    // upload file to the server.
                    var stream = ss.createStream();
                    ss(socket).emit('file', stream, {filename: filename, size: file.size});
                    var blobStream = ss.createBlobReadStream(file); 

                    var size = 0;

                    blobStream.on('data', function(chunk) {
                      size += chunk.length;
                      console.log(Math.floor(size / file.size * 100) + '%');
                    });

                    blobStream.pipe(stream);

                    //TODO: loading and clean up

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
            id:         clientId, 
            message:    text, 
            sender:     username,
            time:       timestamp
        });

        //reset input text
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
        if(file == null || $('#user-picker').val().length == 0) {
            // TODO: show an alert at least!
            console.log("file or destination user: empty field!!");
            return;
        }
        var receivers = [];
        $.each($('#user-picker').val(), function(index, val) {
            receivers.push(val);
        });
        console
        socket.emit('fileTransferRequest', { 
            receivers: receivers,
            filename: filename,
            filesize: file.size
        });
    });

    $transferAcceptBtn.on('click', function(event) {
        event.preventDefault();
        socket.emit('fileTransferResponse', {
            accepted:   true,
            sender_id:  $("#sender_id").text(),
            filename:   $("#filename").text(),
            filesize:   $("#filesize").text()
        });
    });

    $transferCancelBtn.on('click', function(event) {
        event.preventDefault();
        socket.emit('fileTransferResponse', {
            accepted:   false,
            sender_id:  $("#sender_id").text(),
            filename:   $("#filename").text(),
            filesize:   $("#filesize").text() 
        });
    });

    // on change listener for imput file
    $('.btn-file :file').on('change', function(event) {
        file = event.target.files[0];
        var input = $(this);
        filename = input.val().replace(/\\/g, '/').replace(/.*\//, '');
        input.trigger('fileselect');
    });

    $('.btn-file :file').on('fileselect', function(event) {
        console.log("Selected file: " + filename);
        $(this).parent().parent().siblings(':text').val(filename);
    });
    /*
    $('.flip').click(function(){
        $(this).find('.card').toggleClass('flipped');
    }); */


}
