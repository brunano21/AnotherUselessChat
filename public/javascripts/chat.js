window.onload = function() {

    //var server_address = 'http://br1srpi.crabdance.com:3000';
    //var server_address = 'http://192.168.0.2:3000';
    var server_address = 'http://localhost:3000';

    var chatLog = [];
    var socket;
    var $inputText = $("#inputText");
    var $sendBtn = $("#sendBtn");
    var $signUpBtn = $("#signUpBtn");
    var $sendDataSignInBtn = $("#sendDataSignInBtn");
    var $sendDataSignUpBtn = $("#sendDataSignUpBtn");

    var clientId = null;
    var username = null;

    function addNewUser(clientId, username){
        $("#user-container > ul").append(
            '<li>' +
                '<h4>' +
                    '<span class=\"label label-default\" id=\"' + clientId + '">' + username + '</span>' + 
                '</h4>' +
            '</li>'    
        );
    }

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

        socket.on('user-list', function (data) {
            $("#user-container > ul").empty();
            for(i in data)
                addNewUser(i, data[i]);
        });

        socket.on('message', function (data) {
            if(data.message) {
                chatLog.push(data.message);
                console.log("il payload e' " + data.message);

                if(data.id == clientId) // if the sender is me!
                    $("#chat-container > ul").append(
                        '<li>' +
                            '<div class="bubble2">' +
                              '<span class="personName2"> '+ data.sender + '<span>' +
                              '<span class="personSay2"> '+ data.message + '<span>' +
                              '<span class="time2 round"> '+ data.time + '<span>' +
                        '</li>');
                else
                    $("#chat-container > ul").append(
                        '<li>' +
                            '<div class="bubble">' +
                              '<span class="personName"> '+ data.sender + '<span>' +
                              '<span class="personSay"> '+ data.message + '<span>' +
                              '<span class="time round"> '+ data.time + '<span>' +
                        '</li>');
                $("#chat-container").animate({scrollTop: $("#chat-container")[0].scrollHeight}, 600);


            } else if(data.clientId) {
                clientId = data.clientId;
                username = data.username;
            }
            else {
                console.log("There is a problem: ", data);
            }
        });
    }

   

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
                    console.log('user logged!');
                    console.log(data);
                    $("#loginNavBar > li:first-child > p").text($("#loginNavBar > li:first-child > p").text() + data.username);
                    $("#loginNavBar > li").toggle();
                    //$("#loginNavBar > li:last-child").hide();
                    //$("#loginNavBar > li:not(:last-child)").show();
                    $("#signInModal").modal('toggle')
                    connect_socket(data.token);

                } else {
                    console.log('user NOT logged!')
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

}
