//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var _ES;
	var _MK;
	var _CALLBACKFUNCTION;
	
	this.XUL.init = function() {
		var _data_json = window.arguments[0];
    	var data = JSON.parse(_data_json);
		_ES = data.ES;
		_MK = data.MK;
		_CALLBACKFUNCTION = data.CALLBACKFUNCTION;//!!! this is a string
		
		if (_ES==null || _MK==null || _CALLBACKFUNCTION==null) {
			alert("FATAL ERROR! - NO DATA!" + JSON.stringify(data));
			close();
			return;
		}

		
		ESList = PPM.pUtils.getAvailableEncryptionSchemes();		
		var ESS = document.getElementById("ESS");
	
		//let's feed ESs to ESS and select current one
		for (x=0; x<ESList.length; x++) {
			ESS.appendItem(ESList[x].name,ESList[x].name);
	        if (ESList[x].name == _ES) {
	        		ESS.selectedIndex = x;
	        		document.getElementById("encdesc").value = ESList[x].description;
	        }
		}
		
		//let's show current MK	
		document.getElementById("masterkey").value = _MK;
		
		//title and description
		document.getElementById("title").value = data.title;
		document.getElementById("description").value = data.description;		
	
	}
	
	this.XUL.uninit = function() {
		window.removeEventListener("load", PPM.XUL.init, false);
		window.removeEventListener("unload", PPM.XUL.uninit, false);
		delete(PPM.XUL);//suicide
	}
	
	this.XUL.w_close = function() {
		close();
	}
	
	this.XUL.w_change = function() {
		var ESN = document.getElementById("ESS").value;
		if (ESN == null) {
			document.getElementById("sysmsg").value = "No Encryption Scheme selected!";
			return false;
		}
		var ES = PPM.pUtils.checkEncriptionScheme(ESN);
		if (ES == false) {
			document.getElementById("sysmsg").value = "Invalid Encryption Scheme selected!";
			return false;
		}
		var pwcheck = PPM.pUtils.schemePasswordCheck(document.getElementById("masterkey").value,ESN);
		if (pwcheck !== true) {
			document.getElementById("sysmsg").value = pwcheck;
			return false;
		}
		
		//PPM.log("calling: " + _CALLBACKFUNCTION);
		
		try {
			var fa = _CALLBACKFUNCTION.split(".");
			var f = PPM;
			for (var i=0;i<fa.length;i++) {
				var fn = fa[i];
				f = f[fn];
			}
			if (typeof(f) == "function") {
				f.call(null, document.getElementById("masterkey").value, ESN);
			} else {
				throw("ERROR");
			}
		} catch(e) {
			PPM.log("There is no function in PPM by this name:" + _CALLBACKFUNCTION + " - " + e);
			alert("FATAL ERROR! - the requested procedure could not be found!");
		}
		close();
	}
	
	
	this.XUL.w_es_select = function() {
		var ESN = document.getElementById("ESS").value;
		var ES = PPM.pUtils.checkEncriptionScheme(ESN);
		if (ES == false) {
			alert("This ES["+ESN+"] does NOT exist!");
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


