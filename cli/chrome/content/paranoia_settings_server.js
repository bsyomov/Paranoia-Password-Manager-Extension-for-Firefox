//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");
//

(function() {
	function ParanoiaSettings_server() {
		const Cc = Components.classes;
		const Ci = Components.interfaces;
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var PPM = ParanoiaPasswordManager;
		var _logzone = "pSettings/SRV";
		
		this.init = function() {
			this.refresh_server_entries();
			this.PSERV_update_screen_data();
			log("inited!");
		}
		
		this.uninit = function() {
			//
			log("uninited!");
		}
		
		
	
		this.refresh_server_entries = function() {
			var SRVCONTAINER = document.getElementById("PARANOIA_SRV_ENTRIES");
			var numberOfRegisteredServers = PPM.pServer.getNumberOfRegisteredServers();
			
			//remove all children
			while(SRVCONTAINER.firstChild) {SRVCONTAINER.removeChild(SRVCONTAINER.firstChild);}
			
			if(numberOfRegisteredServers==0) {
				var MSG = this.get_noserver_message();
				SRVCONTAINER.insertBefore(MSG, SRVCONTAINER.lastChild);
			}
			
			for (var sn=1; sn<=numberOfRegisteredServers; sn++) {
				//log("serverNumber: " + sn);
				var SRVENTRY = this.get_server_entry(sn);			
				SRVCONTAINER.insertBefore(SRVENTRY, (SRVCONTAINER.hasChildNodes()?SRVCONTAINER.lastChild.nextElement:SRVCONTAINER.lastChild));
			}
			
			
		}
		
		this.get_noserver_message = function() {
			var SRV_HBOX = document.createElementNS(XUL_NS, "hbox");
			SRV_HBOX.setAttribute("style","border: 1px solid #ababab;");
			
			//NAME
			var LAB = document.createElementNS(XUL_NS, "label");
			LAB.setAttribute("value","No servers defined. Use the [ADD SERVER] button to define new Paranoia servers.");
			LAB.setAttribute("style","font-size: 20px;");
			
			SRV_HBOX.insertBefore(LAB, SRV_HBOX.lastChild);
			return(SRV_HBOX);
			
		}
		
		this.get_server_entry = function(serverNumber) {
			//THE SRV_HBOX ELEMENT
			var SRV_HBOX = document.createElementNS(XUL_NS, "hbox");	
			SRV_HBOX.setAttribute("id","srv_container_box_"+serverNumber);
			SRV_HBOX.setAttribute("style","border: 1px solid #ababab;");
			
			var SRV_MASTER = this.get_single_server(serverNumber, "master");
			//var SRV_MIRROR = this.get_single_server(serverNumber, "mirror");
			
			SRV_HBOX.insertBefore(SRV_MASTER, SRV_HBOX.lastChild);
			//SRV_HBOX.insertBefore(SRV_MIRROR, SRV_HBOX.lastChild.nextElement);
			
			return(SRV_HBOX);
		}
		
		
		this.get_single_server = function(serverNumber, serverType) {//type can be "master" or "mirror"		
			var serverName = PPM.pServer.getServerData(serverNumber, serverType, "name");
			if (serverName === false) {
				var isServerRegistered = false;
				var srvColor = '#ff0000';
				var srvTitle = "SERVER-"+serverType+"-" + serverNumber + " : " + " NOT YET IMPLEMENTED - WHEN? - SOON";
			} else {
				var serverIsConnected = PPM.pServer.getServerData(serverNumber, serverType, "is_connected");
				var isServerRegistered = true;
				var srvColor = '#48b800';
				var srvTitle = "SERVER-"+serverType+"-" + serverNumber;
			}
		
			//THE SRV_VBOX ELEMENT
			var SRV_VBOX = document.createElementNS(XUL_NS, "vbox");	
			SRV_VBOX.setAttribute("id","srv_vbox_"+serverNumber+"_"+serverType);
			SRV_VBOX.setAttribute("flex",1);
			SRV_VBOX.setAttribute("style","height:150px; border: 1px solid #ababab;");
			
				//THE TITLE BAR
				var SRV_TITLE_BAR = document.createElementNS(XUL_NS, "hbox");
				SRV_TITLE_BAR.setAttribute("style","padding-top:3px; height:25px; border-bottom: 1px solid #ababab;");
				SRV_VBOX.insertBefore(SRV_TITLE_BAR, SRV_VBOX.lastChild);
				
					//THE TITLE
					var LAB = document.createElementNS(XUL_NS, "label");
					LAB.setAttribute("id","srv_title_"+serverNumber+"_"+serverType);
					LAB.setAttribute("flex",1);
					LAB.setAttribute("style","font-size: 14px; font-weight: bold; color: "+ srvColor +";");
					LAB.setAttribute("value",srvTitle);
					SRV_TITLE_BAR.insertBefore(LAB, SRV_TITLE_BAR.lastChild);
					
					//THE BUTTON BAR
					var SRV_BUTTON_BAR = document.createElementNS(XUL_NS, "hbox");
					SRV_BUTTON_BAR.setAttribute("style","width:60px;");
					SRV_BUTTON_BAR.setAttribute("align","right");
					SRV_TITLE_BAR.insertBefore(SRV_BUTTON_BAR, SRV_TITLE_BAR.lastChild.nectElement);
				
				
						//THE EDIT BUTTON
						if (serverType == "master") {
							var bfs = 'width:20px; height:20px; padding:2px; margin:0;';//button fields common styles
							var BUTT = document.createElementNS(XUL_NS, "label");
							BUTT.setAttribute("serverNumber", serverNumber);
							BUTT.setAttribute("serverType", serverType);
							BUTT.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/edit.png) center center no-repeat; ');
							BUTT.addEventListener("click", PPM.pSettings.SERVER.PSERV_click_edit, true);
							SRV_BUTTON_BAR.insertBefore(BUTT, SRV_BUTTON_BAR.lastChild);
						}
						
						//THE DELETE BUTTON
						if (isServerRegistered) {
							var BUTT = document.createElementNS(XUL_NS, "label");
							BUTT.setAttribute("serverNumber", serverNumber);
							BUTT.setAttribute("serverType", serverType);
							BUTT.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/trash.png) center center no-repeat; ');
							BUTT.addEventListener("click", PPM.pSettings.SERVER.PSERV_click_delete, true);
							SRV_BUTTON_BAR.insertBefore(BUTT, SRV_BUTTON_BAR.lastChild.nextElement);
						}
						
						//THE CONNECT/DISCONNECT BUTTON
						if (isServerRegistered) {
							var BUTT = document.createElementNS(XUL_NS, "label");
							BUTT.setAttribute("id","b_conn_disconn_"+serverNumber+"_"+serverType);
							BUTT.setAttribute("serverNumber", serverNumber);
							BUTT.setAttribute("serverType", serverType);
							BUTT.setAttribute("tooltiptext", (serverIsConnected===true?"disconnect":"connect"));
							var cIconImg = (serverIsConnected===true?"disconnect.png":"connect.png");
							BUTT.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/'+cIconImg+') center center no-repeat; ');
							BUTT.addEventListener("click", PPM.pSettings.SERVER.PSERV_click_connectDisconnect, true);
							SRV_BUTTON_BAR.insertBefore(BUTT, SRV_BUTTON_BAR.lastChild.nextElement);
						}	
				
				
				if (!isServerRegistered) {return(SRV_VBOX);}		
				//FROM HERE ON ONLY FOR REGISTERED SERVERS
				
				//NAME
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","name");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//TYPE
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","type");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//URL
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","url");	
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//USERNAME
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","username");	
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);		
				
				//ENCRYPTION SCHEME
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","encryption_scheme");	
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//PING INTERVAL
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","ping_interval_ms");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//CONNECTED
				var LAB = document.createElementNS(XUL_NS, "label");	
				LAB.setAttribute("name","is_connected");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//QUEUE LENGTH
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","queue_length");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//CURRENT SEED
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","seed");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
				
				//TIMESTAMP
				var LAB = document.createElementNS(XUL_NS, "label");
				LAB.setAttribute("name","timestamp");
				LAB.setAttribute("style","font-size: 10px; border-bottom:1px solid #ababab;");
				SRV_VBOX.insertBefore(LAB, SRV_VBOX.lastChild.nextElement);
			
			
		
			return(SRV_VBOX);
		}
		
		
		this.PSERV_click_addParanoiaServer = function() {
			this.PSERV_click_edit(false);
		}
		
		
		this.PSERV_click_edit = function(ev) {
			/*
			 * DO NOT EDIT ANYTHING IF THERE ARE OPERATIONS IN SERVER CONCENTRATOR'S QUEUE
			 */
			if (PPM.pServer.getNumberOfOperationsInQueue() > 0) {
				PPM.pUtils.alert("It is not possible to modify server settings until there are operations in queue on any server.");
				return;
			}
			
			var data = {};
			
			
			if (ev === false) {//adding new server
				var numberOfRegisteredServers = PPM.pServer.getNumberOfRegisteredServers();
				var serverNumber = numberOfRegisteredServers+1;
				var serverType = "master";			
				var serverConfigIndex = 0;//we need to find the next usable serverConfigIndex
				while(PPM.pConfig.getConfig("___server_"+serverConfigIndex+"_name") !== false) {serverConfigIndex++;}
				log("CREATING NEW SERVER: " + serverNumber + "/" + serverType + " serverConfigIndex: " + serverConfigIndex);
				//
				data.serverConfigIndex = serverConfigIndex;
				data.number = serverNumber;
				data.type = serverType;
				data.is_new = true;
				data.name = "PARANOIA-SYNC-SERVER-" + serverNumber;
				data.url = "https://";
				data.username = "";
				data.password = "";
				data.master_key = "Paranoia";
				data.encryption_scheme = "AesMd5";
				data.ping_interval_ms = 10000;
				data.is_connected = false;			
				data.originalData = {};
			} else {		
				var serverNumber = ev.target.getAttribute("serverNumber");
				var serverType = ev.target.getAttribute("serverType");
				var serverConfigIndex = PPM.pServer.getServerData(serverNumber, serverType, "srv_config_index");
				var srvConfigPrefix = "___server_" + serverConfigIndex + "_";
				log("EDITING: SERVER: " + serverNumber + "/" + serverType + " serverConfigIndex: " + serverConfigIndex);
				//
				data.serverConfigIndex = serverConfigIndex;
				data.number = serverNumber;
				data.type = serverType;
				data.is_new = false;
				data.name = PPM.pConfig.getConfig(srvConfigPrefix + "name");
				data.url = PPM.pConfig.getConfig(srvConfigPrefix + "url");
				data.username = PPM.pConfig.getConfig(srvConfigPrefix + "username");
				data.password = PPM.pConfig.getConfig(srvConfigPrefix + "password");
				data.master_key = PPM.pConfig.getConfig(srvConfigPrefix + "master_key");
				data.encryption_scheme = PPM.pConfig.getConfig(srvConfigPrefix + "encryption_scheme");
				data.ping_interval_ms = PPM.pConfig.getConfig(srvConfigPrefix + "ping_interval_ms");
				data.is_connected = PPM.pServer.getServerData(serverNumber, serverType, "is_connected");
				//after editing we will want to know what has been changed respect to this stuff so we do:
				//data.originalData = data;//;) - cyclic object
				data.originalData = JSON.parse(JSON.stringify(data));
			}
			
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_edit_server.xul';
			var xul_2_load_width = 700;
			var xul_2_load_height = 500;
			var xul_2_load_params = 'modal, centerscreen';
			window.openDialog(xul_2_load_url, "w_paranoia_edit_server", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params, JSON.stringify(data));
			
		}
		
		this.PSERV_click_edit_done = function(data) {
			log("got ("+(data.is_new===true?"NEW":"MODIFIED")+") server data: " + data.number+"/"+data.type+"/"+data.name);
			//log("DATA: " + JSON.stringify(data));
			var serverNumber = data.number;
			var serverType = data.type;
			var is_new = data.is_new;
			var srvConfigPrefix = "___server_"+data["serverConfigIndex"]+"_";
			//IF WE HAVE NEW SERVER WE MUST FIRST REGISTER IT
			if (is_new === true) {
				//log("DATA: " + JSON.stringify(data));
				////["number", "type", "name","url","username","password","master_key","encryption_scheme","ping_interval_ms","srv_config_index"];
				var srvConfig = {
					number: data["number"],
					type: data["type"],
					name: data["name"],
					url: data["url"],
					username: data["username"],
					password: data["password"],
					master_key: data["master_key"],
					encryption_scheme: data["encryption_scheme"],
					ping_interval_ms: data["ping_interval_ms"],
					srv_config_index: data["serverConfigIndex"]
				};
				var srv = PPM.pUtils.getParanoiaServer(srvConfig);
				srv.set("initial_payload_loaded",true);//SO IT WILL NOT LOAD INITAIL PAYLOAD
				PPM.pServer.addNewServer(srv);
				//adding number & type to config only for new servers
				PPM.pConfig.setConfig(srvConfigPrefix + "number", serverNumber);
				PPM.pConfig.setConfig(srvConfigPrefix + "type", serverType);
			}
	
			//MODIFIED EXISTING SERVER			
			if (data["name"] != data.originalData["name"]) {
				PPM.pConfig.setConfig(srvConfigPrefix + "name", data["name"]);
				PPM.pServer.setServerData(serverNumber, serverType, "name", data["name"]);
			}
			
			if (data["ping_interval_ms"] != data.originalData["ping_interval_ms"]) {
				PPM.pConfig.setConfig(srvConfigPrefix + "ping_interval_ms", data["ping_interval_ms"]);
				PPM.pServer.setServerData(serverNumber, serverType, "ping_interval_ms", data["ping_interval_ms"]);
			}
			
			if (data["url"] != data.originalData["url"]) {
				PPM.pConfig.setConfig(srvConfigPrefix + "url", data["url"]);
				PPM.pServer.setServerData(serverNumber, serverType, "url", data["url"]);
			}
			
			if (data["username"] != data.originalData["username"]) {
				PPM.pConfig.setConfig(srvConfigPrefix + "username", data["username"]);
				PPM.pServer.setServerData(serverNumber, serverType, "username", data["username"]);
			}
			
			if (data["password"] != data.originalData["password"]) {
				PPM.pConfig.setConfig(srvConfigPrefix + "password", data["password"]);
				PPM.pServer.setServerData(serverNumber, serverType, "password", data["password"]);
			}
			
			var ESMK_CHANGED = false;
			if ((data["encryption_scheme"] != data.originalData["encryption_scheme"]) || (data["master_key"] != data.originalData["master_key"])) {
				ESMK_CHANGED = true;
				PPM.pConfig.setConfig(srvConfigPrefix + "encryption_scheme", data["encryption_scheme"]);
				PPM.pConfig.setConfig(srvConfigPrefix + "master_key", data["master_key"]);
				PPM.pServer.setServerData(serverNumber, serverType, "encryption_scheme", data["encryption_scheme"]);
				PPM.pServer.setServerData(serverNumber, serverType, "master_key", data["master_key"]);
			}
			
			this.refresh_server_entries();//this is only needed on new server creation
			this.PSERV_update_screen_data();//updates server tab view
			
			if (is_new === true) {//let's try to connect new server
				PPM.pServer.connectSpecificServer(serverNumber, serverType);
			}
			
			if(ESMK_CHANGED === true) {
				//check if all servers are connected
				if (PPM.pServer.checkIfAllServersAreConnected("master") == false) {
					PPM.pUtils.alert(this.getVeryUgglyDataLossWarningMessage());
				} else {
					PPM.pUtils.alert("All your data will be resynced with servers!");
					this.PSERV_click_resync_all_servers(true);//true===will not ask for confirmation
				}
			}
		}
		
		
		
		this.PSERV_click_delete = function(ev) {
			//!!! check if this is a master server and if we have a mirror server configured you cannot do this!
			
			var serverNumber = ev.target.getAttribute("serverNumber");
			var serverType = ev.target.getAttribute("serverType");
			var numberOfRegisteredServers = PPM.pServer.getNumberOfRegisteredServers();		
			var queue_length = PPM.pServer.getServerData(serverNumber, serverType, "queue_length");
			var server_url = PPM.pServer.getServerData(serverNumber, serverType, "url");
			var server_username = PPM.pServer.getServerData(serverNumber, serverType, "username");
			
			if (serverNumber != numberOfRegisteredServers) {
				PPM.pUtils.alert("For now you can only remove the last server - server shifting is not done yet!");
				return;
			}
			if (queue_length>0) {
				PPM.pUtils.alert("You must wait for all operations to be executed before you can disconnect the server!"); 
				return;
			}
			var is_connected = PPM.pServer.getServerData(serverNumber, serverType, "is_connected");
			if (is_connected === true) {
				PPM.pUtils.alert("You must first disconnect this server!");
				return;
			}
			if (!confirm("Are you sure you want to remove DEFINITELY this server?")) {
				return;
			}
			//UNREGISTERING SERVER
			var serverConfigIndex = PPM.pServer.getServerData(serverNumber, serverType, "srv_config_index");
			if (PPM.pServer.unregisterServer(serverNumber, serverType) === false) {
				PPM.pUtils.alert("Server unregistration failed!");
				return;
			}
			//REMOVING CONFIGS
			var srvConfigPrefix = "___server_"+serverConfigIndex+"_";
			PPM.pConfig.removeConfig(srvConfigPrefix + "number");
			PPM.pConfig.removeConfig(srvConfigPrefix + "type");
			PPM.pConfig.removeConfig(srvConfigPrefix + "name");
			PPM.pConfig.removeConfig(srvConfigPrefix + "ping_interval_ms");
			PPM.pConfig.removeConfig(srvConfigPrefix + "url");
			PPM.pConfig.removeConfig(srvConfigPrefix + "username");
			PPM.pConfig.removeConfig(srvConfigPrefix + "password");
			PPM.pConfig.removeConfig(srvConfigPrefix + "encryption_scheme");
			PPM.pConfig.removeConfig(srvConfigPrefix + "master_key");
			
			PPM.pSettings.SERVER.refresh_server_entries();//this is only needed on new server creation
			PPM.pSettings.SERVER.PSERV_update_screen_data();//updates server tab view
			
			if (PPM.pServer.checkIfAllServersAreConnected("master") == false) {
				PPM.pUtils.alert(PPM.pSettings.SERVER.getVeryUgglyDataLossWarningMessage());
			} else {
				PPM.pUtils.alert("SERVER HAS BEEN REMOVED! - All your data will be resynced with remaining servers!");
				PPM.pSettings.SERVER.PSERV_click_resync_all_servers(true);//true===will not ask for confirmation
				//all data that was on this currently removed server has remained there - must remove manually 4 now
				PPM.pUtils.alert("Unused server data removal is not yet configured!\nAll data that was on the currently removed server is still there in the database!\nIf you don't want to use that data anymore, you should delete all data from the database at Paranoia Server("+server_url+") with username matching: " + server_username);
			}
			
		}
		
		this.PSERV_click_connectDisconnect = function(ev) {
			var serverNumber = ev.target.getAttribute("serverNumber");
			var serverType = ev.target.getAttribute("serverType");
			var is_connected = PPM.pServer.getServerData(serverNumber, serverType, "is_connected");
			var queue_length = PPM.pServer.getServerData(serverNumber, serverType, "queue_length");
			if (is_connected === true) {
				if (queue_length>0) {PPM.pUtils.alert("You must wait for all operations to be executed before you can disconnect the server!"); return;}
				//disconnect server
				PPM.pServer.disconnectSpecificServer(serverNumber,serverType);
			} else {
				//connect server
				PPM.pServer.connectSpecificServer(serverNumber,serverType);
			}		
		}
		
		this.PSERV_click_changeMultipleServerESMK = function() {
			var data = {};
			data.title = "Change your FirstPass server encryption key";
			data.description = "Change your encryption scheme and your Master Key for your first pass encryption."
			data.ES = PPM.pConfig.getConfig("___multiple_server_encryption_scheme");
			data.MK = PPM.pConfig.getConfig("___multiple_server_master_key");
			data.CALLBACKFUNCTION = "pSettings.SERVER.PSERV_click_changeMultipleServerESMK_done";//do NOT put PPM on front
			//
			var xul_2_load_url = 'chrome://paranoia/content/paranoia_change_mk.xul';
			var xul_2_load_width = 700;
			var xul_2_load_height = 350;
			var xul_2_load_params = 'modal, centerscreen';
			window.openDialog(xul_2_load_url, "w_paranoia_change_mk", "width="+xul_2_load_width+", height="+xul_2_load_height+"," + xul_2_load_params,  JSON.stringify(data));
		}
		
		this.PSERV_click_changeMultipleServerESMK_done = function(MSMK,MSES) {
			PPM.pConfig.setConfig("___multiple_server_master_key", MSMK);
			PPM.pConfig.setConfig("___multiple_server_encryption_scheme", MSES);
			if (PPM.pServer.checkIfAllServersAreConnected("master") == false) {		
				PPM.pUtils.alert(PPM.pSettings.SERVER.getVeryUgglyDataLossWarningMessage());
			} else {
				PPM.pUtils.alert("All your data will be resynced with servers!");
				PPM.pSettings.SERVER.PSERV_click_resync_all_servers(true);//true===will not ask for confirmation
			}
		}
		
		
		this.PSERV_click_resync_all_servers = function(noconfirm) {		
			//check if all servers are connected
			if (PPM.pServer.checkIfAllServersAreConnected("master") == false) {
				PPM.pUtils.alert("ATTENTION!!!Not all master servers are connected, so it is not possible to resync servers!\nMake sure you have all servers connected and then execute this task again.");
				return;
			}
			
			var confirmed = false;
			if (noconfirm===true){
				confirmed = true;
			} else {
				if (confirm("RESYNC ALL SERVERS?")) {
					confirmed = true;
				}
			}
			if (confirmed === true) {
				var PASSCARDS = PPM.pServer.getCombinedData().passcards;
				for (var pi = 0; pi < PASSCARDS.length; pi++) {
					PASSCARDS[pi].saveData("update");
					var URLCARDS = PASSCARDS[pi].getChildren();
					for (var ui = 0; ui < URLCARDS.length; ui++) {
						URLCARDS[ui].saveData("update");
					}
				}
			}
		}
		
		this.PSERV_update_screen_data = function() {
			if(PPM.get_state()<3) {return;}
			var srvTypes = ["master","mirror"];
			var numberOfRegisteredServers = PPM.pServer.getNumberOfRegisteredServers();		
			for (var sn = 1; sn <= numberOfRegisteredServers; sn++) {
				for (var st = 0; st < srvTypes.length; st++) {
					var serverType = srvTypes[st];
					var SRV_VBOX = document.getElementById("srv_vbox_"+sn+"_"+serverType);
					if (!SRV_VBOX){continue;}//we don't put mirror anymore
					var children = SRV_VBOX.children;
					for (var ci = 0; ci < children.length; ci++) {
						switch (children[ci].getAttribute("name")) {
							case "name":
								children[ci].setAttribute("value", "server name: " + PPM.pServer.getServerData(sn, serverType, "name"));
								break;
							case "type":
								children[ci].setAttribute("value", "server type: " + PPM.pServer.getServerData(sn, serverType, "type"));
								break;
							case "url":
								children[ci].setAttribute("value", "server url: " + PPM.pServer.getServerData(sn, serverType, "url"));
								break;
							case "username":
								children[ci].setAttribute("value", "server username: " + PPM.pServer.getServerData(sn, serverType, "username"));
								break;
							case "encryption_scheme":
								children[ci].setAttribute("value", "encryption scheme: " + PPM.pServer.getServerData(sn, serverType, "encryption_scheme"));
								break;
							case "ping_interval_ms":
								children[ci].setAttribute("value", "ping interval (ms): " + PPM.pServer.getServerData(sn, serverType, "ping_interval_ms"));
								break;
							case "is_connected":
								var is_connected = PPM.pServer.getServerData(sn, serverType, "is_connected");
								children[ci].setAttribute("value", "connected: " + (is_connected===true?"yes":"no"));
								//changing connect/disconnect button icon
								var B = document.getElementById("b_conn_disconn_"+sn+"_"+serverType);
								var cIconImg = (is_connected===true?"disconnect.png":"connect.png");
								var bfs = 'width:20px; height:20px; padding:2px; margin:0;';//button fields common styles
								B.setAttribute("style", bfs + 'background: url(chrome://paranoia/skin/images/'+cIconImg+') center center no-repeat; ');
								B.setAttribute("tooltiptext", (is_connected===true?"disconnect":"connect"));
								break;
							case "queue_length":
								children[ci].setAttribute("value", "operations in queue: " + PPM.pServer.getServerData(sn, serverType, "queue_length"));
								break;
							case "seed":
								children[ci].setAttribute("value", "current seed: " + PPM.pServer.getServerData(sn, serverType, "seed"));
								break;
							case "timestamp":
								children[ci].setAttribute("value", "last timestamp: " + PPM.pServer.getServerData(sn, serverType, "timestamp"));
								break;
							default:
						}
					}
				}			
			}	
			//log("_");
		}
		
		
		
		
		
		this.getVeryUgglyDataLossWarningMessage = function() {
			var t = "";
			t += "ATTENTION!!! POSSIBLE DATA LOSS!!!\n";
			t += "You have just changed your encryption_scheme and/or your master key and the configuration has been saved.\n";
			t += "Every time you do this operation all data must be rewritten to all configured servers.\n";
			t += "However it was found that not all servers are connected and so it is not possible to send your data to the servers.\n";
			t += "DO NOT CLOSE YOUR BROWSER OR LOG OUT FROM PARANOIA UNTIL YOU RESOLVE THIS!!!\n";
			t += "OTHERWISE NEXT TIME YOU LOG IN PARANOIA WILL NOT BE ABLE TO DECRYPT YOUR DATA!!!\n\n";
			t += "You can do 2 things:\n";
			t += "1) Reconnect all servers and then resync them. If you get no error you are ok.\n";
			t += "2) Put back your previously used  encryption_scheme and/ord your master key.\n";
			return(t);
		}
		
		
		
		
		
		
		/*------------------------------------------------------------------------------------------------------------------PRIVATE METHODS*/
		var log = function(msg) {PPM.log(msg,_logzone);}
	}
	
	this.SERVER = new ParanoiaSettings_server;
}).apply(ParanoiaPasswordManager.pSettings);

