var EXPORTED_SYMBOLS = ["pConfig"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cui = Cu["import"];


function ParanoiaConfiguration() {
	var PPM;
	var _logzone = "pConfig";	
	var ps = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);	
	var prefs = ps.getBranch("extensions.paranoia.");
	//
	var master_key = null;
	var encryption_scheme = null;
	var settings = {};	
	
	
	this.setup = function(ParanoiaPasswordManager) {
		PPM = ParanoiaPasswordManager;
		log("READY");
	}
	
	this.init = function() {
		log("initializing...");
		checkForPrefsAndCreateDefaults();
		log("initialization finished.");
	}
	
	this.uninit = function() {
		log("shutting down...");
		writeOutPreferences();	
		settings = {};
		master_key = null;
		encryption_scheme = null;
		log("shutdown complete.");
	}
	
	
	this.checkMasterLoginKeyAndInitializeSettings = function(mk,es) {//this is the main Paranoia login function
		//log("trying to decrypt Config with MasterKey: " + mk);
		try {
			var cryptedSettings = prefs.getCharPref("settings");
		} catch (e) {
			log("FATAL ERROR! - Unable to load default Paranoia settings!");
			return(false);
		}
		
		if(!PPM.pUtils.checkEncriptionScheme(es)) {
			log("FATAL ERROR! - This ES["+es+"] does NOT exist!");
			return(false);
		}
		
		//log("crypted Config: " + cryptedSettings);	
		var decryptedSettings = PPM.pUtils.decryptWithScheme(cryptedSettings,mk,es);
		//log("decrypted Config: " + settingsData);	
		
		try {//if the parsed decrypted settings result an object then we are OK
			settings = JSON.parse(decryptedSettings);
			if (typeof(settings) == "object") {
				master_key = mk;
				encryption_scheme = es;
				log("MasterKey is OK! - Configuration loaded.");
				this.setConfig("logincount",this.getConfig("logincount")+1);//this is not very important but maybe last login date is...bah?				
				Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-logged-in", "");
				return(true);
			} else {
				throw("no good!");
			}
		} catch (e) {
			log("This MasterKey is no good!");
			return(false);
		}	
	}
	
	/*
 	this.killAllPrefs = function() {
		prefs.deleteBranch("");
	}	
	*/
	this.removeEntireBranch = function() {
		prefs.clearUserPref("settings");
		ps.savePrefFile(null);//force saving file prefs.js
	}
	this.substituteEntireBranch = function(cryptedSettings){
		prefs.setCharPref("settings", cryptedSettings);
		ps.savePrefFile(null);//force saving file prefs.js
	}
	
	this.getConfig = function(cName, defaultValue) {
		var answer = (typeof(defaultValue)!="undefined"?defaultValue:false);
		if (typeof(settings[cName]) != "undefined") {
			answer = settings[cName];
			if (answer=="true" || answer=="false") {answer=(answer=="true"?true:false);}
		} else {
			log("The requested setting["+cName+"] does not exist!");
		}
		return (answer);
	}
	
	this.setConfig = function(cName,cValue) {
		if (typeof(cValue) != "undefined" && cValue.length != 0) {			
			if (!isNaN(parseInt(cValue)) && (''+parseInt(cValue)).length == cValue.length) {//LET'S autodetect if we have string or numeric value
				settings[cName] = parseInt(cValue);
				var vtype = "int";
			} else {
				settings[cName] = cValue;
				var vtype = "str";
			}
			log("CONFIG->[" + cName + "]("+vtype+") = " + settings[cName]);
		} else {
			log("CONFIG->bad value(\""+cValue+"\") for [" + cName + "] not saved!");
		}
	}
	
	this.removeConfig = function(cName) {
		if (typeof(settings[cName]) != "undefined") {
			delete(settings[cName]);
			log("CONFIG->[" + cName + "] was removed.");
		} else {
			log("The requested setting["+cName+"] does not exist!");
			return (false);
		}
	}
	
	this.getCryptedSettings = function() {
		return(prefs.getCharPref("settings"));
	}
	
	this.getSettingsInArray = function() {
		var answer = [];
		for (prop in settings) {
			if ((this.getConfig("show_trippleunderscore_configs") == 0 && prop.substr(0,3) != "___") || this.getConfig("show_trippleunderscore_configs") == 1) {
				var tmp = {};
				tmp.config_name = prop;
				tmp.config_value = settings[prop];
				answer.push(tmp);
			}
		}		
		return(answer);
	}
	
	
	/*???IS THIS DANGEROUS???*/
	this.get_ES = function() {return(encryption_scheme);}
	this.get_MK = function() {return(master_key);}
	/*???IS THIS DANGEROUS???*/
	
	
	this.changeConfigurationMasterKey = function(mk,es) {
		log("Changing MK to: " + mk + " with ES: " + es);
		/*let's double check - it was already done by XUL interface but it won't hurt*/
		var pwchk = PPM.pUtils.schemePasswordCheck(mk,es);
		if (pwchk !== true) {
			log("changeBrowserSettingsMasterKey ERROR! - Password check failed!");
			return(false);
		}
		master_key = mk;
		encryption_scheme = es;
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-logged-out", "");
		return (true);
	}
	
	
	/*----------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
	var writeOutPreferences = function() {//for now only on uninit - maybe a regular writeOut would be in order
		var settingsData = JSON.stringify(settings);
		//log("settingsData: " + settingsData);
		var cryptedSettings = PPM.pUtils.encryptWithScheme(settingsData, master_key, encryption_scheme);
		//log("cryptedSettings: " + cryptedSettings);
		prefs.setCharPref("settings", cryptedSettings);
		ps.savePrefFile(null);//force saving file prefs.js
		log("preferences saved.");
	}
	
	var checkForPrefsAndCreateDefaults = function() {
		var _noprefs_default_MK = "Paranoia";
		var _noprefs_default_ES = "AesMd5";
		try {
			prefs.getCharPref("settings");//it this throws error we don't have settings so we have to create it
		} catch(e) {
			try {
				log("NO PARANOIA SETTINGS - CREATING DEFAULTS");
				var settings = {
					"logincount": 0,
					"log_to_console": "false",
					"colorize_matched_fields": 1,
					"show_trippleunderscore_configs": "false",
					"auto_reconnect_disconnected_servers_after_ms": 60000,
					"timeout_server_connection_after_ms": 5000,
					"server_queue_check_interval_ms": 500,
					"pwgen_length": 32,
					"pwgen_specialchars": '+-_|!$%&([{}])?^*@#.,:;~',
					"___multiple_server_master_key" : "Paranoia",
					"___multiple_server_encryption_scheme" : "AesMd5"
				};
				var cryptedSettings = PPM.pUtils.encryptWithScheme(JSON.stringify(settings), _noprefs_default_MK, _noprefs_default_ES);
				prefs.setCharPref("settings", cryptedSettings);
			} catch(e) {
				log("UNABLE TO CREATE DEFAULT SETTINGS");
			}
		}
	}
	
	var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}

var pConfig = new ParanoiaConfiguration;
