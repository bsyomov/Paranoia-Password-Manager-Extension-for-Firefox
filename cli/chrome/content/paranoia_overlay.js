//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");
//

(function() {	
	function ParanoiaOverlay() {/*pOverlay*/
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var PPM = ParanoiaPasswordManager;
		var _logzone = "pOverlay";
		
				
		this.init = function() {		
			log("initing...");
			_register_listeners_and_observers();
			_setToolbarButtonIcon("paranoia_32.png");//if NOT LOGGED IN IT WILL USE "paranoia_32_off.png" AUTOMATICALLY
			log("inited.");
		}		
		
		this.uninit = function() {
			log("uniniting...");
			_unregister_listeners_and_observers();
			window.removeEventListener("load", PPM.pOverlay.init, false);
			window.removeEventListener("unload", PPM.pOverlay.uninit, false);
			log("uninited.");
		};
		
		this.LISTENER_pageLoad_tabSelect = function() {
			try {
				if (PPM.get_state() <= 2) {return;}
				//var browser = gBrowser.selectedBrowser;
				//var doc = gBrowser.contentDocument;
				//var href = doc.location.href;
				var CW = PPM.pUtils.getCurrentWindow();
				var TABCNT = CW.gBrowser.selectedBrowser.contentDocument;
				var href = TABCNT.location.href;
				checkForPassCardForUrl(href);
			} catch (e) {
				log("PLTS-LISTENER ERROR: " + e);
			}
		}
		
		this.LISTENER_formSubmit = function() {//------------------------------------------------function for intercepting and registering unknown login/password combinations
			try {
				if (PPM.get_state() <= 2) {return;}//not logged in or no data available
				var DOC = PPM.pUtils.getCurrentWindowDocument();
				var PMM = DOC.getElementById("ParanoiaUtilitiesSubmenu");
				var SEP = DOC.getElementById("PMM_utils");
				
				//remove stale menuitem - PMM_PCREG
				if (DOC.getElementById("PMM_PCREG") != null) {
					PMM.removeChild(DOC.getElementById("PMM_PCREG"));
				}
				
				var pwfield_index = null;
				var unfield_index = null;
				var CW = PPM.pUtils.getCurrentWindow();
				var TABCNT = CW.gBrowser.selectedBrowser.contentDocument;
				var inputNodes = getAllInputNodesInContent(TABCNT);
				
				//check for password field index
				for (var ni = 0; ni < inputNodes.length; ni++) {
					if (inputNodes[ni].getAttribute("type") == "password" && inputNodes[ni].value != null) {
						pwfield_index = ni;
						break;
					}
				}
				
				//check for username field index
				for (var ni = pwfield_index - 1; ni >= 0; ni--) {//go backwards ad find first non hidden text field - should be username
					if (inputNodes[ni].getAttribute("type") != "password" && inputNodes[ni].getAttribute("type") != "hidden" && inputNodes[ni].value != null) {
						unfield_index = ni;
						break;
					}
				}
				if (unfield_index == null || pwfield_index == null) {
					log("INTERCEPTED FORM POST BUT COULD NOT FIND USERNAME OR PASSWORD FIELDS! " + unfield_index+"/"+pwfield_index);
					return;
				}				
				
				//OK - we have username and password fields			
				unfield = inputNodes[unfield_index];
				pwfield = inputNodes[pwfield_index];
				
				if (unfield.value == "" || pwfield.value == "") {
					log("INTERCEPTED FORM POST BUT USERNAME OR PASSWORD FIELDS ARE EMPTY! " + unfield.value+"/"+pwfield.value);
					return;
				}
				
				var already_registered = false;
				var PCUCA = PPM.pServer.getUrlcardsForHREF(TABCNT.location.href);//matching passcards/urlcards for current url
				//
				for (var i = 0; i < PCUCA.length; i++) {
					var PC = (PCUCA[i].get("collection") == "passcard"?PCUCA[i]:PPM.pServer.getPasscardWithID(PCUCA[i].get("parent_id")));
					if (PC.get("username") == unfield.value && PC.get("password") == pwfield.value) {
						already_registered = true;
						break;
					}
				}
				if (already_registered == true) {
					log("THE INTERCEPTED LOGIN IS ALREADY REGISTERED IN PC: " + PC.get("name"));
					return;
				}
				
				log("INTERCEPTED LOGIN NOT REGISTERED: " + unfield.value + " / " + pwfield.value);
				
				//ADDING MENU ITEM SO THAT USER CAN CALL THE REGISTER FUNCTION
				var s = {};
				s.id = "PMM_PCREG";
				s.label = "Register Passcard";
				s.class = "pmm_passurlcard_add";
				s.callback = "LISTENER_PCREG_CLICK";
				s.url = TABCNT.location.href;
				s.username = unfield.value;
				s.password = pwfield.value;
				//
				var CMI = _createNewCustomMenuItem(s);		
				PMM.insertBefore(CMI, SEP);//it's like insertAfter but there is no method like that ;)
				
			} catch (e) {
				log("FORMSUBMIT ERROR: " + e);
			}
		}
		
		this.mainButtonClick = function() {
			var current_state = PPM.get_state();
			if (current_state == 1) {//open login panel
				var xul_2_load_url = 'chrome://paranoia/content/paranoia_login.xul';
				var xul_2_load_width = 500;
				var xul_2_load_height = 300;
				var xul_2_load_params = 'chrome, modal, centerscreen';	
				var WIN = PPM.pUtils.getCurrentWindow();
				WIN.openDialog(xul_2_load_url, "w_paranoia_login", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params);				
			} else if (current_state == 2 || current_state == 3) {//LOGGED IN - OPENING SUBMENU
				var DOC = PPM.pUtils.getCurrentWindowDocument();			
				var mm = DOC.getElementById("ParanoiaMainMenu");
				var tbb = DOC.getElementById("ParanoiaToolbarButton");
				mm.openPopup(tbb, "after_start", 0, 0, false, false);
			} else {
				log("Paranoia is in state: "+current_state+" - action is not defined for this state!");
			}
		}
		
		this.checkUserLoginAttempt = function(masterKeyProposal, encryptionScheme) {
			//log("user login attempt..");
			var mk_check_result = PPM.pConfig.checkMasterLoginKeyAndInitializeSettings(masterKeyProposal,encryptionScheme);
			return(mk_check_result);
		}
		
		
		this.mainMenuItemCall = function (el,ev) {
			var f2c = "mainMenuItemCall_" + el.id;
			//log("MMIC: " + el.id + " -> " + typeof(this[el.id]));
			if (typeof(this[f2c]) == "function") {
				this[f2c].call(this,el,ev);
			} else {
				log("There is no function here by this name:" + f2c);
			}
		}
		
		this.mainMenuItemCall_pmm_config = function(el,ev) {
			log("opening config");
			var myUrl = "chrome://paranoia/content/paranoia_settings.xul";
			var myAttr = "paranoia_settings";
			PPM.pUtils.openTab(myAttr,myUrl);
		}
		
		this.mainMenuItemCall_pmm_logout = function(el,ev) {
			if (PPM.pUtils.confirm("Are you sure you want to log out?","END PARANOIA SESSION")) {
				log("logout confirmed!");
				Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-logged-out", "");
				ev.stopPropagation();
			}
		}
		
		this.mainMenuItemCall_pmm_info = function(el,ev) {
			log("opening PPM web site...");
			var myUrl = "http://paranoia.alfazeta.com";
			var myAttr = "paranoia_website";
			PPM.pUtils.openTab(myAttr,myUrl);
		}
		
		this.mainMenuItemCall_pmm_pwgen = function(el,ev) {
			log("opening Password Generator...");
			var data = {};
			data.CALLBACKFUNCTION = 'pOverlay.mainMenuItemCall_pmm_pwgen_DONE';//do NOT put PPM on front
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_generate_password.xul';
			var xul_2_load_width = 500;
			var xul_2_load_height = 200;
			var xul_2_load_params = 'modal, centerscreen';
			var JSONDATA = JSON.stringify(data);
			window.openDialog(xul_2_load_url, "w_paranoia_edit_setting", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSONDATA);
		}
		
		
		this.mainMenuItemCall_pmm_pwgen_DONE = function(data) {
			log("Inserting generated password in fields: " + data.password);
			//
			var CW = PPM.pUtils.getCurrentWindow();
			var TABCNT = CW.gBrowser.selectedBrowser.contentDocument;
			var inputNodes = getAllInputNodesInContent(TABCNT);
			
			//find password fields and insert pw
			for (var ni = 0; ni < inputNodes.length; ni++) {
				if (inputNodes[ni].getAttribute("type") == "password") {
					inputNodes[ni].value = data.password;
				}
			}
			
		}
		
		
				
		this.LISTENER_PCREG_CLICK = function(ev, CMI){//CMI is custom_menu_item
			try {
				log("OPENING REGFORM TO REGISTER PASSCARD FOR URL: " + CMI.getAttribute("url"));
				
				var data = {};			
				data.elementIndex = 0;
				data.elementID = -1;
				data.elementType = "passcard";
				data.parentID = 0;	
				//
				data.name = "new passcard for window title...";
				data.url = CMI.getAttribute("url");
				data.username = CMI.getAttribute("username");
				data.password = CMI.getAttribute("password");
				//
				data.CALLBACKFUNCTION = 'pOverlay.LISTENER_PCREG_CLICK_DONE';//do NOT put PPM on front
				//
				var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_passcard.xul';
				var xul_2_load_width = 500;
				var xul_2_load_height = 300;
				var xul_2_load_params = 'modal, centerscreen';
				window.openDialog(xul_2_load_url, "w_paranoia_edit_element", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(data));
			} catch (e) {
				log("PCREG ERROR: " + e);
			}			
		}
		
		this.LISTENER_PCREG_CLICK_DONE = function(data){//CMI is custom_menu_item
			//log("passcard registered!");
			var DOC = PPM.pUtils.getCurrentWindowDocument();
			var PMM = DOC.getElementById("ParanoiaUtilitiesSubmenu");	
			//remove stale menuitem - PMM_PCREG
			if (DOC.getElementById("PMM_PCREG") != null) {
				PMM.removeChild(DOC.getElementById("PMM_PCREG"));
			}
			//we call this only so that it refreshes menu items and changes back menuIcon
			PPM.pOverlay.LISTENER_pageLoad_tabSelect();
		}
		
		
		
		this.LISTENER_PWHINT_CLICK = function(ev, CMI) {//CMI is custom_menu_item
			try {
				var label = CMI.getAttribute("label");
				var PASSCARD = CMI.PASSCARD;
				var URLCARD = CMI.URLCARD;
				var additionalFieldsToCheck = new Array();
				if (URLCARD != null) {
					additionalFieldsToCheck = URLCARD.get("additional_fields");
				}					
				//
				var CW = PPM.pUtils.getCurrentWindow();
				var TABCNT = CW.gBrowser.selectedBrowser.contentDocument;
				var inputNodes = getAllInputNodesInContent(TABCNT);
				
				//LET'S AUTOCHECK FOR USERNAME AND PASSWORD FIELDS
				var foundUNPW = autodetect_and_fill_in_username_and_password_fileds(inputNodes,PASSCARD.get("username"),PASSCARD.get("password"));
				if (foundUNPW == false) {
					log("USERNAME AND PASSWORD FIELDS WERE NOT FOUND!");
				}
				
				
				
				//LET'S LOOP THROUGH and fill in additional urlcard fields with their values
				for(var fi=0; fi<additionalFieldsToCheck.length; fi++) {
					for(var ni=0; ni<inputNodes.length; ni++) {
						if (inputNodes[ni].getAttribute("id") == additionalFieldsToCheck[fi]["f_id"] || inputNodes[ni].getAttribute("name") == additionalFieldsToCheck[fi]["f_id"]) {
							fill_in_this_filed(inputNodes[ni], additionalFieldsToCheck[fi]["f_value"]);						
							// now we remove this node from inputNodes, so that if we have form with fields without id and with identical names
							// we can rely on filling in the form as the ordering of the AF objects (where u can register multiple f_id with different values)						
							inputNodes.splice(ni,1);
							break;//let's check for the next field
						}
					}				
				}
				
				
			} catch (e) {
				log("LISTENER_PWHINT_CLICK ERROR: " + e);
			}    
		}
		
		this.observe = function(source, topic, data) {
			//log("observer: " + topic);			
			switch (topic) {
				case "paranoia-overlay-state-change":
					//triggered by main.jsm when changing state
					//log("MAIN HAS CHANGED STATE TO: " + data);
					if (data == 1) {
						_setToolbarButtonIcon("paranoia_32_off.png");	
					} else if (data == 2) {
						_setToolbarButtonIcon("paranoia_32_yellow.png");	
					} else if (data == 3) {
						_setToolbarButtonIcon("paranoia_32.png");
					} else {
						log("MAIN HAS CHANGED STATE TO UNKNOWN STATE: " + data);
					}					
					break;
				default:
					log("No observer action registered for topic: " + topic);
			}
		}
		
		/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
		var autodetect_and_fill_in_username_and_password_fileds = function(inputNodes, username, password) {
			//method: let's find the password field and the node before it 99.9% will be username field
			//unless the node before is a password field again - in that case it should be a registration form so we skip
			//once found we do NOT break out from loop 'coz there could be more than one login forms - i have one site like this out of 100000 but it is there
			var found = false;
			var INL = inputNodes.length;
			for (var ni = 0; ni < INL; ni++) {
				var node = inputNodes[ni];
				//log(ni+"/"+INL + " ->NODE: " + node.getAttribute("name") + " T: " + node.getAttribute("type"));
				//node.setAttribute("style",'border: 1px dashed #777777;');
				if (node.getAttribute("type") == "password") {
					var node_pw = node;
					var node_un = inputNodes[ni-1];//the previous node
					if (node_un.getAttribute("type") != "password" && node_un.getAttribute("type") != "hidden") {
						found = true;
						fill_in_this_filed(node_un, username);
						fill_in_this_filed(node_pw, password);
						inputNodes.splice(ni-1,2);//remove these two nodes
						ni = ni - 2;
						INL = INL - 2;
					}					
				}
			}
			return(found);
		}
		
		var fill_in_this_filed = function(node,val) {
			//node.setAttribute("value", val);
			node.value = val;
			if (PPM.pConfig.getConfig("colorize_matched_fields") == 1) {
				node.setAttribute("style",'background:#7cfc00; color:#7cfc00;');
			}
		}
		
		var checkForPassCardForUrl = function(href) {
			//log("checking for passcards @href: " + href);
			try {
				var DOC = PPM.pUtils.getCurrentWindowDocument();
				var PMM = DOC.getElementById("ParanoiaMainMenu");
				var SEP = DOC.getElementById("PMM_passhints");
				
				_removeAllMenuItems();
				var PCUCA = PPM.pServer.getUrlcardsForHREF(href);

				if (DOC.getElementById("PMM_PCREG") != null) {
					_setToolbarButtonIcon("paranoia_32_blue.png", true);//resetting to default - true===only in current window
				} else 	if (PCUCA.length == 0) {
					_setToolbarButtonIcon("paranoia_32.png", true);//resetting to default - true===only in current window
				} else {
					_setToolbarButtonIcon("paranoia_32_teeth.png", true);//showing that we have passcards - true===only in current window
				}
				
				if (PCUCA.length == 0) {
					return;
				}
				
				
				
				//log("FOUND URLCARDS # " + PCUCA.length + " for HREF: " + href);	
				
				
				for (var i=0; i<PCUCA.length; i++) {
					//var UC = UCA[i];//this can be passcard or urlcard
					if (PCUCA[i].get("collection") == "passcard") {
						var PC = PCUCA[i];
						var UC = null;
					} else {
						var UC = PCUCA[i];
						var PC = PPM.pServer.getPasscardWithID(UC.get("parent_id"));
					}
					
					var s = {};
					s.id = "PMM_PWH_" + i;
					s.passcard_id = PC.get("id");
					s.urlcard_id = (UC!==null?UC.get("id"):"");
					s.label = "[" + PC.get("name") + "]" + (UC!=null?" - " + UC.get("name"):"");
					s.class = "pmm_passurlcard";
					s.callback = "LISTENER_PWHINT_CLICK";
					//
					var CMI = _createNewCustomMenuItem(s);
					CMI.setPasscard(PC);
					CMI.setUrlcard(UC);
	
					PMM.insertBefore(CMI, SEP.nextSibling);//it's like insertAfter but there is no method like that ;)
				}
			} catch(e) {
				log("_checkForPassCardForUrl ERROR: " + e);
			}		
		}
		
		
		var _createNewCustomMenuItem = function(s) {
			var CMI = document.createElementNS(XUL_NS, "menuitem"); // create a new XUL menu item
			
			//setting attributes
			for (var attr in s) {
				CMI.setAttribute(attr, s[attr]);
			}
			
			//adding custom functions on menuitem
			CMI.setPasscard = function(PC) {
				this.PASSCARD = PC;
			}
			CMI.setUrlcard = function(UC) {
				this.URLCARD = UC;
			}			
			
			//adding click listener
			//CMI.addEventListener("click", function(ev) {PPM.pOverlay.LISTENER_PWHINT_CLICK(ev,CMI)}, true);
			if (typeof(CMI.getAttribute("callback")) != "undefined") {
				CMI.addEventListener("click", function(ev) {PPM.pOverlay[CMI.getAttribute("callback")](ev,CMI);}, true);
			}
			
			return (CMI);
		}
		
		var _removeAllMenuItems = function() {
			var DOC = PPM.pUtils.getCurrentWindowDocument();
			var PMM = DOC.getElementById("ParanoiaMainMenu");
			var SEP = DOC.getElementById("PMM_passhints");
			while (SEP.nextSibling != null) {
				PMM.removeChild(SEP.nextSibling);
			}
		}
		
		
		
		
		
		
		
		var getAllInputNodesInContent = function(C) {// returns array of all <input .../> nodes in C
			//
			var answer = new Array();
			var inputs;
			//
			//in content
			inputs = C.getElementsByTagName("input"); 
			for(var ni=0; ni<inputs.length; ni++) {
				answer.push(inputs[ni]);
			}
			
			//in iframes in content
			var iframes = C.getElementsByTagName("iframe");			
			for(var ii=0; ii<iframes.length; ii++) {
				inputs = iframes[ii].contentWindow.document.getElementsByTagName("input");
				for(var ni=0; ni<inputs.length; ni++) {
					answer.push(inputs[ni]);
				}
			}			
			return(answer);
		}
		
		
		var _setToolbarButtonIcon = function(imageName, onlyCurrentWindow) {//var RW = WM.getMostRecentWindow("navigator:browser");
			if (typeof(onlyCurrentWindow) == "undefined") {
				onlyCurrentWindow = false;//ALL WINDOWS
			}		
			if (PPM.get_state() == 1) {//in any case if you are NOT logged in we will put the default off icon
				imageName = "paranoia_32_off.png";
			}
			var imgUrl = "url(chrome://paranoia/skin/images/logo/"+imageName+")";
			//
			if (onlyCurrentWindow === true) {
				var DOC = PPM.pUtils.getCurrentWindowDocument();
				var PTB = DOC.getElementById("ParanoiaToolbarButton");
				if (PTB != null) {
					PTB.style.listStyleImage = imgUrl;
				}
			} else {
				for (var WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getEnumerator("navigator:browser"); WM.hasMoreElements();) {
					var RW = WM.getNext();
					var DOC = RW.document;
					var PTB = DOC.getElementById("ParanoiaToolbarButton");
					if (PTB != null) {
						PTB.style.listStyleImage = imgUrl;
					}
				}
			}
		}
		
		
		var _register_listeners_and_observers = function() {
			log("Registering listeners and observers...");
			try {
				var theBrowser = document.getElementById("appcontent");
				if (theBrowser) {
					theBrowser.addEventListener("DOMContentLoaded", PPM.pOverlay.LISTENER_pageLoad_tabSelect, true);
				}		
				//
				var tabContainer = gBrowser.tabContainer;
				if(tabContainer) {
					tabContainer.addEventListener("TabSelect", PPM.pOverlay.LISTENER_pageLoad_tabSelect, false);
				}
				//FORM SUBMIT EVENT - this will NOT work in all cases(js...) - we need a better way to intercept post
				if(theBrowser) {
					theBrowser.addEventListener("submit", PPM.pOverlay.LISTENER_formSubmit, false);
				}
				//
				var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
				a.addObserver(PPM.pOverlay, "paranoia-overlay-state-change", false);
			} catch(e) {
				log("Listener/Observer registration ERROR: " + e);
			}
		}
		
		var _unregister_listeners_and_observers = function() {
			log("Removing listeners and observers...");
			try {
				var theBrowser = document.getElementById("appcontent");
				if (theBrowser) {
					theBrowser.removeEventListener("DOMContentLoaded", PPM.pOverlay.LISTENER_pageLoad_tabSelect, true);
					tabContainer.removeEventListener("submit", PPM.pOverlay.LISTENER_formSubmit, false);
				}
				//
				var tabContainer = gBrowser.tabContainer;
				if(tabContainer) {
					tabContainer.removeEventListener("TabSelect", PPM.pOverlay.LISTENER_pageLoad_tabSelect, false);					
				}
				//
				var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
				a.removeObserver(PPM.pOverlay, "paranoia-overlay-state-change");
			} catch(e) {
				log("Listener/Observer unregistration ERROR: " + e);
			}
		}
		
		var log = function(msg) {PPM.log(msg,_logzone);}
	}
	
	//
	this.pOverlay = new ParanoiaOverlay;
	window.addEventListener("load", ParanoiaPasswordManager.pOverlay.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.pOverlay.uninit, false);
}).apply(ParanoiaPasswordManager);

