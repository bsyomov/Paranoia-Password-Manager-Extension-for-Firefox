//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

(function() {
	function XUL_DIALOGUE_FUNCTIONS() {
		var PPM = ParanoiaPasswordManager;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		//
		var _data = null;
		var UC = null;
		var is_new = false;
		var additional_fields;
		
		this.init = function() {
			if("arguments" in window && window.arguments.length > 0) {//DATA IS PASSED AS JSON DATA
				try {
					var _data_json = window.arguments[0];
					_data = JSON.parse(_data_json);
					var elementID = _data.elementID;
					if (elementID == -1) {
						is_new = true;
						var uuid = PPM.pUtils.get_uuid();
						var ucSettings = {
							id: uuid,
							parent_id: _data.parentID,
							collection: "urlcard",
							payload: JSON.stringify({
								name: uuid,
								url: ""
							})
						};
						UC = PPM.pUtils.getUrlcard(ucSettings);
						log("initing with new URLCARD: " + JSON.stringify(ucSettings));
					} else {				
						UC = PPM.pServer.getUrlcardWithID(elementID);
						log("initing with URLCARD ID: " + elementID);
					}
					//
					document.getElementById("title").value = UC.get("id");
					document.getElementById("name").value = UC.get("name");
					document.getElementById("url").value = UC.get("url");
					
					//ADDITIONAL URLCARD FIELDS
					additional_fields = UC.get("additional_fields");
					refreshAdditionalFields();
					
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
			window.removeEventListener("load", PPM.XUL.init, false);
			window.removeEventListener("unload", PPM.XUL.uninit, false);
			delete(PPM.XUL);//suicide
		}
		
		this.w_close = function() {
			close();
		}
		
		this.w_save = function() {
			if (document.getElementById("name").value.length == 0) {
				alert("UrlCard name cannot be empty!");
				return false;
			}
			UC.set("name",document.getElementById("name").value);
			UC.set("url",document.getElementById("url").value);
			UC.set("additional_fields",additional_fields);
		
			if (is_new) {
				PPM.pServer.registerNewUrlcard(UC);
				UC.saveData("insert");
			} else {
				UC.saveData("update");
			}
			//
			_data.is_new = is_new;
			_data.elementID = UC.get("id");
			//PPM.pSettings.PASSURL.dataTreeClick_edit_save(_data);
			PPM.XUL.doCallback();
			close();
		}	
		
		//--------------------------------------ADDITIONAL FIELDS
		
		this.AF_click_new = function() {
			this.AF_click_edit(null);
		}
		
		this.AF_click_edit = function(ev) {
			if (ev===null) {
				//alert("NEW");
				var AF = {f_id:"", f_value:""};
				var d = {afindex: -1, is_new: true, af: AF};	
			} else {
				var afindex = parseInt(ev.target.getAttribute("afindex"));
				//alert("EDIT: " + afindex);
				var d = {afindex: afindex, is_new: false, af: additional_fields[afindex]};
			}
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_urlcard_additionalfield.xul';
			var xul_2_load_width = 600;
			var xul_2_load_height = 200;
			var xul_2_load_params = 'modal, centerscreen';
			window.openDialog(xul_2_load_url, "w_paranoia_edit_setting", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(d));
			
		}
		
		this.AF_click_edit_done = function(d) {
			log("d: " + JSON.stringify(d));
			//alert("AF: " + JSON.stringify(additional_fields));
			if (d.is_new === false) {
				additional_fields[d.afindex] = d.af;
			} else {
				additional_fields.push(d.af);
			}
			//alert("AF: " + JSON.stringify(additional_fields));
			refreshAdditionalFields();			
		}
		
		
		this.AF_click_delete = function(ev) {
			var afindex = parseInt(ev.target.getAttribute("afindex"));
			if ( confirm("Are you sure to remove the field definition \"" +additional_fields[afindex]["f_id"] + "\"?" )) {
				additional_fields.splice(afindex,1);
				refreshAdditionalFields();
			}	
		}
		
		this.AF_click_moveup = function(ev) {
			var afindex = parseInt(ev.target.getAttribute("afindex"));
			if(afindex==0) {return;}
			additional_fields.splice(afindex-1,0,additional_fields.splice(afindex,1)[0]);
			refreshAdditionalFields();
		}
		
		this.AF_click_movedown = function(ev) {
			var afindex = parseInt(ev.target.getAttribute("afindex"));
			if(afindex==additional_fields.length) {return;}
			additional_fields.splice(afindex+1,0,additional_fields.splice(afindex,1)[0]);
			refreshAdditionalFields();
		}





		var refreshAdditionalFields = function() {
			var AFBOX = document.getElementById("AFBOX");		
			
			//remove old stuff
			while (AFBOX.firstChild.nextSibling != null) {AFBOX.removeChild(AFBOX.firstChild.nextSibling);}	
			
			if (additional_fields.length == 0) {return;}			
			//log("we have additional fields: " + additional_fields.length);
				
			
			for (var i=0; i<additional_fields.length; i++) {
				var af = additional_fields[i];
				
				//log(i+" inserting AF: " + af["f_id"] + " - " + af["f_value"]);
				
				var AF_HBOX = document.createElementNS(XUL_NS, "hbox");
				var AF_LABEL_ID = document.createElementNS(XUL_NS, "label");
				var AF_LABEL_VALUE = document.createElementNS(XUL_NS, "label");
				var AF_LABEL_EDIT = document.createElementNS(XUL_NS, "label");
				var AF_LABEL_DELETE = document.createElementNS(XUL_NS, "label");
				var AF_LABEL_UP = document.createElementNS(XUL_NS, "label");
				var AF_LABEL_DOWN = document.createElementNS(XUL_NS, "label");
				
				//THE HBOX ELEMENT
				AF_HBOX.setAttribute("style","border-bottom: 1px solid #ababab;");
				
				//icon_edit : "chrome://paranoia/skin/images/edit.png",
				//icon_delete : "chrome://paranoia/skin/images/trash.png",
				
				//THE ID FIELD
				var v = af["f_id"];
				v = (v.length>30?v.substr(0,30)+"...":v);
				AF_LABEL_ID.setAttribute("class","af_id");
				AF_LABEL_ID.setAttribute("style",'width:300px; padding:2px; margin:0;');
				AF_LABEL_ID.setAttribute("value",v);
				
				//THE VALUE FIELD
				var v = af["f_value"];
				v = (v.length>30?v.substr(0,30)+"...":v);
				AF_LABEL_VALUE.setAttribute("class","af_val");
				AF_LABEL_VALUE.setAttribute("style",'width:300px; padding:2px; margin:0; border-left: 1px solid #ababab;');
				AF_LABEL_VALUE.setAttribute("value",v);
				
				
				var bfs = 'width:20px; padding:2px; margin:0; border-left: 1px solid #ababab; ';//button fields common styles
				
				//THE EDIT FIELD
				AF_LABEL_EDIT.setAttribute("afindex",i);
				AF_LABEL_EDIT.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/edit.png) center center no-repeat; ');
				AF_LABEL_EDIT.addEventListener("click", PPM.XUL.AF_click_edit, true);
				
				//THE DELETE FIELD
				AF_LABEL_DELETE.setAttribute("afindex",i);
				AF_LABEL_DELETE.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/trash.png) center center no-repeat; ');
				AF_LABEL_DELETE.addEventListener("click", PPM.XUL.AF_click_delete, true);
				
				//THE UP FIELD
				AF_LABEL_UP.setAttribute("afindex",i);
				AF_LABEL_UP.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/up.png) center center no-repeat; ');
				AF_LABEL_UP.addEventListener("click", PPM.XUL.AF_click_moveup, true);
				
				//THE DOWN FIELD
				AF_LABEL_DOWN.setAttribute("afindex",i);
				AF_LABEL_DOWN.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/down.png) center center no-repeat; ');
				AF_LABEL_DOWN.addEventListener("click", PPM.XUL.AF_click_movedown, true);
			
				//
				AF_HBOX.insertBefore(AF_LABEL_ID, AF_HBOX.lastChild);		
				AF_HBOX.insertBefore(AF_LABEL_VALUE, AF_HBOX.lastChild.nextElement);
				AF_HBOX.insertBefore(AF_LABEL_EDIT, AF_HBOX.lastChild.nextElement);
				AF_HBOX.insertBefore(AF_LABEL_DELETE, AF_HBOX.lastChild.nextElement);
				AF_HBOX.insertBefore(AF_LABEL_UP, AF_HBOX.lastChild.nextElement);
				AF_HBOX.insertBefore(AF_LABEL_DOWN, AF_HBOX.lastChild.nextElement);
				//		
				AFBOX.insertBefore(AF_HBOX, AFBOX.lastChild.nextElement);//after the column headers in AFBOX
				
			}	
		}
		
		this.doCallback = function() {
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
		
		var log = function(msg) {
			PPM.log(msg, "UCEDIT");
		}
		
	}
	

	this.XUL = new XUL_DIALOGUE_FUNCTIONS;
	window.addEventListener("load", ParanoiaPasswordManager.XUL.init, false);
	window.addEventListener("unload", ParanoiaPasswordManager.XUL.uninit, false);
	
}).apply(ParanoiaPasswordManager);
