var EXPORTED_SYMBOLS = ["pUtils"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cui = Cu["import"];


function ParanoiaUtilities() {
	var PPM;
	var _logzone = "pUtils";
	var cryptoSchemes = [];
	
	this.setup = function(ParanoiaPasswordManager) {
		PPM = ParanoiaPasswordManager;
		log("READY");
	}
	
	this.init = function() {
		log("initializing...");
		loadClasses();
		enumerateEncryptionSchemes();				
		log("initialization finished.");
	}
	
	this.uninit = function() {/*nothing to do?*/}
	


	this.getParanoiaServer = function(serverConfig) {
		return(new ParanoiaServer(serverConfig));
	}
	
	this.getPasscard = function(s) {
		return(new PASSCARD(s));
	}
	
	this.getUrlcard = function(s){
		return (new URLCARD(s));
	}
	
	
	this.getAvailableEncryptionSchemes = function() {
		var answer = [];
		for(var n in cryptoSchemes) {
			var ES = {"name": cryptoSchemes[n].name, "description": cryptoSchemes[n].description};
			answer[answer.length] = ES;
		}
		return(answer);
	}
	
	this.checkEncriptionScheme = function(scheme) {
		if (getEnctyptionScheme(scheme) !== false) {
			return(true);
		}
		return(false);
	}
	
	this.encryptWithScheme = function(txt,key,scheme) {
		var ES = getEnctyptionScheme(scheme);
		if (ES !== false) {
			return(ES.encrypt(txt, key));
		}
		return("");
	}
	
	this.decryptWithScheme = function(txt,key,scheme) {
		var ES = getEnctyptionScheme(scheme);
		if (ES !== false) {
			return(ES.decrypt(txt, key));
		}
		return("");
	}
	
	this.schemePasswordCheck = function(key,scheme) {
		var ES = getEnctyptionScheme(scheme);
		if (ES !== false) {
			return(ES.checkEncryptionKey(key));
		} else {
			return("Password check failed for scheme["+scheme+"]: " + e);
		}
	}	
	
	this.encryptAES = function(txt,key) {
		return(_encryptAES(txt, key));
	}
	
	this.decryptAES = function(txt,key) {
		return(_decryptAES(txt, key));
	}
	
	this.md5hash = function(txt) {
		return(_md5hash(txt));
	}
	
	this.generatePassword = function(settings) {
		if(typeof(settings) == "undefined") {settings = {};}
		if (typeof(settings.pwlen) == "undefined" || isNaN(settings.pwlen)) {settings.pwlen = PPM.pConfig.getConfig("pwgen_length");}
		if (settings.pwlen<6) {settings.pwlen=6;}
		settings.specialchars = PPM.pConfig.getConfig("pwgen_specialchars");
		return(passwordGenerator.getRandomPassword(settings));
	}
	
	this.getPasswordStrength = function(username, password) {
		if(typeof(settings) == "undefined") {settings = {};}		
		settings.specialchars = PPM.pConfig.getConfig("pwgen_specialchars");		
		return(PasswordStrength.test(settings,username,password));
	}
	
	
	
	this.get_uuid = function() {
		var chars = '0123456789abcdef'.split('');
		var uuid = [], rnd = Math.random, r;
		uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
		uuid[14] = '4'; // version 4
		for (var i = 0; i < 36; i++) {
			if (!uuid[i]) {
				r = 0 | rnd()*16;
				uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r & 0xf];
			}
		}
		return uuid.join('');
	}
	
	this.getCurrentWindow = function() {
		var WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
		var RW = WM.getMostRecentWindow("navigator:browser");
		return(RW);
	}
	this.getCurrentWindowDocument = function() {
		var RW = this.getCurrentWindow();
		var DOC = RW.document;
		return(DOC);
	}
	this.getCurrentTabDocument = function(){
		var RW = this.getCurrentWindow();
		var DOC = RW.gBrowser.selectedBrowser.contentDocument;
		return(DOC);
	}
	
	this.alert = function(msg, title) {
		if (typeof(title)=="undefined") {title="PARANOIA";}
		Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).alert(null, title, msg);
	}
	
	this.confirm = function(msg, title) {
		if (typeof(title)=="undefined") {title="PARANOIA";}
		return(Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService).confirm(null, title, msg));
	}
	
	this.getTabByAttribute = function(chkAttr) {
		var WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
		var found = false;		
		//look for tab in all browser windows
		for (var WE = WM.getEnumerator("navigator:browser"); WE.hasMoreElements() && !found;) {
			var CW = WE.getNext();
			for (index = 0, tabbrowser = CW.gBrowser; index < tabbrowser.tabContainer.childNodes.length && !found; index++) {
				var CT = tabbrowser.tabContainer.childNodes[index];
				if (CT.hasAttribute(chkAttr)) {
					found = true;
					break;
				}
			}			
		}
		if (found === true) {
			return({CW:CW, CT:CT});
		}
		return(false);
	}
	
	this.openTab = function(myAttr, myUrl) {
		try {
			var myTab = this.getTabByAttribute(myAttr);
			if (myTab !== false) {
				var TB = myTab.CW.gBrowser;
				TB.selectedTab = myTab.CT;
				TB.ownerDocument.defaultView.focus();
			} else {//no? - let's add one in current Window	
				var browserEnumerator = this.getCurrentWindow();
				var tabbrowser = browserEnumerator.gBrowser;
				var newTab = tabbrowser.addTab(myUrl);
				newTab.setAttribute(myAttr, myAttr);
				tabbrowser.selectedTab = newTab;
				tabbrowser.ownerDocument.defaultView.focus();
			}
		} catch(e) {
			log("openTab error: " + e); 
		}
	}	
	
	this.closeTab = function(myAttr) {
		var myTab = this.getTabByAttribute(myAttr);
		if (myTab !== false) {
			var TB = myTab.CW.gBrowser;
			TB.removeTab(myTab.CT);
		}		
	}
	
	
	this.firstRunTasks = function() {/*!UNUSED! - was adwised to do this but I would leave it up to the user*/
		try {
			var toolbarId = "nav-bar";
			var id = "ParanoiaToolbarButton";
			var DOC = this.getCurrentWindowDocument();
			if (!DOC.getElementById(id)) {
				var toolbar = DOC.getElementById(toolbarId);
				var before = toolbar.lastChild;
				toolbar.insertItem(id, before);
				toolbar.setAttribute("currentset", toolbar.currentSet);
				DOC.persist(toolbar.id, "currentset");
			}
		} catch(e) {
			this.alert("firstRunTasks ERROR: " + e);
		}
	
	}
	
	
	
	
	/*----------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
	var _encryptAES = function(txt,key) {
		return(Aes.Ctr.encrypt(txt, key, 256));
	}
	var _decryptAES = function(txt,key) {
		return(Aes.Ctr.decrypt(txt, key, 256));
	}
	var _md5hash = function(txt){
		return(Md5.hex_md5(txt));
	}	
	var getEnctyptionScheme = function(scheme) {
		if ( typeof(cryptoSchemes[scheme]) == "object" ) {
			return (cryptoSchemes[scheme]);
		}
		return(false);
	}
	
	
	
	var registerEncryptionScheme = function(fileName) {
		var TEST_TXT = "Adi bàcsi element a csatàba de nem vitt puskàt ùgyhogy szitàvà lottèk szegènyt.";//sorry about this
		var TEST_KEY = "abcdefghijklmnopqrstuvwzxy";
		var TEST_IN_ES_NAMES = ["name","description","encrypt","decrypt","checkEncryptionKey"];
		var TEST_IN_ES_TYPES = ["string","string","function","function","function"];
		var ES = new Object();
		ES.LOG = log;
		ES.AES_ENCRYPT = _encryptAES;
		ES.AES_DECRYPT = _decryptAES;
		ES.MD5_HASH = _md5hash;
		load_JS_class(fileName, "undefined", "schemes", ES);
		
		//test 1 - check if we have all stuff in ES of the right types - http://www.idealog.us/2007/02/check_if_a_java.html
		var errorcount = 0;
		for (var i=0; i<TEST_IN_ES_NAMES.length; i++) {
			var testName = TEST_IN_ES_NAMES[i];
			var testType = TEST_IN_ES_TYPES[i];
			if (typeof ES[testName] != testType) {
				log("ES["+fileName+"] ERROR ->" + testName + " -> "  + typeof ES[testName]  + " != " + testType);
				errorcount++;
			}			
		}
		
		//test 2 - check if original text is the same as encrypted and decrypted text
		if (errorcount == 0) {
			if (TEST_TXT != ES.decrypt(ES.encrypt(TEST_TXT, TEST_KEY), TEST_KEY)) {
				log("ES["+fileName+"] ERROR -> encrypted and decrypted text is different from original!");
				errorcount++;
			}
		}		
		
		if (errorcount == 0) {
			log("Encryption scheme " + ES.name + " is OK and has been registered!");
			cryptoSchemes[ES.name] = ES;
		} else {
			log("Encryption scheme[" + fileName + "] is broken and was NOT registered!");
		}		
	}
	
	
	
	var enumerateEncryptionSchemes = function() {
		try {
			var dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
			var profileDir = dirService.get("ProfD", Ci.nsIFile);
			var schemeDir = profileDir;
			schemeDir.append("extensions");
			schemeDir.append("paranoia@alfazeta.com");
			schemeDir.append("chrome");
			schemeDir.append("content");
			schemeDir.append("schemes");
			//
			var entries = schemeDir.directoryEntries;
			while (entries.hasMoreElements()) {		
				var entry = entries.getNext();
				entry.QueryInterface(Components.interfaces.nsIFile);
				if (entry.isFile()) {
					var fp = entry.path;
					var m = fp.match(/.*\/(.*\.js)/);
					var fileName = m[1];
					try {
						//log("Found encryption scheme: " + fileName);
						registerEncryptionScheme(fileName);
					} catch (e) {
						log("Encryption scheme registration ERROR: " + e);
					}
				}		
			}
			cryptoSchemes.sort();
		} catch (e) {
			log("Encryption scheme registration ERROR: " + e);
		}	
	}
	
	
	var loadClasses = function() {
		var subfolder = "classes";
		var scope = null;
		load_JS_class("aes.js", typeof Aes, subfolder, scope);
		load_JS_class("aesctr.js", typeof Aes.Ctr, subfolder, scope);
		load_JS_class("base64.js", typeof Base64, subfolder, scope);
		load_JS_class("utf8.js", typeof Utf8, subfolder, scope);
		load_JS_class("md5.js", typeof Md5, subfolder, scope);
		load_JS_class("paranoia_server.js", typeof ParanoiaServer, subfolder, scope);
		load_JS_class("passcard.js", typeof PASSCARD, subfolder, scope);
		load_JS_class("urlcard.js", typeof URLCARD, subfolder, scope);
		load_JS_class("pwgenerator.js", typeof passwordGenerator, subfolder, scope);
		load_JS_class("pwstrength.js", typeof PasswordStrength, subfolder, scope);
	}
	
	var load_JS_class = function(classFile, type, subfolder, scope) {
		if (type == "undefined") {
			var classPath = "chrome://paranoia/content/";
			if (subfolder != undefined || subfolder != "undefined") {classPath += subfolder + "/";}
			try {
				Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader).loadSubScript(classPath + classFile, scope);
				log("loaded external JS class: " + classFile,"pUtils");
			} catch (e) {
				log("failed to load external JS class: " + classPath+classFile+"\n"+e,"pUtils");
			}
		} else {
			log("JS class already present: " + classFile,"pUtils");
		}
	}
	
	var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}

var pUtils = new ParanoiaUtilities;
