//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	
	this.XUL.init = function() {
		//ParanoiaPasswordManager.log("initing");
		var ESList = PPM.pUtils.getAvailableEncryptionSchemes();
		var ESS = document.getElementById("ESS");
		for (x=0; x<ESList.length; x++) {
	        ESS.appendItem(ESList[x].name,ESList[x].name);
		}
	}
	
	this.XUL.uninit = function() {
		//ParanoiaPasswordManager.log("uniniting");
		window.removeEventListener("load", PPM.XUL.init, false);
		window.removeEventListener("unload", PPM.XUL.uninit, false);
		delete(PPM.XUL);//suicide
	}
	
	this.XUL.es_select = function() {
		var ESN = document.getElementById("ESS").value;
		var ES = PPM.pUtils.checkEncriptionScheme(ESN);
		if (ES == false) {
			alert("This ES["+ESN+"] does NOT exist!");
			return(false);
		}
	}
	
	this.XUL.login = function() {
		var ESN = document.getElementById("ESS").value;
		if (ESN == null) {
			document.getElementById("sysmsg").value = "No Encryption Scheme selected!";
			return false;
		}
		var ES = PPM.pUtils.checkEncriptionScheme(ESN);
		if (ES == false) {
			document.getElementById("sysmsg").value = "This ES["+ESN+"] does NOT exist!";
			return(false);
		}
		
		var mk_check_result = PPM.pOverlay.checkUserLoginAttempt(document.getElementById("masterkey").value,ESN); 
		if (mk_check_result == true) {
			close();
		} else {
			document.getElementById("sysmsg").value = "Invalid Master Key or Encryption Scheme!";
		}
	}
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
