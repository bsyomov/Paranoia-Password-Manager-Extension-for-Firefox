//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var _data = null;
	var ESList;
	
	this.XUL.init = function() {
		if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
			try {
				var _data_json = window.arguments[0];
				_data = JSON.parse(_data_json);
				
				document.getElementById("number").value = _data["number"];
				document.getElementById("type").value = _data["type"];	
				document.getElementById("name").value = _data["name"];
				document.getElementById("url").value = _data["url"];
				document.getElementById("username").value = _data["username"];
				document.getElementById("password").value = _data["password"];
				document.getElementById("ping_interval_ms").value = _data["ping_interval_ms"];
				
				
				//SOME STUFF WILL ONLY BE ALLOWED ON DISCONNECTED SERVERS
				if (_data["is_connected"] === true) {
					document.getElementById("url").setAttribute("disabled", "true");
					document.getElementById("username").setAttribute("disabled", "true");
					document.getElementById("password").setAttribute("disabled", "true");
				}
				
				//ENCRYPTION SCHEME AND MASTER KEY
				var ESS = document.getElementById("ESS");
				ESList = PPM.pUtils.getAvailableEncryptionSchemes();
				
				//let's feed ESs to ESS and select current one
				for (x=0; x<ESList.length; x++) {
					ESS.appendItem(ESList[x].name,ESList[x].name);
			        if (ESList[x].name == _data["encryption_scheme"]) {
			        		ESS.selectedIndex = x;
			        		document.getElementById("encdesc").value = ESList[x].description;
			        }
				}			
				//let's show current MK	
				document.getElementById("masterkey").value = _data["master_key"];
				
		
				//
			} catch (e) {
				log("ERROR - " + e);
				log("ERROR - ARGUMENTS: " + _data_json);
			}
		} else {
			log("no arguments!");
		}
	}
	
	this.XUL.uninit = function() {
		window.removeEventListener("load", PPM.XUL.init, false);
		window.removeEventListener("unload", PPM.XUL.uninit, false);
		delete(PPM.XUL);//suicide
	}
	
	this.XUL.w_close = function() {
		close();
	}
	
	this.XUL.w_save = function() {
		if (document.getElementById("name").value.length == 0) {
			alert("Field server name cannot be empty!");
			return false;
		}
		
		var ping_interval_ms = parseInt(document.getElementById("ping_interval_ms").value);
		if (isNaN(ping_interval_ms)) {
			alert("Ping interval must be numeric!");
			return false;
		}
		if (ping_interval_ms < 1000) {
			alert("Ping interval cannot be less than 1000!");
			return false;
		}
		_data["name"] = document.getElementById("name").value;
		_data["ping_interval_ms"] = ping_interval_ms;
		
		if (_data["is_connected"] === false) {
			
			if (document.getElementById("url").value.length == 0) {
				alert("Field server url cannot be empty!");
				return false;
			}
			if (document.getElementById("username").value.length == 0) {
				alert("Field username cannot be empty!");
				return false;
			}
			if (document.getElementById("password").value.length == 0) {
				alert("Field password cannot be empty!");
				return false;
			}
			
			_data["url"] = document.getElementById("url").value;
			_data["username"] = document.getElementById("username").value;
			_data["password"] = document.getElementById("password").value;
			
		}
		
		////ENCRYPTION SCHEME AND MASTER KEY
		var ES = document.getElementById("ESS").value;
		var MK = document.getElementById("masterkey").value;
		if (ES == null) {
			alert("No Encryption Scheme selected!");
			return false;
		}
		var ESPWCHK = PPM.pUtils.schemePasswordCheck(MK,ES);
		if (ESPWCHK !== true) {
			alert("PASSWORD CHECK FOR SCHEME \""+ES+"\" FAILED!\n" + ESPWCHK);
			return false;
		}
		_data["encryption_scheme"] = ES;
		_data["master_key"] = MK;
		
		try {
			PPM.pSettings.SERVER.PSERV_click_edit_done(_data);
		} catch(e) {
			alert(e);
		}
		close();
	}
	
	this.XUL.w_es_select = function() {
		var ESN = document.getElementById("ESS").value;
		var ES = PPM.pUtils.checkEncriptionScheme(ESN);
		if (ES == false) {
			//alert("This ES["+ESN+"] does NOT exist!");
			return(false);
		}
		//
		for (x=0; x<ESList.length; x++) {
			if (ESList[x].name == ESN) {
				var ESDESC = ESList[x].description;
				break;
			}
		}
		document.getElementById("encdesc").value = ESDESC;
	}
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
