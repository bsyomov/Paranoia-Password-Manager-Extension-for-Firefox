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
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
