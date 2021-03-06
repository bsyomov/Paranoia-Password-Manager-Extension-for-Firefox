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
			_update_toolbar_button_icon();
			log("inited.");
		}		
		
		this.uninit = function() {
			log("uniniting...");
			_unregister_listeners_and_observers();
			window.removeEventListener("load", PPM.pOverlay.init, false);
			window.removeEventListener("unload", PPM.pOverlay.uninit, false);
			log("uninited.");
		};
		
		this.LISTENER_tabSelect = function() {
			try {pgLoadTbSelElab();} catch (e) {log("TS-LISTENER ERROR: " + e);	}
		}		
		this.LISTENER_pageLoad = function() {
			try {pgLoadTbSelElab()} catch (e) {log("PL-LISTENER ERROR: " + e);}
		}		
		var pgLoadTbSelElab = function() {
			try {
				if (PPM.get_state() <= 2) {return;}			
				var CTD = PPM.pUtils.getCurrentTabDocument();
				checkForPassCardForUrl(CTD.location.href);
			} catch (e) {
				log("PLTSelab- ERROR: " + e);
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
		
		this.mainMenuItemCall_pmm_pwgen = function(el,ev) {//OPEN PASSWORD GENERATOR
			log("opening Password Generator...");
			var data = {};
			data.CALLBACKFUNCTION = 'pOverlay.mainMenuItemCall_pmm_pwgen_DONE';//do NOT put PPM on front
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_generate_password.xul';
			var xul_2_load_width = 500;
			var xul_2_load_height = 200;
			var xul_2_load_params = 'modal, centerscreen';
			var JSONDATA = JSON.stringify(data);
			try {
				var WIN = PPM.pUtils.getCurrentWindow();
				WIN.openDialog(xul_2_load_url, "w_paranoia_pwgen", "width=" + xul_2_load_width + ", height=" + xul_2_load_height + "," + xul_2_load_params, JSONDATA);
			} catch(e) {
				log ("WINDOW OPENDIALOG ERROR: " + e);				
			}
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
		
		this.mainMenuItemCall_pmm_newpc = function(el, ev) {//OPEN NEW PASSCARD REGISTRATION FORM
			try {
				log("OPENING REGFORM TO REGISTER NEW PASSCARD");
				var CW = PPM.pUtils.getCurrentWindow();
				var CTD = PPM.pUtils.getCurrentTabDocument();
				//
				var data = {};			
				data.elementIndex = 0;
				data.elementID = -1;
				data.elementType = "passcard";
				data.parentID = 0;	
				//
				
				data.name = CTD.title;
				data.url = CTD.location.href;
				data.username = '';
				data.password = '';
				//
				data.CALLBACKFUNCTION = 'pOverlay.mainMenuItemCall_pmm_newpc_DONE'; //do NOT put PPM on front
				//
				var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_passcard.xul';
				var xul_2_load_width = 500;
				var xul_2_load_height = 300;
				var xul_2_load_params = 'modal, centerscreen';
				CW.openDialog(xul_2_load_url, "w_paranoia_edit_element", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(data));
			} catch (e) {
				log("NEW PCREG ERROR: " + e);
			}
		}
		
		this.mainMenuItemCall_pmm_newpc_DONE = function(data) {
			try {
				pgLoadTbSelElab();
			} catch(e) {
				log("NEWPC_DONE error: " + e);
			}
		}
				
		
		this.PWHINT_CLICK_FILLIN = function(ev, CMI) {//CMI is custom_menu_item
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
								
				//URLCARD - LET'S LOOP THROUGH and fill in additional urlcard fields with their values
				for(var fi=0; fi<additionalFieldsToCheck.length; fi++) {
					var field_identificator = additionalFieldsToCheck[fi]["f_id"];
					var field_value = additionalFieldsToCheck[fi]["f_value"];
					for(var ni=0; ni<inputNodes.length; ni++) {						
						if (inputNodes[ni].getAttribute("id") == field_identificator || inputNodes[ni].getAttribute("name") == field_identificator) {
							var filledIn = false;
							if (inputNodes[ni].getAttribute("type") == "radio" || inputNodes[ni].getAttribute("type") == "checkbox") {
								if (inputNodes[ni].getAttribute("value") == field_value) {
									fill_in_this_filed(inputNodes[ni], field_value);
									filledIn = true;
								}
							} else {
								fill_in_this_filed(inputNodes[ni], field_value);
								filledIn = true;
							}
							// now we remove this node from inputNodes, so that if we have form with fields without id and with identical names
							// we can rely on filling in the form as the ordering of the AF objects (where u can register multiple f_id with different values)		
							if (filledIn === true) {
								inputNodes.splice(ni, 1);
								break;//let's check for the next field
							}
						}						
					}				
				}
				
				//PASSCARD - LET'S AUTOCHECK FOR USERNAME AND PASSWORD FIELDS
				//we do this after urlcard additional_fields 'coz like this we can override with urlcard the passcard values
				autodetect_and_fill_in_username_and_password_fileds(inputNodes,PASSCARD.get("username"),PASSCARD.get("password"));
				
				//this is so that menu closes when you click on menu element
				ev.stopPropagation();				
				var DOC = PPM.pUtils.getCurrentWindowDocument();	
				var mm = DOC.getElementById("ParanoiaMainMenu");
				mm.hidePopup();
			} catch (e) {
				log("LISTENER_PWHINT_CLICK ERROR: " + e);
			}
		}
		this.PWHINT_CLICK_EDIT = function(ev, CMI){//CMI is custom_menu_item
			try {
				var CW = PPM.pUtils.getCurrentWindow();
				var PASSCARD = CMI.PASSCARD;
				var URLCARD = CMI.URLCARD;
				var TYPE = (URLCARD==null?"passcard":"urlcard");
				var ELEMENT = (TYPE=="passcard"?PASSCARD:URLCARD);
				var ID = ELEMENT.get("id");
				log("EDIT CMI("+TYPE+"): " + ID);				
				//
				var data = {};
				data.elementType = TYPE;
				data.elementID = ID;
				data.elementIndex = 0;				
				data.parentID = (TYPE=="urlcard"?PASSCARD.get("id"):0);
				//
				data.CALLBACKFUNCTION = 'pOverlay.PWHINT_CLICK_EDIT_DONE'; //do NOT put PPM on front
				//
				if (TYPE == "passcard") {
					var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_passcard.xul';
					var xul_2_load_width = 500;
					var xul_2_load_height = 300;
				} else if (data.elementType == "urlcard") {
					var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_urlcard.xul';
					var xul_2_load_width = 700;
					var xul_2_load_height = 600;
				} else {return;}
				var xul_2_load_params = 'modal, centerscreen';
				CW.openDialog(xul_2_load_url, "w_paranoia_edit_element", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(data));	
			} catch (e) {
				log("PWHINT_CLICK_EDIT ERROR: " + e);
			}
			
		}
		this.PWHINT_CLICK_EDIT_DONE = function(data) {
			try {
				log("PWHINT_CLICK_EDIT_DONE");
				pgLoadTbSelElab();
			} catch(e) {
				log("NEWPC_DONE error: " + e);
			}
		}
		
		
		
		this.PWHINT_CLICK_CP_USR = function(ev, CMI){//CMI is custom_menu_item
			try {
				log("CPUSR CMI");
				var CLIP = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
				CLIP.copyString(CMI.PASSCARD.get("username"));
			} catch(e) {
				log("PWHINT_CLICK_CP_USR error: " + e);
			}
		}
		this.PWHINT_CLICK_CP_PWD = function(ev, CMI){//CMI is custom_menu_item
			try {
				log("CPPWD CMI");
				var CLIP = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
				CLIP.copyString(CMI.PASSCARD.get("password"));
			} catch(e) {
				log("PWHINT_CLICK_CP_PWD error: " + e);
			}
		}
		
		
		
		
		this.observe = function(source, topic, data) {
			//log("observer: " + topic);			
			switch (topic) {
				case "paranoia-overlay-state-change":
					//triggered by main.jsm or serverConcentrator when changing PPM state or servers state
					_update_toolbar_button_icon();
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
			var ni, node, node_pw, node_un;
			var INL = inputNodes.length;
			for (ni = 0; ni < INL; ni++) {
				node = inputNodes[ni];
				//log(ni+"/"+INL + " ->NODE: " + node.getAttribute("name") + " T: " + node.getAttribute("type"));
				//node.setAttribute("style",'border: 1px dashed #777777;');
				if (node.getAttribute("type") == "password") {
					node_pw = node;
					fill_in_this_filed(node_pw, password);
					node_un = inputNodes[ni-1];//the previous node
					if (node_un.getAttribute("type") != "password" && node_un.getAttribute("type") != "hidden") {
						fill_in_this_filed(node_un, username);
						inputNodes.splice(ni-1,2);//remove both nodes
						ni -= 2;
						INL -= 2;
					} else {
						inputNodes.splice(ni,1);//remove only password field node
						ni -= 1;
						INL -= 1;
					}
				}
			}
			//!! - this method should return spliced inputnodes array!!! 
		}
		
		var fill_in_this_filed = function(node,val) {
			try {
				if (node.getAttribute("type") == "radio" || node.getAttribute("type") == "checkbox") {
					node.checked = true;
				} else 	if (node.tagName.toLowerCase() == "select") {
					var options = node.getElementsByTagName("option");
					for (var oi = 0; oi < options.length; oi++) {
						if (options[oi].getAttribute("value") == val) {
							options[oi].setAttribute("selected", "selected");
							node.selectedIndex = oi;
						} else {
							options[oi].removeAttribute("selected");
						}
					}
				} else {
					node.value = val;
					node.setAttribute("value", val);
				}
				if (PPM.pConfig.getConfig("colorize_matched_fields") == 1) {
					node.setAttribute("style", 'background:#7cfc00; color:#7cfc00;');
				}
			} catch(e) {
				log("NODE FILL IN ERROR: " + e);
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
				//log("FOUND URLCARDS # " + PCUCA.length + " for HREF: " + href);	
				
				
				//
				for (var i=0; i<PCUCA.length; i++) {
					var s = {};
					s.menuItemType = PCUCA[i].get("collection");
					//
					if (PCUCA[i].get("collection") == "passcard") {
						var PC = PCUCA[i];
						var UC = null;
					} else {
						var UC = PCUCA[i];
						var PC = PPM.pServer.getPasscardWithID(UC.get("parent_id"));
					}
					//					
					s.id = "PMM_PWH_" + i;
					s.passcard_id = PC.get("id");
					s.urlcard_id = (UC!==null?UC.get("id"):"");
					s.label = "[" + PC.get("name") + "]" + (UC!=null?" - " + UC.get("name"):"");					
					//
					var CMI = _createUrlPassCardMenuItem(s);
					CMI.setPasscard(PC);
					CMI.setUrlcard(UC);
					//
					PMM.insertBefore(CMI, SEP.nextSibling);//it's like insertAfter but there is no method like that ;)
				}				
				_update_toolbar_button_icon();
				
			} catch(e) {
				log("checkForPassCardForUrl ERROR: " + e);
			}		
		}
		
		var _createUrlPassCardMenuItem = function(s) {
			var CWD = PPM.pUtils.getCurrentWindowDocument();
			//
			var MENU = CWD.createElementNS(XUL_NS, "menu");
			var MENUPOPUP = CWD.createElementNS(XUL_NS, "menupopup");
			var MI_FILL = CWD.createElementNS(XUL_NS, "menuitem");
			var MI_EDIT = CWD.createElementNS(XUL_NS, "menuitem");
			var MI_CP_USR = CWD.createElementNS(XUL_NS, "menuitem");
			var MI_CP_PWD = CWD.createElementNS(XUL_NS, "menuitem");
			MENUPOPUP.appendChild(MI_FILL);			
			MENUPOPUP.appendChild(MI_CP_USR);
			MENUPOPUP.appendChild(MI_CP_PWD);
			MENUPOPUP.appendChild(MI_EDIT);
			MENU.appendChild(MENUPOPUP);
			//
			
			//MENU attributes
			//for (var attr in s) {MENU.setAttribute(attr, s[attr]);}
			MENU.setAttribute('id', s.id);
			MENU.setAttribute('label', s.label);
			MENU.setAttribute('class', 'menu-iconic pmm_passurlcard clickable');
			MENU.setAttribute('passcard_id', s.passcard_id);
			MENU.setAttribute('urlcard_id', s.urlcard_id);
			
			
			
			//MENU ITEM attributes
			MI_FILL.setAttribute('id', s.id+"_fill");
			MI_FILL.setAttribute('label', 'fill in ' + s.menuItemType);
			MI_FILL.setAttribute('class', 'pmm_fillin clickable menuitem-iconic');
			
			MI_CP_USR.setAttribute('id', s.id+"_cpusr");
			MI_CP_USR.setAttribute('label', 'copy username');
			MI_CP_USR.setAttribute('class', 'pmm_copy clickable menuitem-iconic');
			
			MI_CP_PWD.setAttribute('id', s.id+"_cppwd");
			MI_CP_PWD.setAttribute('label', 'copy password');
			MI_CP_PWD.setAttribute('class', 'pmm_copy clickable menuitem-iconic');
			
			MI_EDIT.setAttribute('id', s.id+"_edit");
			MI_EDIT.setAttribute('label', 'edit ' + s.menuItemType);
			MI_EDIT.setAttribute('class', 'pmm_edit clickable menuitem-iconic');
			
						
			//adding custom functions on menuitem
			MENU.setPasscard = function(PC) {
				this.PASSCARD = PC;
			}
			MENU.setUrlcard = function(UC) {
				this.URLCARD = UC;
			}			
			
			//MENU click			
			MENU.addEventListener("click", function(ev) {
				//log("MMCLICK(target): " + ev.target.getAttribute("id"));
				//log("MMCLICK(currentTarget): " + ev.currentTarget.getAttribute("id"));
				//this func is executed even if you click on child menuitem so the below if is necessary to make sure PWHINT_CLICK_FILLIN is executed ONLY when clicking MENU
				if (ev.target.getAttribute("id") == ev.currentTarget.getAttribute("id")) {
					PPM.pOverlay.PWHINT_CLICK_FILLIN(ev,MENU);
				}
			}, true);
			
			//MENUITEM click - MI_FILL
			MI_FILL.addEventListener("click", function(ev) {
				//ev.stopPropagation();
				PPM.pOverlay.PWHINT_CLICK_FILLIN(ev,MENU);
			}, true);
			//MENUITEM click - MI_CP_USR
			MI_CP_USR.addEventListener("click", function(ev) {
				//ev.stopPropagation();
				PPM.pOverlay.PWHINT_CLICK_CP_USR(ev,MENU);
			}, true);
			//MENUITEM click - MI_CP_PWD
			MI_CP_PWD.addEventListener("click", function(ev) {
				//ev.stopPropagation();
				PPM.pOverlay.PWHINT_CLICK_CP_PWD(ev,MENU);
			}, true);
			//MENUITEM click - MI_EDIT
			MI_EDIT.addEventListener("click", function(ev) {
				//ev.stopPropagation();
				PPM.pOverlay.PWHINT_CLICK_EDIT(ev,MENU);
			}, true);			
			
			
			return (MENU);
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
			var i, ni;
			
			try {//in content				
				inputs = C.getElementsByTagName("input");
				for (ni = 0; ni < inputs.length; ni++) {
					answer.push(inputs[ni]);
				}
				inputs = C.getElementsByTagName("select");
				for (ni = 0; ni < inputs.length; ni++) {
					answer.push(inputs[ni]);
				}
			} catch(e){}
			
			try {//in IFRAME in content
				var iframes = C.getElementsByTagName("iframe");			
				for(i=0; i<iframes.length; i++) {
					inputs = iframes[i].contentWindow.document.getElementsByTagName("input");
					for(ni=0; ni<inputs.length; ni++) {
						answer.push(inputs[ni]);
					}
				}
			} catch(e){}
			
			try {//in FRAME in content
				var frames = C.getElementsByTagName("frame");	
				for(i=0; i<frames.length; i++) {
					inputs = frames[i].contentWindow.document.getElementsByTagName("input");
					for(ni=0; ni<inputs.length; ni++) {
						answer.push(inputs[ni]);
					}
				}
			} catch(e){}
			//	
			return(answer);
		}
		
		var _update_toolbar_button_icon = function() {
			var currentWindowOnly = false;
			var icon_state = 'off';
			var icon_badge = "";
			
			
			//ICON STATE
			var icon_state = 'off';
			if (PPM.get_state() <= 1) {
				icon_state = 'off';
			} else if (PPM.get_state() == 2) {
				icon_state = 'yellow';
			} else if (PPM.get_state() == 3) {
				icon_state = 'on';
			}
			
			//ICON BADGE - we only use badges in ON state
			if (PPM.get_state() == 3) {
				//SERVER ERROR - check if all servers are connected
				if (PPM.pServer.checkIfAllServersAreConnected("master") === false) {
					icon_badge = "servererror";
				}
				
				//INTERCEPTED REG INFO
				if (icon_badge == "") {
					var DOC = PPM.pUtils.getCurrentWindowDocument();
					if (DOC.getElementById("PMM_PCREG") != null) {
						icon_badge = "intercept";
						var currentWindowOnly = true;
					}
				}
				
				//HAS PASSCARD
				if (icon_badge == "") {
					var DOC = PPM.pUtils.getCurrentWindowDocument();
					var SEP = DOC.getElementById("PMM_passhints");
					if (SEP.nextSibling != null) {
						icon_badge = "passcard";
						var currentWindowOnly = true;
					}
				}
			}
			
			//SETIT
			var elArray = new Array();
			if (currentWindowOnly === true) {
				var DOC = PPM.pUtils.getCurrentWindowDocument();
				var PTB = DOC.getElementById("ParanoiaToolbarButton");
				if (PTB != null) {
					elArray.push(PTB);
				}
			} else {
				for (var WM = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getEnumerator("navigator:browser"); WM.hasMoreElements();) {
					var RW = WM.getNext();
					var DOC = RW.document;
					var PTB = DOC.getElementById("ParanoiaToolbarButton");
					if (PTB != null) {
						elArray.push(PTB);
					}
				}
			}
			
			log("setting overlay icon state("+elArray.length+"): " + icon_state + "   badge: " + icon_badge);
			for (var i=0; i<elArray.length; i++) {
				elArray[i].setAttribute("state", icon_state);
				elArray[i].setAttribute("badge", icon_badge);
				
			}
		}
		
		
		
		var _register_listeners_and_observers = function() {
			log("Registering listeners and observers...");
			try {
				var theBrowser = document.getElementById("appcontent");
				if (theBrowser) {
					theBrowser.addEventListener("DOMContentLoaded", PPM.pOverlay.LISTENER_pageLoad, true);
					//FORM SUBMIT EVENT - this will NOT work in all cases(js...) - we need a better way to intercept post
					//theBrowser.addEventListener("submit", PPM.pOverlay.LISTENER_formSubmit, false);
				}		
				//
				var tabContainer = gBrowser.tabContainer;
				if(tabContainer) {
					tabContainer.addEventListener("TabSelect", PPM.pOverlay.LISTENER_tabSelect, false);
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
				if (typeof(theBrowser) != "undefined") {
					theBrowser.removeEventListener("DOMContentLoaded", PPM.pOverlay.LISTENER_pageLoad, true);
					//theBrowser.removeEventListener("submit", PPM.pOverlay.LISTENER_formSubmit, false);
				}
				//
				var tabContainer = gBrowser.tabContainer;
				if(typeof(tabContainer) != "undefined") {
					tabContainer.removeEventListener("TabSelect", PPM.pOverlay.LISTENER_tabSelect, false);					
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

