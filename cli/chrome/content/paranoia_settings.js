//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");
//

(function() {
	function ParanoiaSettings(){
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var PPM = ParanoiaPasswordManager;
		var _logzone = "pSettings";
		var _intervalExec = null;
		
		this.init = function() {		
			log("initing...");
			_register_listeners_and_observers();
			try{PPM.pSettings.PASSURL.init();} catch(e){log("PASSURL INIT ERROR: " + e);}
			try{PPM.pSettings.CONFIG.init();} catch(e){log("CONFIG INIT ERROR: " + e);}
			try{PPM.pSettings.SERVER.init();} catch(e){log("SERVER INIT ERROR: " + e);}
			
			if (typeof(PPM.settings_tab_index) != "undefined") {
				document.getElementById("settings-tabbox").selectedIndex = PPM.settings_tab_index;
			}
			
			log("inited.");
		}		
		
		this.uninit = function() {
			log("uniniting...");
			_unregister_listeners_and_observers();
			window.removeEventListener("load", PPM.pSettings.init, false);
			window.removeEventListener("unload", PPM.pSettings.uninit, false);
			try{PPM.pSettings.PASSURL.uninit();} catch(e){log("PASSURL UNINIT ERROR: " + e);}
			try{PPM.pSettings.CONFIG.uninit();} catch(e){log("CONFIG UNINIT ERROR: " + e);}
			try{PPM.pSettings.SERVER.uninit();} catch(e){log("SERVER UNINIT ERROR: " + e);}
			log("uninited.");
		};
		
		
		this.observe = function(source, topic, data) {
			//log("observer: " + topic);
			
			switch (topic) {
				case "paranoia-data-element-state-change":
					//triggered by passcards/urlcards when saving is finished so we can update tree ( data{id,type,operation} )
					PPM.pSettings.PASSURL.dataElementStateChange(data);
					break;
				case "timer-callback":
					PPM.pSettings.SERVER.PSERV_update_screen_data();//updating server's config pane
					break;
				default:
					log("No observer action registered for topic: " + topic);
			}
		}
		
		this.tabSelection = function(ev) {
			PPM.settings_tab_index = document.getElementById("settings-tabbox").selectedIndex;
			//log("TPSi: " + TPS.selectedIndex);
		}
		
		
		
		/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
		
		var _register_listeners_and_observers = function() {
			log("Registering listeners and observers...");
			try {
				var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
				a.addObserver(PPM.pSettings, "paranoia-data-element-state-change", false);
								
				if (_intervalExec == null) {
					_intervalExec = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
					_intervalExec.init(PPM.pSettings, 1000, Ci.nsITimer.TYPE_REPEATING_SLACK);
				}
				
				var TPS = document.getElementById("settings-tabbox");
				TPS.addEventListener("select", PPM.pSettings.tabSelection,false);
				
				
			} catch(e) {
				log("Listener/Observer registration ERROR: " + e);
			}
		}
		
		var _unregister_listeners_and_observers = function() {
			log("Removing listeners and observers...");
			try {
				var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
				a.removeObserver(PPM.pSettings, "paranoia-data-element-state-change");
				
				if (_intervalExec != null) {
					_intervalExec.cancel();
					_intervalExec=null;
				}
				
				var TPS = document.getElementById("settings-tabbox");
				TPS.removeEventListener("select", PPM.pSettings.tabSelection,false);
				
			} catch(e) {
				log("Listener/Observer unregistration ERROR: " + e);
			}
		}
		
		var log = function(msg) {PPM.log(msg,_logzone);}	
	}
	//
	this.pSettings = new ParanoiaSettings;
	window.addEventListener("load", ParanoiaPasswordManager.pSettings.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.pSettings.uninit, false);
}).apply(ParanoiaPasswordManager);

