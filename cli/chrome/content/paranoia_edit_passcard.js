//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var _data = null;
	var PC = null;
	var is_new = false;
	var pass_shown = false;
	
	this.XUL.init = function() {
		if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
			try {
				var _data_json = window.arguments[0];
				_data = JSON.parse(_data_json);
				var elementID = _data.elementID;
				if (elementID == -1) {
					is_new = true;
					var uuid = PPM.pUtils.get_uuid();
					var pcSettings = {
						id: uuid,
						parent_id: 0,
						collection: "passcard",
						payload: JSON.stringify({
							name: (_data.name!=undefined?_data.name:uuid),
							username: (_data.username!=undefined?_data.username:""),
							password: (_data.password!=undefined?_data.password:""),
							url: (_data.url!=undefined?_data.url:""),
						})
					};
					PC = PPM.pUtils.getPasscard(pcSettings);
					PPM.XUL.log("initing with new PASSCARD: " + JSON.stringify(pcSettings));
				} else {
					PPM.XUL.log("initing with PASSCARD ID: " + elementID);
					PC = PPM.pServer.getPasscardWithID(elementID);
				}
				//
				document.getElementById("title").value = PC.get("id");
				document.getElementById("name").value = PC.get("name");
				document.getElementById("username").value = PC.get("username");
				document.getElementById("password").value = PC.get("password");
				document.getElementById("url").value = PC.get("url");
				//
				document.getElementById("password").oninput = PPM.XUL.passwordFieldChange;
				PPM.XUL.passwordFieldChange();
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
		if (document.getElementById("name").value.length == 0) {
			alert("PassCard name cannot be empty!");
			return false;
		}
		PC.set("name",document.getElementById("name").value);
		PC.set("username",document.getElementById("username").value);
		PC.set("password",document.getElementById("password").value);
		PC.set("url",document.getElementById("url").value);
		if (is_new) {
			PPM.pServer.registerNewPasscard(PC);
			PC.saveData("insert");
		} else {
			PC.saveData("update");
		}
		//
		_data.is_new = is_new;
		_data.elementID = PC.get("id");
		//PPM.pSettings.PASSURL.dataTreeClick_edit_save(_data);
		PPM.XUL.doCallback();
		close();
	}
	
	this.XUL.show_hide_password = function() {
		if (pass_shown){
			pass_shown = false;
			document.getElementById("pass_toggler").setAttribute("class","lock_closed");
			document.getElementById("password").setAttribute("type","password");
		} else {
			pass_shown = true;
			document.getElementById("pass_toggler").setAttribute("class","lock_opened");		
			document.getElementById("password").removeAttribute("type");
		}
	}	
	
	this.XUL.generate_password = function() {
		var pw = PPM.pUtils.generatePassword();
		//PPM.XUL.log("PW: " + pw);
		document.getElementById("password").value = pw;
		PPM.XUL.passwordFieldChange();
		if (!pass_shown) {
			PPM.XUL.show_hide_password();
		}
	}
	
	this.XUL.passwordFieldChange = function() {
		var pwstrength = PPM.pUtils.getPasswordStrength(document.getElementById("username").value, document.getElementById("password").value);
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
		PPM.log(msg, "PCEDIT");
	}
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
