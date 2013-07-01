// This plugin allows easy user login and authorization from att.  The easiest way to use it is to place an element on the page
// with a class of `btn-att-login`.   After initialization this script will either convert any btn-att-login scripts to appropriate oauth authoirize links,
// or will update those buttons with the logged in user.

(function(ATT) {

  ATT.fn.oauth2 = {
    
    authorizeURL: function(){
      var config = att.config;
      var oauth_server   = "https://auth.tfoundry.com";
      var authorize_path = "/oauth/authorize";
      return oauth_server+authorize_path+"?response_type=token&client_id="+config.clientID+"&scope="+config.scope+"&state="+att.state+"&redirect_uri="+config.redirectURI;
    },
    
    getTokenInfo: function(tok) {
      console.log('TODO: fetching the token, WIP, not tested yet');
      $.get("https://auth.tfoundry.com/tokens/"+tok+".json?access_token="+tok, function(data) {
        console.debug("token fetched:");
        conosole.debug(data);
      });
    },
    
    login: function (cb) {
      console.debug('loging in to clientID='+att.config.clientID);
      var oauthParams = {},
        regex = /([^&=]+)=([^&]*)/g,
        m;
      while (m = regex.exec(  location.hash.substring(1) )) {
        oauthParams[decodeURIComponent(m[1].replace(/^\//,''))] = decodeURIComponent(m[2]);
      }
      
      if (oauthParams['access_token']) {
        console.debug('access_token is present: '+ oauthParams['access_token']);
          /*
        if (att.state!=oauthParams['state']) {
          throw "the state of the returned access_token does not match. possible csrf attack."; 
        }
        */
        // TODO: use att.me instead of this implementaton
        me_url = "https://auth.tfoundry.com/me.json?access_token="+oauthParams['access_token'];
        console.log(me_url);
        $.get(me_url, function(data) {
          // console.debug("token is valid. "+ data.name+'\'s me.json with access_token = ' + oauthParams['access_token']);
          $('.btn-att-login').html(data.name);
          $('.btn-att-login').attr('href', "https://auth.tfoundry.com/users/" + data.uid);
          att.config.accessToken = oauthParams['access_token'];
          // set the accessToken to the access_token if the accessToken already set
          att.config.accessToken= att.config.accessToken || oauthParams['access_token'];
          att.user = data;
          att.config.user = data.uid;  // TODO, decide if it would instead be best to remove the other uuid on att.init, and just store the object here.
          att.emit('user', data);
          return cb(data);
        });
        // TODO: deal with error and false token or 404 and emit oauth-error
      } else {
        console.debug('access token is not present');
          $('.btn-att-login').attr('href', att.oauth2.authorizeURL(att.config) );
          return cb()
      }
    }
    
  };
})(ATT);


(function(ATT, $) {
  var cache = {};

  ATT.initPlugin(function(att) {
    att.on('init', function() {
      // att.oauth2.login();
      // TODO: cache the results, and provide a logout method to clear it
      // TODO: if an access_token is cached, then check that the att.config.scope matches, and if not, request a new token
    });
  });

})(ATT, jQuery);
