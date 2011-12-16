//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var pass_shown = false;
	
	this.XUL.init = function() {
		//ParanoiaPasswordManager.log("initing");
		var ESList = PPM.pUtils.getAvailableEncryptionSchemes();
		var ESS = document.getElementById("ESS");
		for (x = ESList.length-1; x >= 0; x--) {
			ESS.appendItem(ESList[x].name,ESList[x].name);
			//PPM.log(x + "-adding option: " + ESList[x].name, "LOGIN");
		}
		ESS.selectedIndex = 0;
		document.getElementById("masterkey").focus();
		//document.getElementById("loginSubmit").focus();
		
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
		//PPM.log("selected option: " + ESN, "LOGIN");
	}
	
	this.XUL.show_hide_password = function() {
		if (pass_shown){
			pass_shown = false;
			document.getElementById("pass_toggler").setAttribute("class","lock_closed");
			document.getElementById("masterkey").setAttribute("type","password");
		} else {
			pass_shown = true;
			document.getElementById("pass_toggler").setAttribute("class","lock_opened");		
			document.getElementById("masterkey").removeAttribute("type");
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
	
	/*-----------------------------------------------------------------------------------------------------------------------------------IMPORT / RESET*/
	this.XUL.import_reset_config = function() {
		document.getElementById("loginpanel").setAttribute("class", "nodisplay");
		document.getElementById("impresPanel").removeAttribute("class");		
	}	
	this.XUL.IR_cancel = function(){
		document.getElementById("loginpanel").removeAttribute("class");
		document.getElementById("impresPanel").setAttribute("class", "nodisplay");
	}
	
	this.XUL.IR_reset = function(){
		if (document.getElementById("cfgCnt").value != "reset") {
			PPM.pUtils.alert("Type 'reset' in the above box to confirm!", "CONFIRM TO RESET");
			return;
		}
		if (!PPM.pUtils.confirm("Are you sure you want to reset your configuration?", "CONFIRM TO RESET #1")) {return;}
		if (!PPM.pUtils.confirm("Are you really sure you want to reset your configuration?", "CONFIRM TO RESET #2")) {return;}
		if (!PPM.pUtils.confirm("Are you REALLY REALLY sure you want to reset your configuration?", "CONFIRM TO RESET #3")) {return;}
		//GO AHEAD
		PPM.log("resetting");
		PPM.pConfig.removeEntireBranch();
		PPM.pUtils.alert("DONE!\nYour default login is:\nES: AesMd5\nMK: Paranoia\n\nRestarting Browser...", "RESTART");
		close();
		var nsIAppStartup = Components.interfaces.nsIAppStartup;
		Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup).quit(nsIAppStartup.eForceQuit|nsIAppStartup.eRestart);		
	}
	
	this.XUL.IR_import = function() {
		if (document.getElementById("cfgCnt").value == "") {
			PPM.pUtils.alert("There is nothing in the box!", "Nothing to import!");
			return;
		}
		if (!PPM.pUtils.confirm("Are you sure you want to import this configuration?", "CONFIRM TO IMPORT #1")) {return;}
		if (!PPM.pUtils.confirm("Are you really sure you want to import this configuration?", "CONFIRM TO IMPORT #2")) {return;}
		if (!PPM.pUtils.confirm("Are you REALLY REALLY sure you want to import this configuration?", "CONFIRM TO IMPORT #3")) {return;}
		//GO AHEAD
		PPM.log("importing");
		var cryptedSettings = document.getElementById("cfgCnt").value;
		//when exporting this version has quotes on front and end of string which we dont need
		//PPM.log("cryptedSettings: " + cryptedSettings);
		cryptedSettings = (cryptedSettings.substr(0,1)=='"'?cryptedSettings.substr(1):cryptedSettings);//get rid of the front one
		cryptedSettings = (cryptedSettings.substr(cryptedSettings.length-1,1)=='"'?cryptedSettings.substr(0,cryptedSettings.length-1):cryptedSettings);//get rid of the end one
		//PPM.log("cryptedSettings: " + cryptedSettings);
		PPM.pConfig.substituteEntireBranch(cryptedSettings);
		PPM.pUtils.alert("DONE!\nYour configuration has been imported\n\nRestarting Browser...", "RESTART");
		close();
		var nsIAppStartup = Components.interfaces.nsIAppStartup;
		Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup).quit(nsIAppStartup.eForceQuit|nsIAppStartup.eRestart);
	}
	
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
