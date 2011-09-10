//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	var PPM = ParanoiaPasswordManager;
	this.XUL = {};
	var _data_json;
	var _data;
	
	this.XUL.init = function() {
		if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
	    		_data_json = window.arguments[0];
	    		_data = JSON.parse(_data_json);
	    	//
	    		document.getElementById("config_name").value = _data.config_name;
	    		document.getElementById("config_value").value = _data.config_value;
	    	if ( _data.config_name.length == 0) {
	    		//new config 
	    			document.getElementById("title").value = "New Configuration Data";
	    			document.getElementById("config_name").removeAttribute("disabled");
	    	} else {
	    			document.getElementById("title").value = "Edit Configuration Data";
	    			document.getElementById("config_name").setAttribute("disabled",true);
	    	}
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
		if (document.getElementById("config_name").value.length == 0) {
			alert("The name field cannot be empty!");
			return false;
		}
		_data.config_name = document.getElementById("config_name").value;
		_data.config_value = document.getElementById("config_value").value;
		PPM.pSettings.CONFIG.confTreeClick_edit_save(_data);
		close();
	}
	
	
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);

