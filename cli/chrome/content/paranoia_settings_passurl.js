//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");
//

(function() {
	function ParanoiaSettings_passurl() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var PPM = ParanoiaPasswordManager;
		var _logzone = "pSettings/PU";
		this.filter = "";
		
		this.init = function() {
			this.dataTree = document.getElementById('dataTree');
			this.dataTreeBox = this.dataTree.boxObject;
			this.dataTreeBox.QueryInterface(Components.interfaces.nsITreeBoxObject);		
			this.refreshTreeData();
			this.dataTree.view = this.dataTreeView;//association between XUL tree element and the treeView object
			log("inited!");
		}
		
		this.uninit = function() {
			//
			log("uninited!");
		}
		
		this.refreshTreeData = function() {
			try {
				this.dataTreeBox.rowCountChanged(0, -this.dataTreeView.rowCount);//remove all rows			
				var CSD = PPM.pServer.getCombinedData();
				this.dataTreeView.mydata = new Array();
				var RE = new RegExp(this.filter, 'i');
				for (var i = 0; i < CSD.passcards.length; i++) {
					var PASSCARD = CSD.passcards[i];
					if ((this.filter.length > 0 && RE.test(PASSCARD.get("name"))) || this.filter.length == 0) {
						//!!!THIS IS WAY TOO SIMPLE - WE NEED DEDICATED FUNC FOR THIS AND CHECK
						//PC.name, PC.username, PC.url
						//AND ALSO ON CHILD URLCARDS (EVEN IF PASSCARD DOESN'T MATCH)
						//UC.name, UC.url
						//FOR NOW OK - ONLY TEST IMPLEMENTATION
						this.dataTreeView.mydata.push(PASSCARD);
						if (PASSCARD.get("is_open") == true && PASSCARD.get("number_of_children") > 0) {
							var URLCARDS = PASSCARD.getChildren();
							for (var ii = 0; ii < URLCARDS.length; ii++) {
								var URLCARD = URLCARDS[ii];
								this.dataTreeView.mydata.push(URLCARD);
							}
						}
					}
				//PASSCARD.set("is_open",false);
				//this.dataTreeView.mydata.push(PASSCARD);
				}
				this.dataTreeBox.rowCountChanged(0, this.dataTreeView.rowCount);//add all rows
			} catch(e) {
				//ooops
			}
		}
		
		this.setFilter = function(ev) {
			this.filter = ev.target.value;
			//log("filtering on: " + this.filter);
			this.refreshTreeData();			
		}
		
		
		this.dataElementStateChange = function(data) {//OBSERVER CALL from pSettings
			//triggered by passcards/urlcards when saving is finished so we can update tree ( data{id,type,operation} )
			log("DATA ELEMENT STATECHANGE: " + data);
			try {
				var d = JSON.parse(data);
				var idx = PPM.pSettings.PASSURL.dataTree_getIDXbyID(d.id);
				if (idx === false) {
					//log("STATECHANGE ERROR: IDX cannot be found for ID:" + d.id);
					//this is ok - it happens when you have this xul open in a tab and you register a passcard in another tab from the main menu
					//int this case all is ok but we need to refresh treeData
					PPM.pSettings.PASSURL.refreshTreeData();
					return;
				}
				if (d.operation == "insert" || d.operation == "update") {
					PPM.pSettings.PASSURL.dataTreeBox.invalidate(idx);
				} else if (d.operation == "delete") {
					if (d.type == "passcard") {
						PPM.pServer.unregisterPasscard(PPM.pSettings.PASSURL.dataTreeView.mydata[idx]);
					} else if (d.type == "urlcard") {
						PPM.pServer.unregisterUrlcard(PPM.pSettings.PASSURL.dataTreeView.mydata[idx]);
					}
					PPM.pSettings.PASSURL.dataTreeView.mydata.splice(idx,1);
					PPM.pSettings.PASSURL.dataTreeBox.rowCountChanged(idx, -1);					
				}
				
			} catch(e) {
				log("STATECHANGE ERROR: " + e);
			}			
		}
		
		
		this.dataTreeView = {
			aserv : Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService),
			treeBox: null,
			selection : null,
			
			icon_folder_open : "chrome://paranoia/skin/images/folder_open.png",
			icon_folder_closed : "chrome://paranoia/skin/images/folder_closed.png",
			icon_url : "chrome://paranoia/skin/images/www.png",
			icon_openurl : "chrome://paranoia/skin/images/externalurl.png",
			icon_addurl : "chrome://paranoia/skin/images/addurl.png",
			icon_wrench : "chrome://paranoia/skin/images/wrench.png",
			icon_edit : "chrome://paranoia/skin/images/edit.png",
			icon_delete : "chrome://paranoia/skin/images/trash.png",		
			icon_ok : "chrome://paranoia/skin/images/ok.png",
			icon_alert : "chrome://paranoia/skin/images/alert.png",
			icon_sync : "chrome://paranoia/skin/images/sync.png",
			
			
			mydata : [],
			
			setTree: function(treeBox)         						{ this.treeBox = treeBox; },
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
			 isContainer: function(idx)         						{ return this.mydata[idx].get("is_container"); },		 
			 isContainerOpen: function(idx)     						{ return this.mydata[idx].get("is_open"); },
			 
			 countChildren: function(idx) { 
				 if (!this.isContainer(idx)) {return 0;}
				 return this.mydata[idx].get("number_of_children"); 
			 },
			 isContainerEmpty: function(idx) { 
				 if (this.countChildren(idx) != 0) {return false;}
				 return(true);
			},
			 	 
		   
			 getCellText : function(idx,column){
					var datanode = this.mydata[idx];
					var colname = column.id;
					var label = datanode.get(colname);
					if (label !== false) {
						var prefix = "";
						//var label = "";
					} else {						
						/*NOT FOUND*/						
						//var prefix = "["+idx+":"+column.id+"]=";
						//var label = "?";						
						var prefix = "";
						var label = "";
					}					  
					var answer = prefix +label;
					return (answer);					  
			},			
			
					
			getParentIndex: function(idx) {
				if (this.isContainer(idx)) return -1;
				for (var t = idx - 1; t >= 0 ; t--) {
					if (this.isContainer(t)) return t;
				}
			},
					  
			getLevel: function(idx) {
				if (this.isContainer(idx)) return 0;
				return 1;
			},
					  
			hasNextSibling: function(idx, after) {
				var thisLevel = this.getLevel(idx);
				for (var t = after + 1; t < this.mydata.length; t++) {
					var nextLevel = this.getLevel(t);
					if (nextLevel == thisLevel) return true;
					if (nextLevel < thisLevel) break;
				}
				return false;
			},
					  
			toggleOpenState: function(idx) {
				if (!this.isContainer(idx)) {return;}
				if (this.isContainerEmpty(idx)) {return;}
				
			    var item = this.mydata[idx];
			    var number_of_children = this.countChildren(idx);//item.get("number_of_children");
			 
			    if (this.isContainerOpen(idx)) {
			    		item.set("is_open",false);
			    	if (number_of_children > 0) {
			    		 this.mydata.splice(idx + 1, number_of_children);
			    		 this.treeBox.rowCountChanged(idx + 1, -number_of_children);
			    	}						      
			    } else {
			    		item.set("is_open",true);
			    	if (number_of_children > 0) {
			    		var children = item.getChildren();
			    		for (var i = 0; i < number_of_children; i++) {
							this.mydata.splice(idx + i + 1, 0, children[i]);
						}
						this.treeBox.rowCountChanged(idx + 1, number_of_children);
			    	}								
				}
			    this.treeBox.invalidateRow(idx);
			},
			  
			  
			getRowProperties: function(idx, prop) {},
			
			getColumnProperties: function(column, element, prop) {},
			
			getCellProperties: function(idx, column, prop) {					
				  var datanode = this.mydata[idx];
				  if (column.id == "name") {
				  	/* - NOT USED ANYMORE
					  if (this.isContainer(idx) == true) {
						  prop.AppendElement(this.aserv.getAtom("prop_passcard"));
					  } else {
						  prop.AppendElement(this.aserv.getAtom("prop_url"));
					  }
					 */
				  } else if (column.id == "openurl" || column.id == "new" || column.id == "edit" || column.id == "delete") {
				  		prop.AppendElement(this.aserv.getAtom("clickable"));
				  }
			},	
			
			
			
	
			getImageSrc: function(idx, column) {
				  var icon = "";
				  var datanode = this.mydata[idx];
				  
				  if (column.id == "name") {
					  //OPEN/CLOSED FOLDER ICON FOR CONTAINERS
					  if (this.isContainer(idx)) {
						  if (this.isContainerOpen(idx)) {
							  icon = this.icon_folder_open;
						  } else {
							  icon = this.icon_folder_closed;
						  }
					  } else {
						  icon = this.icon_url;
					  }
				  } else if (column.id == "openurl") {
				  		if (datanode.get("url") != "") {
							icon = this.icon_openurl;
						}
				  } else if (column.id == "edit") {
						icon = this.icon_edit;
				  } else if (column.id == "delete") {
						icon = this.icon_delete;
				  } else if (column.id == "new") {
				  		//only for PASSCARDS
						if (datanode.get("collection") == "passcard") {
					  		icon = this.icon_addurl;
						}
				  } else if (column.id == "sync") {
					  var sync_state = datanode.get("sync_state");
					  if (sync_state === 0) {//OK
						  icon = this.icon_ok;
					  } else if (sync_state === 1) {//SYNCING
						  icon = this.icon_sync;
					  } else {
						  icon = this.icon_alert;
					  }
					 
				  }
				  
				  return(icon);
			}
		    
		}
		
		this.dataTreeClick = function(el,ev) {
			var row = {}, col = {}, child = {};		
			this.dataTreeBox.getCellAt(ev.clientX, ev.clientY, row, col, child);
			var idx = row.value;
			if (idx == -1) {return;}//these are the column headers
			var columnObject = col.value;
			var colname = columnObject.id;		
			//var cellText = JackFFext.config.theTree.view.getCellText(row.value, col.value);
			
			switch (colname) {
				case "edit":
					this.dataTreeClick_edit(idx);
					break;
				case "delete":
					this.dataTreeClick_delete(idx);
					break;
				case "new":
					//add new urlcard - only for passcards
					if (this.dataTreeView.mydata[idx].get("collection") == "passcard") {
						this.dataTreeClick_new("urlcard",idx);
					}				
					break;
				case "openurl":
					var myUrl = this.dataTreeView.mydata[idx].get("url");
					if (myUrl != "") {
						var myAttr = this.dataTreeView.mydata[idx].get("name");
						PPM.pUtils.openTab(myAttr,myUrl);	
					}			
					break;	
				default:
					//log("NO ACTION DEFINED FOR Row/Col: "+idx+"/"+colname);
					break;
			}
			 
		}
		
		this.dataTreeClick_new = function(type,idx) {
			this.dataTreeClick_edit({"type":type, "idx": idx});
		}
		
		this.dataTreeClick_edit = function(d) {
			try {
				var data = {};
				if (typeof(d) == "number") {//must be an "edit" click on an existing element where d === idx of tree
					data.elementIndex = d
					data.elementID = this.dataTreeView.mydata[d].get("id");
					data.elementType = this.dataTreeView.mydata[d].get("collection");
				} else 	if (typeof(d) == "object") {//must be a "new" click				
					data.elementIndex = d.idx;		//could be 0 for new passcard OR idx of passcard on which we are adding urlcard
					data.elementID = -1;
					data.elementType = d.type;	//the requested new element type
					if (data.elementType == "urlcard") {
						data.parentID = this.dataTreeView.mydata[data.elementIndex].get("id");
					} else {
						data.parentID = 0;
					}				
					//this._log("creating new element of type: " + data.elementType);
				} else {return;}
			} catch (e) {log("dataTreeClick_edit ERROR("+JSON.stringify(d)+"): " + e);}
			//
			data.CALLBACKFUNCTION = 'pSettings.PASSURL.dataTreeClick_edit_save';//do NOT put PPM on front
			
			if (data.elementType == "passcard") {
				var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_passcard.xul';
				var xul_2_load_width = 500;
				var xul_2_load_height = 300;
			} else if (data.elementType == "urlcard") {
				var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_urlcard.xul';
				var xul_2_load_width = 700;
				var xul_2_load_height = 600;
			} else {return;}
			var xul_2_load_params = 'modal, centerscreen';
			window.openDialog(xul_2_load_url, "w_paranoia_edit_element", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(data));
		}
		
		this.dataTreeClick_edit_save = function(d) {
			/*d id the same object that was passed to XUL - 
			* so we know here element's elementType / elementID / elementIndex
			* .is_new is set true/false
			* if .is_new === true ->elementID is changed to new elementID
			*/
			var self = PPM.pSettings.PASSURL;//we need this 'coz we are called by a .call(null,... - so we don't have "this"
					
			if (d.is_new === true) {
				if (d.elementType == "passcard") {
					//do something?					
				} else if (d.elementType == "urlcard") {
					var pc_idx = d.elementIndex;//on urlcads this is the idx of the parent passcard
					if (self.dataTreeView.isContainerOpen(pc_idx) == false) {
						self.dataTreeView.toggleOpenState(pc_idx);
					}		
				}
			}
			self.refreshTreeData();
		}
		
		
		this.dataTreeClick_delete = function(idx) {
			var el = this.dataTreeView.mydata[idx];
			var elementType = el.get("collection");
			var elementID = el.get("id");
			var elementName = el.get("name");
			
			if (elementType == "passcard" && el.get("number_of_children") > 0) {
				var cTitle = "Deleting " + elementType;
				var cMsg = "It is not possible to delete PassCard \""+elementName+"\"!\nIt has " + el.get("number_of_children") + " UrlCards associated to it.";
				PPM.pUtils.alert(cMsg,cTitle);
				return;
			}
			
			var cTitle = "Deleting " + elementType;
			var cQuestion = "Are you sure you want to delete the " + elementType + " \"" + elementName + "\"";
			if (PPM.pUtils.confirm(cQuestion,cTitle)) {
				log("deleting data element@ IDX: " + idx + " with ID: " + elementID);
				el.saveData("delete");
			}
		}
		
		
		
		this.dataTree_getIDXbyID = function(id) {
			var answer = false;
			for (var i=0; i<this.dataTreeView.mydata.length; i++) {
				if (this.dataTreeView.mydata[i].get("id") == id) {
					answer = i;
					break;
				}
			}
			return(answer);
		}
		
		/*
		this.exportPasscardsToFile = function() {//------DISABLED - button removed!!!
			return;
			 //<button oncommand="ParanoiaPasswordManager.pSettings.PASSURL.exportPasscardsToFile();" label="EXPORT" icon=""/>
			 //THIS IS A TEMPORARY SOLUTION - THIS SHOULD ASK FOR ES+MK AND CRYPT-EXPORT THIS STUFF
			if (!PPM.pUtils.confirm("Are you sure you want to export all your passcard and urlcard data in a NOT encrypted format?","IMPORTANT!")) {return;}
			try {
				var DA = new Array();
				var PASSCARDS = PPM.pServer.getCombinedData().passcards;
				for (var pi=0; pi<PASSCARDS.length; pi++) {
					DA.push(PASSCARDS[pi].getDataForSaving());
					var URLCARDS = PASSCARDS[pi].getChildren();
					for (var ui=0; ui<URLCARDS.length; ui++) {
						DA.push(URLCARDS[ui].getDataForSaving());
					}
				}
				var txt = JSON.stringify(DA);
				//			
				var dirService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
				var fileService = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
				var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
				var foConverter = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
				//
				var HDF = dirService.get("Home", Ci.nsIFile);
				var tmpfile = HDF.path + "/paranoia_data.txt";			
				fileService.initWithPath(tmpfile);
				foStream.init(fileService, 0x02 | 0x08 | 0x20, 0600, 0);
				foConverter.init(foStream, "UTF-8", 0, 0);
				foConverter.writeString(txt);
				foConverter.close();
				PPM.pUtils.alert("Unencrypted data file was written in: " + tmpfile,"DATA EXPORT");	
			} catch (e) {
				log("EXPORT ERROR: " + e);
			}
		}	
		*/
		
		/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
		var log = function(msg) {PPM.log(msg,_logzone);}
	}
	
	this.PASSURL = new ParanoiaSettings_passurl;
}).apply(ParanoiaPasswordManager.pSettings);

