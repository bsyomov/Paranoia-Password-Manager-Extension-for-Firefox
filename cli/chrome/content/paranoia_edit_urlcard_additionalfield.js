//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	function XUL_DIALOGUE_FUNCTIONS() {
		var PPM = ParanoiaPasswordManager;
		var _data = null;
		
		this.init = function() {
			if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
				try {
					var _data_json = window.arguments[0];
					_data = JSON.parse(_data_json);
					document.getElementById("f_id").value = _data.af["f_id"];
					document.getElementById("f_value").value = _data.af["f_value"];			
					//
				} catch (e) {
					log("ERROR - " + e);
					log("ERROR - ARGUMENTS: " + _data_json);
				}
			} else {
				log("no arguments!");
			}
		}
		
		this.uninit = function() {
			window.removeEventListener("load", PPM.XUL2.init, false);
			window.removeEventListener("unload", PPM.XUL2.uninit, false);
			delete(PPM.XUL2);//suicide
		}
		
		this.w_close = function() {
			close();
		}
		
		this.w_save = function() {
			if (document.getElementById("f_id").value.length == 0) {
				alert("Field id cannot be empty!");
				return false;
			}
			if (document.getElementById("f_value").value.length == 0) {
				alert("Field value cannot be empty!");
				return false;
			}
			_data.af["f_id"] = document.getElementById("f_id").value;
			_data.af["f_value"] = document.getElementById("f_value").value;
			PPM.XUL.AF_click_edit_done(_data);
			close();
		}


		
		var log = function(msg) {
			PPM.log(msg, "UCEDIT");
		}
		
	}
	

	this.XUL2 = new XUL_DIALOGUE_FUNCTIONS;
	window.addEventListener("load", ParanoiaPasswordManager.XUL2.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL2.uninit, false);
	
}).apply(ParanoiaPasswordManager);

