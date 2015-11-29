

$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  var test_app_id = 'r3qEj28qncJL76GkjmghLyVvhY8fTFGiXlufGMnW';
  var test_javascript_key = 'Mo5yK2Jee4DDVSOIrTnwbUVARFxMr6nmhwbT17K4';

  Parse.initialize(test_app_id, test_javascript_key);


  // var TestObject = Parse.Object.extend("TestObject");
  // var testObject = new TestObject();
  // testObject.save({foo: "bar"}).then(function(object) {
  //   alert("yay! it worked");
  // });

  var LoginView = Parse.View.extend({
    template: Handlebars.compile($('#login-tpl').html()),

    events: {
        'submit .form-signin': 'logIn',
        'submit .form-signup': 'signUp',
    },
    logIn: function(e) {
 
        // Prevent Default Submit Event
        e.preventDefault();
 
        // Get data from the form and put them into variables
        var data = $(e.target).serializeArray(),
            username = data[0].value,
            password = data[1].value;
 
        // Call Parse Login function with those variables
        Parse.User.logIn(username, password, {
            // If the username and password matches
            success: function(user) {
              console.log('Succesfully Logged In')
              $('#myModal').foundation('reveal', 'close');

              $('#myModal').foundation('reveal', 'close');

              var welcomeView = new WelcomeView({ model: user });
              var appView = new AppView();
              welcomeView.render();
              $('.app-header').html(welcomeView.el);

              $('.app').html(appView.el);
              appView.render();

            },
            // If there is an error
            error: function(user, error) {

              console.log(error);
            }
        });
    },
    signUp: function(e){

      //Prevent Default Submit Event
      e.preventDefault();

      var data = $(e.target).serializeArray(),
            self = this,
            username = data[0].value,
            password = data[1].value;
 
        // Call Parse signUp function with those variables
        Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
            success: function(user) {
              console.log('Succesfully Made a New Account')
              $('#myModal').foundation('reveal', 'close');

              var welcomeView = new WelcomeView({ model: user });
              var appView = new AppView();
              welcomeView.render();
              $('.app-header').html(welcomeView.el);
              $('.app').html(appView.el);
              appView.render();

            },
            // If there is an error
            error: function(user, error) {
              self.$(".signup-form .error").html(_.escape(error.message)).show();
            }
        });
    },

    render: function(){

      this.$el.html(this.template());
    }
  }),
  WelcomeView = Parse.View.extend({
        template: Handlebars.compile($('#welcome-tpl').html()),
        render: function(){
            var attributes = this.model.toJSON();
            this.$el.html(this.template(attributes));
        }
    });
  AppView = Parse.View.extend({
        template: Handlebars.compile($('#app-tpl').html()),
        render: function(){
            // var attributes = this.model.toJSON();
            this.$el.html(this.template());
            console.log("Initializing the Application");
            app.initialize();
        }
    });
  var loginView = new LoginView();
  loginView.render();
  $('.modal-container').html(loginView.el);
  
});
