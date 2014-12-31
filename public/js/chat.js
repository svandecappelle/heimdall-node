//Create a chat module to use.
(function () {
  window.Chat = {
    socket : null,
  
    initialize : function(socketURL) {
      this.socket = io.connect(socketURL);

      //Send message on button click or enter
      $('.send').click(function() {
        Chat.send($(this).parent());
      });

      $('.message').keyup(function(evt) {
        if ((evt.keyCode || evt.which) == 13) {
          Chat.send($(this).parent());
          return false;
        }
      });

      //Process any incoming messages
      this.socket.on('new', this.add);

      // on the client
      var that = this;
      this.socket.on('authenticate', function (incoming) {
        var user = $('#username').text();
        
        if (user === ''){
          user = "anonymous";
        }
        that.socket.emit('checkin', {user: user});
        
        that.socket.on('statuschange', function(data){
          console.log(data);
          $.each(data, function(key, value){
            console.log($('.show-chat-link'));
            $('.show-chat-link').each(function(){
              console.log($(this));
              var username = $(this).find("span").text();
              if (username === key){
                $(this).find(".fa").removeClass('online offline busy away').addClass(value);
              }
            });
          });
        });
      });
    },
    // create a new chat window
    create: function(username){
      var chatmenu = $('<li class="chat-menu open"></li>');
      chatmenu.append('<a class="show-chat-link"><i class="fa fa-circle status online"></i><span>' + username + '</span></a>');
      chatmenu.append('<div class="chat-container chat panel panel-default"><h1> Wisper to: ' + username + '</h1><input class="to" type="hidden" value="' + username + '"><hr><div class="messages"></div><div class="separated"></div><textarea class="form-control message"></textarea><input class="btn btn-primary btn-small send" type="submit" value="Send"></div>');
      $(".chat-boxes").append(chatmenu);
      this.bind($(chatmenu));
      console.log("Chat box binded");
      return $(chatmenu);
    },
    bind: function(chatLink){
      $(chatLink).find("a").click(function () {
        if ($(this).parent().hasClass("open")){
          $(this).parent().removeClass('open');
        }else{ 
          $(this).parent().addClass('open');
        }
        $(this).parent().removeClass('new-message');
      });

       //Send message on button click or enter
      $(chatLink).find('.send').click(function() {
        Chat.send($(this).parent());
      });

      $(chatLink).find('.message').keyup(function(evt) {
        if ((evt.keyCode || evt.which) == 13) {
          Chat.send($(this).parent());
          return false;
        }
      });
    },
    //Adds a new message to the chat.
    add : function(data) {
      console.log("new message from server");
      console.log(data);
      var chatbox = $(".to[value='" + data.to + "']");
      
      if (chatbox.length === 0){
        console.log(chatbox);
        chatbox = Chat.create(data.to);
        console.log("created");
        console.log(chatbox);
      }else{
        chatbox = chatbox.parent().parent();
      }

      var msg = $('<div class="msg"></div>')
        .append('<span class="name">' + data.from + '</span><span>(' + data.date + ')</span> : ')
        .append('<span class="text">' + data.msg + '</span>');
      if (data.format !== undefined){
        var cssObject = JSON.parse(data.format);
        $(msg).css(cssObject);
      }

      $(chatbox).find('.messages')
        .append(msg)
        .animate({scrollTop: $(chatbox).find('.messages').prop('scrollHeight')}, 500);

        if( !$(chatbox).hasClass("open") ){
          console.log("new message");
          $(chatbox).addClass("new-message");
        }
    },
 
      //Sends a message to the server,
      //then clears it from the textarea
      send : function(chatbox) {
        this.socket.emit('msg', {
          from: $('#username').text(),
          to: $(chatbox).find(".to").val(),
          msg: $(chatbox).find('.message').val()
        });
      $(chatbox).find('.message').val('');
      
      return false;
    }
  };
}());