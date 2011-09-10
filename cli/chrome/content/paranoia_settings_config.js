//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");
//

(function() {
	function ParanoiaSettings_config() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var PPM = ParanoiaPasswordManager;
		var _logzone = "pSettings/CONF";
		this.filter = "";
		
		this.init = function() {
			this.confTree = document.getElementById('confTree');
			this.confTreeBox = this.confTree.boxObject;
			this.confTreeBox.QueryInterface(Components.interfaces.nsITreeBoxObject);	
			this.refreshTreeData();
			this.confTree.view = this.confTreeView;//association between XUL tree element and the treeView object				
			log("inited!");
		}
		
		this.uninit = function() {
			//
			log("uninited!");
		}
		
		
		this.refreshTreeData = function() {
			this.confTreeBox.rowCountChanged(0, -this.confTreeView.rowCount);//remove all rows
			var settingsArray = PPM.pConfig.getSettingsInArray();
			//log("data..." + JSON.stringify(settingsArray));
			var treeData = [];
			var RE = new RegExp(this.filter,'i');
			for (var i=0; i<settingsArray.length; i++) {
				if ( (this.filter.length > 0 && RE.test(settingsArray[i]["config_name"])) || this.filter.length == 0) {
					treeData.push(settingsArray[i]);
				}	
			}			
			this.confTreeView.mydata = treeData;
			this.confTreeBox.rowCountChanged(0, this.confTreeView.rowCount);//add all rows
		}
		
		this.setFilter = function(ev) {
			this.filter = ev.target.value;
			//log("filtering on: " + this.filter);
			this.refreshTreeData();			
		}
	
		this.confTreeView = {
					//aserv : Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService),
					treeBox: null,
					selection : null,
					
					//icon_folder_open : "chrome://paranoia/skin/images/folder_open.png",
					//icon_folder_closed : "chrome://paranoia/skin/images/folder_closed.png",
					//icon_url : "chrome://paranoia/skin/images/www.png",
					icon_wrench : "chrome://paranoia/skin/images/wrench.png",
					icon_edit : "chrome://paranoia/skin/images/edit.png",
					icon_delete : "chrome://paranoia/skin/images/trash.png",
					
					mydata : [],
					
					setTree: function(treeBox)         						{ this.treeBox = treeBox; },
					isContainerEmpty: function(idx)    						{ return false; },
					isSeparator: function(idx)         						{ return false; },
					isSorted: function()               						{ return false; },
					isEditable: function(idx, column)  						{ return false; },
					getProgressMode : function(idx,column) 					{},
					getCellValue: function(idx, column) 						{},
					cycleHeader: function(col, elem) 							{},
					selectionChanged: function() 							{},
					cycleCell: function(idx, column) 							{},
					performAction: function(action) 							{},
					performActionOnCell: function(action, index, column) 	{},
				
		
					 get rowCount()                     						{ return this.mydata.length; },
					 
					 isContainer: function(idx)         						{ return false; },
					 
					 isContainerOpen: function(idx)     						{ return false; },
					 	 
				   
					getCellText : function(idx,column){
						var datanode = this.mydata[idx];
						var colname = column.id;
						if (colname == "config_name" || colname == "config_value") {
							var label = datanode[colname];
						} else {						
							var label = "";
						}
						return (label);					  
					},				
					
					
					
					getParentIndex: function(idx) { return 0; },
							  
					getLevel: function(idx) {return 0;  },
							  
					hasNextSibling: function(idx, after) {
							    var thisLevel = this.getLevel(idx);
							    for (var t = after + 1; t < this.mydata.length; t++) {
							      var nextLevel = this.getLevel(t);
							      if (nextLevel == thisLevel) return true;
							      if (nextLevel < thisLevel) break;
							    }
							    return false;
							  },
							  
						toggleOpenState: function(idx) {},	  		  
						getRowProperties: function(idx, prop) {},						  
						getCellProperties: function(idx, column, prop) {},								  
						getColumnProperties: function(column, element, prop) {},
					
		
						getImageSrc: function(idx, column) {
								  var icon = '';
								  var datanode = this.mydata[idx];
								  
								  if (column.id == "config_name") {
											  icon = this.icon_wrench;
								  } else if (column.id == "config_edit") {
									  icon = this.icon_edit;
								  } else if (column.id == "config_delete") {
									  icon = this.icon_delete;
								  }
								  
								  return(icon);
						},
				    
		}
			
		this.confTreeClick= function(el,ev) {
			var row = {}, col = {}, child = {};		
			this.confTreeBox.getCellAt(ev.clientX, ev.clientY, row, col, child);
			var rownum = row.value;
			if (rownum == -1) {return;}//these are the column headers
			var columnObject = col.value;
			var colname = columnObject.id;		
			//var cellText = this.confTree.view.getCellText(row.value, col.value);
			
			switch (colname) {
				case "config_edit":
					this.confTreeClick_edit(rownum);
					break;
				case "config_delete":
					this.confTreeClick_delete(rownum);
					break;
				default:
					//log("NO ACTION DEFINED FOR Row/Col: "+rownum+"/"+colname);
					break;
			}
			 
		}
		
		this.confTreeClick_new= function() {
			//log("adding new config");
			this.confTreeClick_edit(-1);
		}
			
		this.confTreeClick_edit= function(idx) {
			//log("editing config IDX: " + idx);
			if (idx == -1) {
				var datanode = {"config_name":"", "config_value":""};
			} else {
				var datanode = this.confTreeView.mydata[idx];
			}
			//			
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_setting.xul';
			var xul_2_load_width = 500;
			var xul_2_load_height = 200;
			var xul_2_load_params = 'modal, centerscreen';
			var JSONDATA = JSON.stringify(datanode);
			window.openDialog(xul_2_load_url, "w_paranoia_edit_setting", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSONDATA);
		}
		
		
		this.confTreeClick_edit_save = function(data) {
			//log("saving...");
			PPM.pConfig.setConfig(data.config_name, data.config_value);
			this.refreshTreeData();
		}
		
		
		this.confTreeClick_delete = function(idx) {
			var config_name = this.confTreeView.mydata[idx].config_name;
			if (PPM.pUtils.confirm("Are you sure you want to delete config \""+config_name+"\"?","DELETE CONFIGURATION ENTRY")) {
				log("deleting config @ IDX: " + idx);
				//this.confTreeView.mydata.splice(idx,1);
				//this.confTreeBox.rowCountChanged(idx, -1);
				PPM.pConfig.removeConfig(config_name);
				this.refreshTreeData();
			}
		}
		
		
		this.changeMasterKey = function() {
			var data = {};
			data.title = "Change your login credentials";
			data.description = "Change your encryption scheme and your Master Key for your Paranoia Login."
			data.ES = PPM.pConfig.get_ES();
			data.MK = PPM.pConfig.get_MK();
			data.CALLBACKFUNCTION = "pSettings.CONFIG.changeMasterKey_DONE";//do NOT put PPM on front
			//
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_change_mk.xul';
			var xul_2_load_width = 700;
			var xul_2_load_height = 300;
			var xul_2_load_params = 'modal, centerscreen';
			window.openDialog(xul_2_load_url, "w_paranoia_change_mk", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params,  JSON.stringify(data));
		}
		
		
		this.changeMasterKey_DONE = function(newMasterKey,newEncryptionScheme) {
			if (!PPM.pUtils.confirm("Are you sure you want to do this?\nYour MK and ES will be changed, all your configuration will be re-encrypted and you will be logged out.","IMPORTANT!")) {return;}
			if (!PPM.pUtils.confirm("LAST WARNING!!!\nIf you click ok you will be logged out and if you must re-enter with your new MK!!!\n A R E   Y O U   S U R E???","VERY IMPORTANT!!!")) {return;}
			var mk_change_result = PPM.pConfig.changeConfigurationMasterKey(newMasterKey,newEncryptionScheme);
			if (mk_change_result !== true) {
				PPM.pUtils.alert("There was an error! Nothing was changed!","MK CHANGE ERROR!");
			}
			//otherwise PPM is already shutting down...
		}
		
		
		
		
		
		this.exportConfigurationToFile = function() {
			/*
			 * THIS IS A TEMPORARY SOLUTION - THIS SHOULD ASK FOR ES+MK AND CRYPT-EXPORT THIS STUFF 
			 * -  the getSettingsInArray is no good - it is for other stuff - we need dedicated function
			*/
			if (!PPM.pUtils.confirm("Are you sure you want to export your configurations in a NOT encrypted format?","IMPORTANT!")) {return;}
			try {
				var tus = PPM.pConfig.getConfig("show_trippleunderscore_configs");
				if (tus != 1) {PPM.pConfig.setConfig("show_trippleunderscore_configs","1");}//it is needed to assure that we export all settings
				var txt = JSON.stringify(PPM.pConfig.getSettingsInArray());
				if (tus != 1) {PPM.pConfig.setConfig("show_trippleunderscore_configs","0");}//put it back to zero
				var dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
				var fileService = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
				var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
				var foConverter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);			
				//
				var HDF = dirService.get("Home", Ci.nsIFile);
				var tmpfile = HDF.path + "/paranoia_config.txt";
				fileService.initWithPath(tmpfile);
				foStream.init(fileService, 0x02 | 0x08 | 0x20, 0600, 0);
				foConverter.init(foStream, "UTF-8", 0, 0);
				foConverter.writeString(txt);
				foConverter.close();		
				PPM.pUtils.alert("Unencrypted configuration file was written in: " + tmpfile,"CONFIGURATION EXPORT");	
			} catch (e) {
				log("EXPORT ERROR: " + e);
			}
		}
		
		
		
		/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
		var log = function(msg) {PPM.log(msg,_logzone);}
	}
	
	this.CONFIG = new ParanoiaSettings_config;
}).apply(ParanoiaPasswordManager.pSettings);

