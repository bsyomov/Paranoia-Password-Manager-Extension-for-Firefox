//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var _data = null;
	
	this.XUL.init = function() {
		if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
			try {
				var _data_json = window.arguments[0];
				_data = JSON.parse(_data_json);
				
				document.getElementById("title").value = "Strong Password Generator";
				document.getElementById("description").value = "Generate a secure password to use...";
				//
				document.getElementById("password").oninput = PPM.XUL.passwordFieldChange;
				PPM.XUL.generate_password();
			} catch (e) {
				PPM.XUL.log("ERROR - " + e);
			}
		} else {
			PPM.XUL.log("no arguments!");
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
		_data.password = document.getElementById("password").value;
		PPM.XUL.doCallback();
		close();
	}
		
	this.XUL.generate_password = function() {
		var pw = PPM.pUtils.generatePassword();
		//PPM.XUL.log("PW: " + pw);
		document.getElementById("password").value = pw;
		PPM.XUL.passwordFieldChange();
	}
	
	this.XUL.passwordFieldChange = function() {
		var pwstrength = PPM.pUtils.getPasswordStrength("NeedToGetUsernameFromForm", document.getElementById("password").value);
		//PPM.XUL.log("PWCH: " + pwstrength.score);
		document.getElementById("pwmeter").value = pwstrength.score;
		document.getElementById("pwstatus").value = pwstrength.status;
	}
	
	this.XUL.doCallback = function() {
		try {
			var _CALLBACKFUNCTIONSTRING = _data.CALLBACKFUNCTION;
			var fa = _CALLBACKFUNCTIONSTRING.split(".");
			var f = PPM;
			for (var i=0;i<fa.length;i++) {
				var fn = fa[i];
				f = f[fn];
			}
			if (typeof(f) == "function") {
				f.call(null, _data);
			} else {
				throw("CALLBACK ERROR: PPM." + _CALLBACKFUNCTIONSTRING + " IS NOT A CALLABLE FUNCTION!");
			}
		} catch(e) {
			PPM.log("CALLBACK ERROR: " + e);
			//alert("FATAL ERROR! - the requested procedure could not be found!");
		}
	}
	
	
	this.XUL.log = function(msg) {
		PPM.log(msg, "PWGEN");
	}
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
