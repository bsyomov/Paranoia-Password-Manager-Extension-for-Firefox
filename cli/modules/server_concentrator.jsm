var EXPORTED_SYMBOLS = ["pServer"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const Console = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
const Cu = Components.utils;
const Cui = Cu["import"];


function ParanoiaServerConcentrator() {
	var PPM;
	var _logzone = "pServer";
	var paranoia_servers;
	var combined_raw_data;
	var combined_structured_data;
	var operation_queue;
	var queueID;
	
	this.setup = function(ParanoiaPasswordManager) {
		PPM = ParanoiaPasswordManager;
		log("READY");
	}
	
	this.init = function() {
		log("initializing...");
		//
		var a = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
		a.addObserver(this, "paranoia-server-data-save-request", false);
		a.addObserver(this, "paranoia-server-data-save-execution-result", false);
		//
		log("initialization finished.");
	}
	
	this.uninit = function() {
		
	}
    
	
	
	this.registerServers = function() {
		paranoia_servers = new Array();
		combined_raw_data = new Array();
		combined_structured_data = new Object();
		operation_queue = new Array();
		queueID = 0;
	
		log("...registering Paranoia Servers...");
		var srvIndex = 0;
		var numberOfRegisteredServers = 0;
		var srvAttribs = ["number","type","name","url","username","password","master_key","encryption_scheme","ping_interval_ms"];
		var srv, srv_ok, srvConfig, srvPrefix, configName, configValue;
		
		//REGISTER SERVERS - all server data in config is trippleunderscored called ___server_[n]_[attribute] --> ___server_1_name
		while(true) {
			srv_ok = true;	
			srvConfig = {};
			srvPrefix = "___server_"+srvIndex+"_";
			for (var ai=0; ai<srvAttribs.length; ai++) {
				configName = srvAttribs[ai];
				configValue = PPM.pConfig.getConfig(srvPrefix + configName);
				if (configValue != false) {
					srvConfig[configName] = configValue;
				} else {
					srv_ok = false;
					break;
				}
			}
			if (!srv_ok) {break;}//-------------this is uggly struff - it should be the server class to decide about this!!!
			//now we have complete srvConfig for initing server
			//srvConfig["Paranoia"] = PPM;
			srvConfig["srv_config_index"] = srvIndex;
			if (_registerServer(PPM.pUtils.getParanoiaServer(srvConfig)) === false) {
				//do something in case of failed server registration
			}
			srvIndex++;
		}
		log("Registered "+_getNumberOfRegisteredServers()+" servers successfully.");
		
	}
	
	this.connectServers = function() {
		return;//---------------------------------------------------------------TESTING SERVER AUTOCONNECTION
		//CONNECT SERVERS
		var srvNumber = _getNumberOfRegisteredServers();
		var srvTypes = ["master","mirror"];
		var connectedServers = 0;
		var srv;
		for (var sn = 1; sn <= srvNumber; sn++) {
			for (var st = 0; st < srvTypes.length; st++) {
				var serverType = srvTypes[st];
				srv = _getRegisteredServer(sn,serverType);
				if (srv !== false) {
					log("(re)connecting server pServer/"+sn + " type: " + serverType);
					if (srv.get("is_connected") === false) {
						srv.connect();
					}
				}
			}
		}
	}	
	
	this.server_has_loaded_payload = function() {
		var numberOfReadyServers = 0;
		var srvNumber = _getNumberOfRegisteredServers();
		for (var sn = 1; sn <= srvNumber; sn++) {
			var serverType = "master";
			if (this.getServerData(sn,serverType,"initial_payload_loaded") == true) {
				numberOfReadyServers++;
			}
		}
		if (numberOfReadyServers == srvNumber) {
			this.checkAndCombineServerData();
			PPM.loginSequenceCompleted();
		}
	}
	
	
	this.disconnectAndUnregisterServers = function() {
		log("disconnecting Paranoia servers...");
		var srvNumber = _getNumberOfRegisteredServers();
		var srvTypes = ["master","mirror"];
		for (var sn = 1; sn <= srvNumber; sn++) {
			for (var st = 0; st < srvTypes.length; st++) {
				var serverType = srvTypes[st];
				srv = _getRegisteredServer(sn,serverType);
				if (srv !== false) {
					srv.disconnect();
				}
			}
		}
	}
	
	this.serverDisconnected = function() {
		var numberOfDisconnectedServers = 0;
		var srvNumber = _getNumberOfRegisteredServers();
		for (var sn = 1; sn <= srvNumber; sn++) {
			var serverType = "master";
			if (this.getServerData(sn,serverType,"is_connected") == false) {
				numberOfDisconnectedServers++;
			}
		}
		//if already logged off
		if (PPM.get_state() == 2 && numberOfDisconnectedServers == srvNumber) {
			while (this.unregisterServer(1,"master") === true) {
				//this func will splice our server array so we can always remove #1 until there is one 
			}			
			paranoia_servers = new Array();
			combined_structured_data = new Object();
			operation_queue = new Array();
			queueID = 0;
			PPM.logoutSequenceFinished();
		}
	}
	
	
	
	this.checkAndCombineServerData = function() {
		/*--THIS FUNC SHOULD:
		 * 1) GET SERVERS TO LOAD INITIAL(FULL) PAYLOAD DATA 
		 * 2) COMBINE(concat) PAYLOADS FROM DIFFERENT SERVERS WITH SAME ID
		 * 3) DECRYPT AND CHECK IF PAYLOADS ARE VALID (parsable)
		 * 4) REGISTER PASSCARDS
		 * 5) REGISTER URLCARDS
		 */ 
		try {
			combined_raw_data = new Array();
			combined_raw_data["master"] = new Array();
			combined_raw_data["mirror"] = new Array();
			combined_structured_data = new Object();
			combined_structured_data.passcards = new Array();
			
			var _DATA_ = new Array();
			var datalen, data_curr, data_reg, p, passcard, urlcard, srv;
			var MSMK = PPM.pConfig.getConfig("___multiple_server_master_key");
			var MSES = PPM.pConfig.getConfig("___multiple_server_encryption_scheme");
			
			var srvNumber = _getNumberOfRegisteredServers();
			var srvTypes = ["master","mirror"];
			log("Combining data from " + srvNumber + " servers...");
			
			//1 - getting payloads
			for (var sn = 1; sn <= srvNumber; sn++) {
				_DATA_[sn] = new Array();
				for (var st = 0; st < srvTypes.length; st++) {
					var serverType = srvTypes[st];
					srv = _getRegisteredServer(sn, serverType);
					if (srv !== false) {
						//srv.load_full_payload();						
						_DATA_[sn][serverType] = srv.get_payloads();
						//log("_DATA: " + JSON.stringify(_DATA_[sn][serverType]));
					}
				}
			}					
			
			//2 - concatenating payloads of same id
			for (var sn = 1; sn <= srvNumber; sn++) {
				for (var st = 0; st < srvTypes.length; st++) {
					var serverType = srvTypes[st];
					if (typeof(_DATA_[sn][serverType]) != "undefined") {
						datalen = _DATA_[sn][serverType].length;						
						//log("_SRVDATA["+sn+"/"+serverType+"]: " + JSON.stringify(_DATA_[sn][serverType]) + " - " + datalen);						
						for (var di = 0; di < datalen; di++) {
							//log("_SRVDATA["+sn+"/"+serverType+"/"+di+"]: " + JSON.stringify(_DATA_[sn][serverType][di]));
							___rawData_registerDataObject( _DATA_[sn][serverType][di], serverType );
						}
					}
				}
			}			
			//log("COMBINED RAW DATA MASTER: " + JSON.stringify(combined_raw_data["master"]));
			//log("COMBINED RAW DATA MIRROR: " + JSON.stringify(combined_raw_data["mirror"]));
			
			
			
			
			
			
			//-----------------------------------------FROM HERE ON I WILL USE MASTER DATA ONLY------------------------------			
			
			//--------------------NEEDS TO BE DONE: if there are some errors on master data check on mirror data ... this is why we have it
			//--------------------THOUGHTS: in _DATA_ we still have the 'uncombined' parts from each server - it could happen that we must cross data
			//------------------------------------from different server types master/mirror to recover data ... it needs a bit of tought...
			
			
			
			if (combined_raw_data["master"].length == 0) {
				log("CombinedRawData(master) is empty - No payload!");				
				return;
			}
			
			
			//3 - DECRYPTING AND CHECKING REGISTERED PAYLOADS
			var px = 0;
			var pmax = combined_raw_data["master"].length;
			log("decrypting and checking registered payloads..." + pmax);
			
			while (px < pmax) {
				try {
					var decryptedPayloadString = PPM.pUtils.decryptWithScheme(combined_raw_data["master"][px].payload, MSMK, MSES);
					JSON.parse(decryptedPayloadString);
					/*
					 * if the above did NOT throw an error then we have correctly decrypted and parsed "decryptedPayloadString"
					 * so we can set it as payload
					 * */
					combined_raw_data["master"][px].payload = decryptedPayloadString;
					px++;
				} 
				catch (e) {
					log("unparsable payload(" + px + ") ID: " + combined_raw_data["master"][px].id);
					combined_raw_data["master"].splice(px, 1);
					pmax--;
				}
			}
			log("Number of valid payloads: " + pmax);
			//log("DECRYPTED RAW DATA: " + JSON.stringify(combined_raw_data["master"]));///- ATTENTION THIS WILL EXPOSE/SHOW PASSWORDS IN CLEAR
			
			
			//4 - ADDING PASSCARDS
			log("registering PASSCARDS...");
			var px = 0;
			var pmax = combined_raw_data["master"].length;
			while (px < pmax) {
				p = combined_raw_data["master"][px];
				if (p["collection"] == "passcard" && p["parent_id"] == 0) {
					passcard = PPM.pUtils.getPasscard(p);
					this.registerNewPasscard(passcard);
				}
				px++;
			}
			
			//5 - ADDING URLCARDS
			log("registering URLCARDS...");
			var px = 0;
			while (px < pmax) {
				p = combined_raw_data["master"][px];
				if (p["collection"] == "urlcard" && p["parent_id"] != 0) {
					urlcard = PPM.pUtils.getUrlcard(p);
					this.registerNewUrlcard(urlcard);
				}
				px++;
			}
			
			/* getting rid of temporary values */
			combined_raw_data["master"] = new Array();
			delete (_DATA_);
			
			//_checkPasscards();//will log to console registered PCs
		} catch(e) {
			log("checkAndCombineServerData FAILED: " + e);
		}
	}
	
	
	this.registerNewPasscard = function(PC) {
		if(typeof(combined_structured_data.passcards) == "undefined") {combined_structured_data.passcards=new Array();}
		if (PC != false) {
			combined_structured_data.passcards.push(PC);
			return(true);
		}
		log("FAILED TO REGISTER NEW PASSCARD!");
		return(false);
	}
	
	
	this.unregisterPasscard = function(PC) {
		var answer = false;
		var PCID = PC.get("id");
		for (si = 0; si < combined_structured_data.passcards.length; si++) {
			if (PCID == combined_structured_data.passcards[si].get("id")) {
				//maybe we need to check something like sync_state on PC???!?!
				combined_structured_data.passcards.splice(si,1);
				answer = true;
				break; 
			}
		}
		return(answer);
	}
	
	this.getPasscardWithID = function(PCID) {
		return(_getPasscardWithID(PCID));
	}
	
	this.registerNewUrlcard = function(UC) {
		var is_registered = false;		
		if (UC !== false) {
			var PCID = UC.get("parent_id");
			//log("...registering urlcard with parent_id: "+PCID);
			var PC = _getPasscardWithID(PCID);
			if (PC !== false) {
				PC.addUrlcard(UC);					
				is_registered = true;
			}
		}
		return(is_registered);			
	}
	
	this.unregisterUrlcard = function(UC){
		var is_unregistered = false;		
		if (UC !== false) {
			var PCID = UC.get("parent_id");
			//log("...unregistering urlcard with parent_id: "+PCID);
			var PC = _getPasscardWithID(PCID);
			if (PC !== false) {
				PC.removeUrlcard(UC);					
				is_unregistered = true;
			}
		}
		return(is_unregistered);			
	}
	
	
	
	this.getUrlcardWithID = function(UCID) {
		return(_getUrlcardWithID(UCID));
	}
	
	this.getUrlcardsForHREF = function(href) {//this is the main href checking function for pOverlay
		var answer = new Array();
		for (si = 0; si < combined_structured_data.passcards.length; si++) {
			//the default passcard url check
			if (_check_if_hrefs_match(combined_structured_data.passcards[si].get("url"), href)) {
				answer.push(combined_structured_data.passcards[si]);
			}
			if (combined_structured_data.passcards[si].get("number_of_children") > 0) {
				var urlcards = combined_structured_data.passcards[si].getChildren();
				for (ui = 0; ui < urlcards.length; ui++) {
					if ( _check_if_hrefs_match(urlcards[ui].get("url"),href) ) {
						answer.push(urlcards[ui]);
					}
				}
			}
		}
		return(answer);
	}
	
	
	this.getCombinedData = function() {
		return(combined_structured_data);
	}
	
	this.addNewServer = function(srv) {
		log("adding new server...");
		return(_registerServer(srv));
	}
	
	this.unregisterServer = function(serverNumber, serverType) {
		return(_unregisterServer(serverNumber, serverType));
	}
	
	this.getNumberOfRegisteredServers = function() {
		return(_getNumberOfRegisteredServers());
	}
	
	this.checkIfAllServersAreConnected = function(serverType) {
		return(_checkIfAllServersAreConnected(serverType));
	}
	
	this.getServerData = function(serverNumber,serverType, prop) {
		return(_getServerData(serverNumber,serverType, prop));
	}
	
	this.setServerData = function(serverNumber,serverType, prop, value) {
		return(_setServerData(serverNumber,serverType, prop, value));
	}
	
	this.connectSpecificServer = function(serverNumber, serverType) {
		var answer = false;
		var srv = _getRegisteredServer(serverNumber,serverType);
		if (srv !== false) {
			var answer = srv.connect();
		}
		return(answer);
	}
	
	this.disconnectSpecificServer = function(serverNumber, serverType) {
		var answer = false;
		var srv = _getRegisteredServer(serverNumber,serverType);
		if (srv !== false) {
			var answer = srv.disconnect();
		}
		return(answer);
	}
	
	this.getNumberOfOperationsInQueue = function() {
		return(_getNumberOfOperationsInQueue());
	}
	
	this.observe = function(source, topic, data) {
		//log("observer/ topic: " + topic, "pServerConcentrator");
		switch (topic) {
			case "timer-callback":
				log("TIMER!");
				//this.operation_queue_check();
				break;
			case "paranoia-server-data-save-request":
				//log("...DATA SAVE REQUEST RECEIVED...");
				_registerSaveRequestInQueue(data);
				break;
			case "paranoia-server-data-save-execution-result":
				//log("...DATA SAVE EXECUTION RESULT RECEIVED..");
				_operation_queue_execution_result(data);	
				break;
			default:
				log("No observer action registered for topic: " + topic);
		}		
	}
	
	
	/*-------------------------------------------------------------------------------------------------------------------------------------------------------------------PRIVATE METHODS-------------*/
	var _registerServer = function(srv) {
		/*
		 * The paranoia_servers array will contain the registered servers where
		 * the index of the array will correspond to the configured server number (so ___server_n_number=99 will be placed in  paranoia_servers[99]
		 * the element @ that index will be an object and will have two attributes: "master" and "mirror" which will correspond to servers of type  ___server_n_type
		*/
		try {
			var serverName = srv.get("name");
			var serverNumber = srv.get("number");
			var serverType = srv.get("type");
			//do some other STRICT checks on server number as well... >== 0 and NUMERIC!!!
			if ((serverType != "master") && (serverType != "mirror")) {throw("Invalid server type: \"" + serverType + "\" of [" + serverName + "] @ srvNumber: " + serverNumber);}			
			
			
			if (typeof(paranoia_servers[serverNumber]) == "undefined") {
				paranoia_servers[serverNumber] = new Object();
				//paranoia_servers[serverNumber].master = new Object();
				//paranoia_servers[serverNumber].mirror = new Object();
			}			
			paranoia_servers[serverNumber][serverType] = srv;			
			log("Registered ParanoiaServer[" + serverName + "] @ srvNumber: " + serverNumber + " of type: " + serverType);
			return(true);
		} catch(e) {
			log("ParanoiaServerRegistration ERROR: " + e);
			return(false);
		}
	}
	
	var _unregisterServer = function(serverNumber, serverType) {
		try {
			var srv = _getRegisteredServer(serverNumber, serverType);
			if (srv === false) { 
				//throw("SERVER #"+serverNumber+"/"+serverType+" does NOT exist!");
				return(false);
			}
			if (srv.get("is_connected") === true) {
				log("Cannot unregister a connected server!");
				return(false);
			}
			srv.killServer();
			var serverName = srv.get("name");
			delete(paranoia_servers[serverNumber][serverType]);
			if (serverType == "master") {
				paranoia_servers.splice(serverNumber,1);				
			}
			log("Unregistered ParanoiaServer[" + serverName + "]");
			return(true);
		} catch(e) {
			log("ParanoiaServerUnRegistration ERROR: " + e);
			return(false);
		}		
	}
	
	
	var _getNumberOfRegisteredServers = function() {
		//since paranoia_servers starts @ index===1 the .length will return n+1 //unless there is nothing in it
		var len = paranoia_servers.length;
		if (len>0) {len--;}
		return(len);
	}
	
	var _checkIfAllServersAreConnected = function(serverType) {
		var answer = false;
		var srvNumber = _getNumberOfRegisteredServers();
		var connectedServers = 0;
		for (sn = 1; sn <= srvNumber; sn++) {				
			if (_getServerData(sn, serverType, "is_connected") === true) {
				connectedServers++;
			}
		}
		if (connectedServers == srvNumber) {
			answer = true;
		}
		return(answer);
	}
	
	var _getRegisteredServer = function(serverNumber,serverType) {
		var answer = false;
		if (typeof(paranoia_servers[serverNumber]) != "undefined") {
			if (typeof(paranoia_servers[serverNumber][serverType]) != "undefined") {
				answer = paranoia_servers[serverNumber][serverType];
			}
		}
		return(answer);
	}
	
	var _getServerData = function(serverNumber,serverType, prop) {
		var answer = false;
		var srv = _getRegisteredServer(serverNumber,serverType);	
		if (srv !== false) {
			var answer = srv.get(prop);
		}
		return(answer);		
	}
	
	var _setServerData = function(serverNumber,serverType, prop, value) {
		var answer = false;
		var srv = _getRegisteredServer(serverNumber,serverType);	
		if (srv !== false) {
			var answer = srv.set(prop,value);
		}
		return(answer);
	}
	
	
	
	
	
	var _getPasscardWithID = function(PCID) {
		var answer = false;
		for (si = 0; si < combined_structured_data.passcards.length; si++) {
			if (PCID == combined_structured_data.passcards[si].get("id")) {
				answer = combined_structured_data.passcards[si];
				break; 
			}
		}
		return(answer);
	}
	
	var _getUrlcardWithID = function(UCID) {
		var answer = false;
		for (si = 0; si < combined_structured_data.passcards.length; si++) {
			if (combined_structured_data.passcards[si].get("number_of_children") > 0) {
				var c = combined_structured_data.passcards[si].getChildWithID(UCID);
				if (c !== false) {
					answer = c;
					break; 
				}
			}
		}
		return(answer);
	}
	
		
	var _check_if_hrefs_match = function (Phref, Bhref) {//http://www.w3schools.com/jsref/jsref_obj_regexp.asp
		//Phref=Paranoia URLCARD HREF(this can be a regular expression)
		//Bhref=Browser href string
		if (Phref=="") {return(false);}//we don't want match on urlcards with NO url
		var RE = new RegExp(Phref,'');
  		return (RE.test(Bhref));		
	}
	

	
	var _registerSaveRequestInQueue = function(data) {
		/*
		 * the data parameter will hold: "id", "type" and "operation" type of the element that requested the operation  
		 * 
		 * The idea is that here we prepare the data for each server already split up as specified by configuration
		 * so that each server will only have to do:
		 * 1) !!! - check if "all master" and/or "all mirror" servers are up
		 * 2) encrypt payload with appropriate encryption scheme
		 * 3) register payload data at each sever
		*/
		
		try {
			var d = JSON.parse(data);
			var srvTypes = ["master","mirror"];
			var srvNumber = _getNumberOfRegisteredServers();
			
			//check if all MASTER servers are connected
			if (_checkIfAllServersAreConnected("master") == false) {
				PPM.pUtils.alert("NOT ALL SERVERS ARE CONNECTED - CANNOT ACCEPT DATA IN QUEUE!","DATA SAVE ERROR");
				//!!!should put passcard/urlcard state in "out of sync"!!!
				return(false);
			}
			
			
			
			//LET'S DEFINE THE QUEUE OBJECT
			var queueObject = new Object();
			queueObject.elementID = d["id"];
			queueObject.elementType = d["type"];
			queueObject.elementOperation = d["operation"];	
			//
			log("SaveRequestElement: " + queueObject.elementType + " with ID: " + queueObject.elementID + " operation: " + queueObject.elementOperation);
			//
			if (queueObject.elementType == "passcard") {
				queueObject.element = _getPasscardWithID(queueObject.elementID);
			} else 	if (queueObject.elementType == "urlcard") {
				queueObject.element = _getUrlcardWithID(queueObject.elementID);
			}
			
			
			//LET'S ENCRYPT AND SPLIT UP PAYLOAD FOR EACH SERVER
			queueObject.splitEPS = new Array();
			queueObject.operationResult = new Array();
			
			if (queueObject.elementOperation=="insert" || queueObject.elementOperation=="update") {				
				//ENCRYPT PAYLOAD
				var srvSaveData = {};
				var payloadString = queueObject.element.getDataForSaving().payload;
				//log("UPS: " + payloadString);//!! ATTENTION - EXPOSES DATA IN CLEAR
				//encrypting payload for splitting				
				var MSMK = PPM.pConfig.getConfig("___multiple_server_master_key");
				var MSES = PPM.pConfig.getConfig("___multiple_server_encryption_scheme");				
				var encryptedPayloadString = PPM.pUtils.encryptWithScheme(payloadString,MSMK,MSES);
				//log("EPS: " + encryptedPayloadString);
				
				//SPLIT PAYLOAD FOR EACH SERVER
				var EPSlength = encryptedPayloadString.length;
				var splitEPSlength = Math.floor(EPSlength / srvNumber);//we will distribute the EPS split up equally between servers
				
				for (sn = 1; sn <= srvNumber; sn++) {
					if (sn < srvNumber) {//if NOT the last server
						queueObject.splitEPS[sn] = encryptedPayloadString.substr(((sn-1) * splitEPSlength), splitEPSlength);//a single bit
					} else {
						queueObject.splitEPS[sn] = encryptedPayloadString.substr(((sn-1) * splitEPSlength));//the rest of it
					}
				}
			}
			
			//making array to hold operationResult from each server --- //0=not done, 1=done, 2=failed, (-1 = server doesn't exsist)
			for (sn = 1; sn <= srvNumber; sn++) {
				queueObject.operationResult[sn] = new Array();				
				
				//MASTER
				queueObject.operationResult[sn]["master"] = {result:0, number_of_tries:0};
				
				//MIRROR - let's put result=-1 if we have no mirror for this server otherwise Qo will remain in queue forever !!!
				if (_getRegisteredServer(sn, "mirror") === false) {
					var mres = -1;
				} else {
					var mres = 0;
				}
				queueObject.operationResult[sn]["mirror"] = {result:mres, number_of_tries:0};
				
			}
			
			
			//log("queueObject: " + JSON.stringify(queueObject));			
			
			//now add queueObject to 	operation_queue
			//adding queueID to queueObject so we can find this later by id
			queueID++;
			queueObject.queueID = queueID;
			operation_queue.push(queueObject);
					
			
			//now feed to each server the queueObject			
			for (sn = 1; sn <= srvNumber; sn++) {
				for (var st = 0; st < srvTypes.length; st++) {
					var serverType = srvTypes[st];
					var srv = _getRegisteredServer(sn, serverType);
					if (srv !== false) {
						srv.add_to_operation_queue(queueObject);
					}
				}
			}
			
		} catch(e) {
			log("feedSaveDataToServers FAILED: " + e);
			
		}
	}
	
	var _getNumberOfOperationsInQueue = function() {
		return(operation_queue.length);
	}
	
	var _findQueueObjectIndexByQueueID = function(id) {
		var answer = false;
		for (var i=0; i<operation_queue.length; i++) {
			if (operation_queue[i].queueID == id) {
				answer = i;
				break;
			}
		}
		return(answer);
	}
	
	var _operation_queue_execution_result = function(resultString) {
		log("RECEIVED OPERATION RESULT: " + resultString);
		try {			
			var d = JSON.parse(resultString);
			var R_srvNumber = d.srvNumber;
			var R_srvType = d.srvType;
			var R_queueObjectID = d.queueID;
			var R_execution_result = d.result;	
			//	
			var srvNumber = _getNumberOfRegisteredServers();
			var srvTypes = ["master","mirror"];
			//
			var qi = _findQueueObjectIndexByQueueID(R_queueObjectID);
			
			if (qi !== false) {
				var queueObject = operation_queue[qi];
				queueObject.operationResult[R_srvNumber][R_srvType]["result"] = R_execution_result;
				queueObject.operationResult[R_srvNumber][R_srvType]["number_of_tries"]++;
				
				//log("QOR["+R_srvNumber+"/"+R_srvType+"]: " + JSON.stringify(queueObject.operationResult[R_srvNumber][R_srvType]));
				
				if (R_execution_result != 1) {
					//EXECUTION FAILED - let's feed this back to server if number_of_tries<CONFIG["MAX_NUM_TRIES"] - TO BE DONE!
				}else {				
					//check if all operationResult values are === 1(OK) - and then remove queueObject
					var queueObjectExecutionCompleted = true;
					for (sn = 1; sn <= srvNumber; sn++) {
						for (var st = 0; st < srvTypes.length; st++) {
							var serverType = srvTypes[st];
							//if we still have UN-completed jobs on Registered servers(-1 is for a non existent mirror server)
							if (queueObject.operationResult[sn][serverType]["result"] !== 1 && queueObject.operationResult[sn][serverType]["result"] !== -1) {
								queueObjectExecutionCompleted = false;
							}
						}
					}
					//log("Qo: " + JSON.stringify(queueObject));
					
					
					if (queueObjectExecutionCompleted) {						
						operation_queue.splice(qi, 1);
						log("The queueObject("+queueObject.queueID+") was completed and removed - Remaining objects in queue: " + operation_queue.length);
						if (operation_queue.length == 0) {
							//if queue is empty we can reset this so it doesn't go off to infinity
							queueID = 0;
						}
						//now we can notify the originating element (queueObject.element) - telling it what type of operation was executed
						queueObject.element.saveDataConfirmation(queueObject.elementOperation);
					}
				}
				
			} else {
				log("Cannot find queueObject with ID: " + d.queueID);
			}
			
		} catch (e) {
			log("OP_QUEUE_RES ERROR: " + e);
		}
		
	}
	
	
	var ___rawData_getDataObjectByID = function(id, serverType) {
		var answer = false;
		if (typeof(combined_raw_data[serverType]) == "undefined") {
			combined_raw_data[serverType] = new Array();
		} else {
			for (var i = 0; i < combined_raw_data[serverType].length; i++) {
				if (combined_raw_data[serverType][i].id == id) {
					answer = combined_raw_data[serverType][i];
					break;
				}
			}
		}
		return(answer);
	}
	var ___rawData_registerDataObject = function(data, serverType) {
		var data_reg = ___rawData_getDataObjectByID(data.id, serverType);
		if (data_reg === false) {
			combined_raw_data[serverType].push(data);
		} else {
			data_reg.payload += data.payload;//concatenating payloads
		}
	}
	
	var _checkPasscards = function() {//only for testing	
		try {
			var PCL = combined_structured_data.passcards.length;
			for (si = 0; si < PCL; si++) {
				var PC = combined_structured_data.passcards[si];
				log("PASSCARD[" + si + "] ID: "+PC.get("id")+"  NAME: "+PC.get("name")+"  CHILDREN: "+PC.get("number_of_children"));
			}
		} catch(e) {
			log("CheckPasscard Failed: " + e);
		}
	}
	
	var log = function(msg) {PPM.log(msg, _logzone)};//just for comodity
}

var pServer = new ParanoiaServerConcentrator;
