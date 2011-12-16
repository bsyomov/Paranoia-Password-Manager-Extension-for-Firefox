var EXPORTED_SYMBOLS = ["ParanoiaPasswordManager"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Console = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
const Cu = Components.utils;
const Cui = Cu["import"];
if (ParanoiaPasswordManager === undefined) {	var ParanoiaPasswordManager = {};}


// Basic namespace implementation.
(function() {
	var _state = 0;//_state :,//0=offline , 1=ready(inited-not logged in), 2=logged in(no-data), 3=logged in(data-loaded),
	/* PPM STATES:
	 * 0:	OFFLINE - before component initialization
	 * 1:	READY - component is initialized and ready for login
	 * 2:	LOGGED IN - config decrypted and parsed - starting server connection...
	 * 3:	FUNCTIONAL: all servers were connected and all data has been loaded, decrypted and parsed
	 * -----------------------------------------------------------------------------------------------------------------------------(the states below can only be set after we have reached state=3)
	 * 4:	ERROR: there is some server error (disconnection) that needs attention
	 * */
	var _logPrefix = "PARANOIA";
	var _logzone = "pMain";
	var _do_console_logging = true;//by default do NOT log to console (override with pref: log_to_console=true)
	var _is_shutting_down = false;

	this.initApplication = function() {//called by paranoiaComponent
		log("initializing...");
		importAndSetupModules();
		this.pUtils.init();
		this.pConfig.init();
		this.pServer.init();
		//
		var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
		//PARANOIA NOTIFICATIONS
		a.addObserver(this, "paranoia-logged-in", false);
		a.addObserver(this, "paranoia-logged-out", false);
		//SYSTEM NOTIFICATIONS
		a.addObserver(this, "quit-application-requested", false);
		//
		//_state = 1;
		set_state(1);
		log("initialization finished.");
	};
	
	this.shutdownApplication = function() {
		_is_shutting_down = true;
		log("initiating Paranoia shutdown...");
		if (_state > 1) {			
			this.startAfterLogOutSequence();
		} else {
			this.shutdownApplication_KILL();
		}		
	}
	
	this.startAfterLogOutSequence = function() {//logout already confirmed
		log("starting logout sequence...");
		set_state(2);
		try {ParanoiaPasswordManager.pUtils.closeTab("paranoia_settings");} catch (e) {log("Paranoia Shutdown error: " + e);}
		try {ParanoiaPasswordManager.pServer.disconnectAndUnregisterServers();} catch (e) {log("Paranoia Shutdown error: " + e);}
	}
	
	this.logoutSequenceFinished = function() {
		if (_state == 2) {
			set_state(1);
			try {ParanoiaPasswordManager.pServer.uninit();} catch (e) {log("Paranoia Shutdown error: " + e);}
			try {ParanoiaPasswordManager.pConfig.uninit();} catch (e) {log("Paranoia Shutdown error: " + e);}
			try {ParanoiaPasswordManager.pUtils.uninit();} catch (e) {log("Paranoia Shutdown error: " + e);}
			log("logout sequence finished.");
			if (_is_shutting_down) {
				this.shutdownApplication_KILL();
			}
		}
	}
	
	this.shutdownApplication_KILL = function() {
		var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
		a.removeObserver(this, "paranoia-logged-in");
		a.removeObserver(this, "paranoia-logged-out");
		a.removeObserver(this, "quit-application-requested");		
		set_state(0);
		log("Paranoia is offline.");
		var nsIAppStartup = Ci.nsIAppStartup;
		Cc["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup).quit(nsIAppStartup.eAttemptQuit);
		//END OF THE STORY
	}
	
	
	this.startAfterLogInSequence = function() {//already logged in and configuration loaded in pConfig
		log("starting login sequence...");
		set_state(2);			
		try {ParanoiaPasswordManager.pServer.registerServers();} catch (e) {log("Paranoia Startup error: " + e);}
		//try {ParanoiaPasswordManager.pServer.connectServers();} catch (e) {log("Paranoia Startup error: " + e);}//---servers will auto-connect		
	}
	
	this.loginSequenceCompleted = function() {
		if (_state == 2) {
			set_state(3);
			log("login sequence finished.");	
		}
	}
	
	
	this.get_state = function() {
		return(_state);
	}
	
	
	
	this.observe = function(source, topic, data) {
		//_log("PSM(observer) - topic: " + topic);
		switch (topic) {
			case "paranoia-logged-in":
				_do_console_logging = ParanoiaPasswordManager.pConfig.getConfig("log_to_console");
				this.startAfterLogInSequence();				
				break;
			case "paranoia-logged-out":				
				this.startAfterLogOutSequence();
				break;
			case "quit-application-requested":
				if (_state > 1 && !source.data) {
					source.QueryInterface(Components.interfaces.nsISupportsPRBool);
					source.data = true;//cancel quit so we can disconnect servers, save config and cleanly shutdown
					this.shutdownApplication();
				}
				break;
			default:
				log("No observer action registered for topic: " + topic);
		}		
	}


	
	this.log = function(msg,zone) {//main logging interface
		try {
			if (_do_console_logging) {
				var ts = Date.now();
				var prefix = _logPrefix + "[" + ts + "]";
				if (typeof(zone) != "undefined") {
					prefix += "[" + zone + "]";
				}
				prefix += ": ";
				Console.logStringMessage(prefix + msg);
			}
		} catch (e) {
			Cu.reportError(e);
		}
	};
	/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
	var set_state = function(new_state) {
		_state = new_state;
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-overlay-state-change", _state);
	}
	
	var importAndSetupModules = function() {
		log("loading module pUtils...");
		Cui("resource://paranoiaModules/utilities.jsm", ParanoiaPasswordManager);
		ParanoiaPasswordManager.pUtils.setup(ParanoiaPasswordManager);
		
		log("loading module pConfig...");
		Cui("resource://paranoiaModules/configuration.jsm", ParanoiaPasswordManager);
		ParanoiaPasswordManager.pConfig.setup(ParanoiaPasswordManager);
		
		log("loading module pServer...");
		Cui("resource://paranoiaModules/server_concentrator.jsm", ParanoiaPasswordManager);
		ParanoiaPasswordManager.pServer.setup(ParanoiaPasswordManager);
	};
	

	var log = function(msg) {ParanoiaPasswordManager.log(msg, _logzone)};//shorthand
}).apply(ParanoiaPasswordManager);
