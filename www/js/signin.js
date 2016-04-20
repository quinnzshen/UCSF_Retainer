$(function() {
  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  var test_app_id = 'r3qEj28qncJL76GkjmghLyVvhY8fTFGiXlufGMnW';
  var test_javascript_key = 'Mo5yK2Jee4DDVSOIrTnwbUVARFxMr6nmhwbT17K4';
  console.log('yo')
  Parse.initialize(test_app_id, test_javascript_key);

  var LoginView = Backbone.View.extend({
    template: Handlebars.compile($('#login-tpl').html()),

    events: {
        'submit .form-signin': 'logIn',
        'submit .form-signup': 'signUp',
        'click #SignUpButton': 'launchSignUpModal',
    },

    logIn: function(e) {
        console.log('Attempting to Log-In')
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
              app_router.welcomeUser(user);
            },
            // If there is an error
            error: function(user, error) {
              $('#login-error').html('<p>Invalid Login Parameters</p>');
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
              app_router.welcomeUser(user);


            },
            // If there is an error
            error: function(user, error) {
              if (error.code == "202"){
                $('#signup-error').html('<p>Username already taken</p>');
              }
              else {
                $('#signup-error').html('<p>Something went wrong</p>');
              };
              // alert("Error: " + error.code + " " + error.message);
            }
        });
    },

    launchSignUpModal: function() {
      $(document).foundation();
      $('#myModal').foundation('open');
    },

    onClose: function() {
      this.model.unbind("change", this.render);
    },

    render: function() {
      this.$el.html(this.template());
      console.log('rendering Login Page');
    }
  });
  
  var WelcomeView = Backbone.View.extend({
        template: Handlebars.compile($('#welcome-tpl').html()),
         events: {
        
        'click #LogOutButton': 'logOutUser',
    },

        render: function(){
            var attributes = this.model.toJSON();
            this.$el.html(this.template(attributes));
        },
        logOutUser: function(){
          Parse.User.logOut();
          app_router.userAuthentication();
        }
  });

  var AppView = Backbone.View.extend({
        template: Handlebars.compile($('#app-tpl').html()),
        render: function(){
            // var attributes = this.model.toJSON();
            this.$el.html(this.template());
            console.log("Initializing the Application");
            app.initialize();
        }
  });

  var ContentView = Backbone.View.extend({
    /*
     * Initialize with the template-id
     */
    initialize: function(options) {
      this.template = options.template;
    },
    
    /*
     * Get the template content and render it into a new div-element
     */
    render: function() {
      var content = $(this.template).html();
      $(this.el).html(content);

      return this;
    }
  });

  var AppRouter = Backbone.Router.extend({
    routes: {
      "": "index",
      "userAuth": "userAuthentication",
      "logOut": "logOutUser",
      "app": "appStart",
    },

    index: function(){
      $(document.body).append("Index route has been called..");
    },
    initialize: function(el){
      this.el = el;
      this.loginView = new ContentView({template: '#LoginContainer'});
      this.welcomeView = new ContentView({template: '.app-header'});
      this.appView = new ContentView({template:'.app'}) ;
    },

    currentView: null,

    switchView: function(view) {
      if (this.currentView) {
        // Detach the old view
        this.currentView.remove();
      }

      // Move the view element into the DOM (replacing the old content)
      this.el.html(view.el);

      // Render view after it is in the DOM (styles are applied)
      view.render();

      this.currentView = view;
    },

    welcomeUser: function(currentUser){
      var welcomeView = new WelcomeView({ model: currentUser });
      // var AppView = new AppView();
      this.switchView(welcomeView)

    },

    userAuthentication: function(){
      var loginView = new LoginView();
      this.switchView(loginView);
      // $('#LoginContainer').html(loginView.el);
      // }
    },

    appStart: function(){
    },
  });
  
  var currentUser = Parse.User.current();
  Parse.User.logOut();

  var app_router = new AppRouter($('#content'));
  Backbone.history.start();

  if (currentUser) {
    console.log(currentUser);
    // do stuff with the user

    // var welcomeView = new WelcomeView({ model: currentUser });
    // var AppView = new AppView();
    // welcomeView.render();
    // $('.app-header').html(welcomeView.el);
    // $('.app').html(AppView.el);
    // AppView.render();
    app_router.welcomeUser(currentUser);
  } else {
    app_router.userAuthentication();
    // show the signup or login page
    // var loginView = new LoginView();
    // loginView.render();
    // $('#LoginContainer').html(loginView.el);
  }
});