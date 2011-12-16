//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

function ParanoiaServer(serverConfig) {
	var config = serverConfig;;//["number", "type", "name","url","username","password","master_key","encryption_scheme","ping_interval_ms","srv_config_index"];
	/*
	 * TYPE: can be "master" or "mirror"
	 * NUMBER: if type=mirror this number indicates which server we are mirroring 
	*/
	var PPM = ParanoiaPasswordManager;
	var is_connected = false;
	var is_busy = false;
	var seed = null;
	var timestamp = null;
	var ping_interval_ref = null;
	var last_ping_ts = null;
	var operation_queue = new Array();
	var serverResponse;
	var xhr = null;
	var self = this;
	var fullPayloadData = {};
	var disconnection_ts = Date.now() - PPM.pConfig.getConfig("auto_reconnect_disconnected_servers_after_ms");//so that newly created servers connect right away
	var initial_payload_loaded = false;
	var TO_TIMER = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);//connection timeout timer
	//
	
	this.connect = function() {//PHASE 1 - get initial login seed
		seed = null;
		timestamp = null;
		log("connecting(PHASE1)...");
		_comunicateWithServer({service: "get_login_seed", callback: "connect_phase_2"});
	}
	
	this.connect_phase_2 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("connection(PHASE1) error - GET LOGIN SEED FAILED!");
			return;
		}
		log("connecting(PHASE2)...");
		_comunicateWithServer({service: "ping", callback: "connect_phase_3"});
	}
	
	this.connect_phase_3 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("connection(PHASE2) error - LOGIN FAILED!");
			return;
		}
		is_connected = true;//OK - WE ARE CONNECTED TO SERVER
		_ping_service_start();
		log("CONNECTED");
		if (initial_payload_loaded === false) {
			this.load_full_payload();
		}
	}
	
	this.load_full_payload = function() {
		log("loading payload(PHASE3)...");
		_comunicateWithServer({service: "get", callback: "load_full_payload_DONE"});
	}
	
	this.load_full_payload_DONE = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("loading payload(PHASE3) error - LOAD FULL PAYLOAD FAILED!");
			return;
		}
		try {
			var fpdata;		
			fpdata = JSON.parse(self.SCO.serverResponse);
			//log("FULL PAYLOAD DATA: " + JSON.stringify(fpdata));
			
			if (typeof(fpdata) == "object" && typeof(fpdata.payloads) == "object" && (fpdata.payloads instanceof Array)) {
				//log("PAYLOADS BEFORE DECRYPT: " + JSON.stringify(fpdata.payloads));
				for (var i=0; i<fpdata.payloads.length; i++) {
					fpdata.payloads[i].payload = PPM.pUtils.decryptWithScheme(fpdata.payloads[i].payload, config["master_key"], config["encryption_scheme"]);
				}
				//log("PAYLOADS AFTER DECRYPT: " + JSON.stringify(fpdata.payloads));
				fullPayloadData = fpdata;
			}
			initial_payload_loaded = true;
			log("loading payload(PHASE3) - OK");
			PPM.pServer.server_has_loaded_payload();
		} catch (e) {
			log("PARSE FULL PAYLOAD FAILED!");
			return;
		}		
		

		
				
	}
	
	
	this.disconnect = function() {
		
		//if (is_busy){_add_to_operation_queue("disconnect");return;}
		//if (operation_queue.length > 0) {
			//on disconnection request we must make sure all operation_queue is pushed to server before disconnection
			//_add_to_operation_queue("disconnect");
			//return;
		//}
		log("disconnecting...");
		_ping_service_stop();
		if (is_connected) {			
			_comunicateWithServer({service: "logout",callback: "disconnect_phase_2"	});
		} else {
			log("disconnected.");
			PPM.pServer.serverDisconnected();
		}
	}
	
	this.disconnect_phase_2 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("PHASE 2 - DISCONNECTION FAILED!");
			return;
		}
		_putServerInDisconnectedState();
		log("disconnected.");
		PPM.pServer.serverDisconnected();
	}
	
	
	
	
	this.get_payloads = function() {
		return(fullPayloadData.payloads);
	}
	
	
	this.add_to_operation_queue = function(srvSaveData) {//id,parent_id,collection,payload
		//log("OP2EXEC: " + JSON.stringify(srvSaveData));
		_add_to_operation_queue(srvSaveData);
	}
		
	
	
	
	
	this.get = function(prop) {
		var answer;
		switch(prop) {
			case "number":
				answer = config["number"];
				break;
			case "type":
				answer = config["type"];
				break;
			case "name":
				answer = config["name"];
				break;
			case "url":
				answer = config["url"];
				break;
			case "username":
				answer = config["username"];
				break;
			case "encryption_scheme":
				answer = config["encryption_scheme"];
				break;
			case "ping_interval_ms":
				answer = config["ping_interval_ms"];
				break;
			case "is_connected":
				answer = is_connected;
				break;
			case "queue_length":
				answer = operation_queue.length;
				break;
			case "seed":
				answer = seed;
				break;
			case "timestamp":
				answer = timestamp;
				break;
			case "srv_config_index":
				answer = config["srv_config_index"];
				break;
			case "initial_payload_loaded":
				answer = initial_payload_loaded;
				break;
			default:
				answer = false;
		}
		return(answer);
	}
	
	this.set = function(prop, value) {
		var answer = false;
		switch (prop) {
			case "name":
				config["name"] = value;
				answer = true;
				break;
			case "ping_interval_ms":
				config["ping_interval_ms"] = value;
				answer = true;
				break;
			case "url":
				config["url"] = value;
				answer = true;
				break;
			case "username":
				config["username"] = value;
				answer = true;
				break;
			case "password":
				config["password"] = value;
				answer = true;
				break;
			case "encryption_scheme":
				config["encryption_scheme"] = value;
				answer = true;
				break;
			case "master_key":
				config["master_key"] = value;
				answer = true;
			case "initial_payload_loaded":
				/*We temporarily need this so when from config we add new server we can set this to true so after connect it will NOT load payload*/
				/*obviously connect & loadInitialPayload should be 2 separate tasks so we wouldn't need this*/
				initial_payload_loaded = value;
				answer = true;
				break;			
			default:
				break;
		}
		return(answer);
	}	
	
	this.observe = function(subject, topic, data) {
		switch (topic) {
			case "timer-callback":
				_check_what_to_do();
				break;
			default:
				log("No observer action registered for topic: " + topic);
		}
	}
	/*---------------------------------------------------------------------------------------------PRIVATE METHODS-------------*/	
	
	var _add_to_operation_queue = function(srvSaveData) {//id,parent_id,collection,payload
		operation_queue.splice(0,0,srvSaveData);
		//log("added to operation queue: " + JSON.stringify(srvSaveData));
	}
	
	var _execute_next_task_in_operation_queue = function() {
		var ql = operation_queue.length;
		if (ql==0) {return;}
		if (is_busy){return;}//-it will come around again when server is not busy anymore!
		//log("elements in queue: " + operation_queue.length);
		var queueObject = operation_queue.pop();
		if (typeof(queueObject) == "object") {
			_execute_payload(queueObject);
		} else {			
			if (queueObject == "disconnect") {
				_disconnect();
			} else {
				this.log("DUNNO WHAT TO DO WITH OP: " + queueObject);
			}
		}
	}
	
	var _execute_payload = function(queueObject) {//id,parent_id,collection,payload
		//we dont check on busy state here 'coz this func will be xecuted ONLY by  _execute_next_task_in_operation_queue which has already busy state check
		var result;//0=not done, 1=done, 2=failed, 3...
		var elementSaveData = queueObject.element.getDataForSaving();
		//
		var payloads = new Array();
		payloads[0] = new Object();
		payloads[0].operation = queueObject.elementOperation;//[insert|update|delete]
		payloads[0].id = elementSaveData.id;
		payloads[0].parent_id = elementSaveData.parent_id;
		payloads[0].collection = elementSaveData.collection;
		
		
		if (queueObject.splitEPS.length > 0) {
			var unencrypted_payload = queueObject.splitEPS[config["number"]];
			var encrypted_payload = PPM.pUtils.encryptWithScheme(unencrypted_payload, config["master_key"], config["encryption_scheme"]);
		} else {//this must be a delete operation so we haven't got splitEPS data
			encrypted_payload = '';
		}		
		payloads[0].payload = encrypted_payload;
		//log("EXECUTING PAYLOAD: " + JSON.stringify(payloads));		
		_comunicateWithServer({service:"set",callback:"execute_payload_DONE",payloads:payloads,queueID:queueObject.queueID});
	}
	
	this.execute_payload_DONE = function() {
		if (this.SCO.hasNewSeed !== true) {
			log("PAYLOAD EXECUTION FAILED!");
			result = 2;
		} else {
			result = 1;
		}
		//HERE WE SHOULD NOTIFY SERVER CONCENTRATOR THAT AN ELEMENT WITH ID WAS SAVED BY THIS SERVER
		//SO THAT PASSCARD/URLCARD CAN BE NOTIFIED AS WELL THAT IT IS IN SYNC WITH ALL SERVERS		
		var identifier = {"srvNumber":config["number"], "srvType":config["type"], "queueID":this.SCO.queueID, "result":result};
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-server-data-save-execution-result", JSON.stringify(identifier));
	}
	
	
	var _ping_service_start = function() {
		if (ping_interval_ref == null) {
			log("registering ping service["+config["ping_interval_ms"]+"]");
			try {
				last_ping_ts = Date.now();
				ping_interval_ref = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
				ping_interval_ref.init(self, 250, Ci.nsITimer.TYPE_REPEATING_SLACK);
			} catch (e) {
				ping_interval_ref = null;
				log("ping service registration error: "+e);
			}
		}
	}
	
	var _ping_service_stop = function() {
		if (ping_interval_ref != null) {
			log("unregistering ping service.");
			ping_interval_ref.cancel();
			ping_interval_ref=null;
		}
	}
	
	var _check_what_to_do = function() {
		/*
		 * This function will:
		 * 1) check if there is anything in queue to execute - ... and execute it
		 * 2) if not check if server needs a good old ping
		 * 3) if not it will do nothing
		 */
		if (!is_connected){
			//OOOOPS WE ARE DISCONNECTED - LET'S WAIT UNTIL "auto_reconnect_disconnected_servers_after_ms" passes and then lets try to reconnect
			var connect_in_ms = disconnection_ts + PPM.pConfig.getConfig("auto_reconnect_disconnected_servers_after_ms") - Date.now();
			//log("SERVER WAS DISCONNECTED @ " + disconnection_ts + " reconnecting in: " + connect_in_ms);
			if (connect_in_ms < 0) {				
				disconnection_ts = Date.now();//we must renew this otherwise we will do it ever 250ms
				log("trying to reconnect(@"+disconnection_ts+")...");
				self.connect();
			}
			return;//in any case don't go ahead 'coz we are disconnected			
		}
		
		if (is_busy){return;}
		
		//1- EXECUTING OPERATION IN QUEUE - IF ANY
		if (operation_queue.length > 0) {
			_execute_next_task_in_operation_queue();
			return;
		}
		//2- PINGING SERVER - IF NECESSARY
		if ( (last_ping_ts + config["ping_interval_ms"]) < Date.now()) {
			last_ping_ts = Date.now();			
			_comunicateWithServer({service: "ping"});			
		}
	}	
	
	var encryptD2S = function(d2s) {
		if (seed == null) {
			//if we have no seed yet we must encrypt data with combination username & password (md5hash of it 'coz server has only that)
			//the only case of this is when we are sending "get_login_seed"
			var Ed2s = JSON.stringify(d2s);
			Ed2s = PPM.pUtils.encryptWithScheme(Ed2s, config["username"], "SinglePass");
			Ed2s = PPM.pUtils.encryptWithScheme(Ed2s, PPM.pUtils.md5hash(config["password"]), "SinglePass");
		} else {
			//encrypt data normattly with current seed
			var Ed2s = JSON.stringify(d2s);
			Ed2s = PPM.pUtils.encryptWithScheme(Ed2s, seed, "SinglePass");
			//we must supply username for server otherwise it will not be able to know with whoose seed to decrypt this stuff
			//so for now we use: [username]|?|[crypted_data]
			//and server will use "|?|" as separator between username and data so...!!! DO NOT EVER USE "|?|" in usernames
			//Ed2s = d2s["username"] + '|?|' + Ed2s;
			
		}
		return(Ed2s);				
	}

	
	var _comunicateWithServer = function(SCO) {//SCO(ServerComunicationObject) {service:"name of service", callback:"callback function to call", payloads:...payloads...}
		try {
			_setBusy();
			TO_TIMER.init({
				observe: function(subject, topic, data) {
					log("SERVER COMUNICATION TIMEOUT("+PPM.pConfig.getConfig("timeout_server_connection_after_ms")+")!");
					_putServerInDisconnectedState();
					_setIdle();
					//the callback function
					if (typeof(self.SCO.callback) != "undefined" && typeof(self[self.SCO.callback]) == "function") {
						self[self.SCO.callback].call(self);
					}
				}
			}, PPM.pConfig.getConfig("timeout_server_connection_after_ms"), Ci.nsITimer.TYPE_ONE_SHOT);			
			var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
			xhr.onreadystatechange = self.comunicateWithServer_DONE;				
			self.SCO = SCO;
			SCO.data2send = _getPostDataDefaultObject(SCO.service);			
			if (typeof(SCO.payloads) == "object" && (SCO.payloads instanceof Array)) {SCO.data2send.payloads = SCO.payloads;}
			SCO.Edata2send = encryptD2S(SCO.data2send);			
			xhr.open("POST", config["url"], true); //false === SYNC / true === ASYNC			
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			//log("CWS(sending SCO): " + JSON.stringify(SCO));
			xhr.send(SCO.Edata2send);
		} catch(e) {
			log("_comunicateWithServer ERROR: " + e);
			_setIdle();
		}
	}
	
	this.comunicateWithServer_DONE = function(ev) {
		try {
			var xhr = ev.target;
			self.SCO.hasNewSeed = false;
			if (xhr.readyState == 4) {
				TO_TIMER.cancel();
				//try {log("XHR(RS:" + xhr.readyState + ")[S:" + xhr.status + "]: " + xhr.responseText);} catch(e) {}
				//
				var rawResponse = xhr.responseText;
				//log("RAW RESPONSE: " + rawResponse);				
				var encrypted_JSON_string = JSON.parse(rawResponse);//----------------------ON SERVER SIDE rawResponse is a JSON_encoded string - I cannot get rid of it!!!
				//log("CRYPTED RESPONSE: " + encrypted_JSON_string);				
				if (self.SCO.service == "get_login_seed") {
					//this is the only one that will not have seed-encrypted data - in this case server will use username & password
					var unencrypted_JSON_string = PPM.pUtils.decryptWithScheme(PPM.pUtils.decryptWithScheme(encrypted_JSON_string, PPM.pUtils.md5hash(config["password"]), "SinglePass"),config["username"],"SinglePass");
				} else {					
					var unencrypted_JSON_string = PPM.pUtils.decryptWithScheme(encrypted_JSON_string, seed, "SinglePass");					
				}
				//log("DECRYPTED RESPONSE("+seed+"): " + unencrypted_JSON_string);
				self.SCO.serverResponse = unencrypted_JSON_string;
				self.SCO.hasNewSeed = _register_new_seed();
				_setIdle();
				
				//the callback function
				if (typeof(self.SCO.callback) != "undefined" && typeof(self[self.SCO.callback]) == "function") {
					self[self.SCO.callback].call(self);
				}
			}
		} catch(e) {
			log("comunicateWithServer_DONE ERROR:" + e);
			log("XHR(RS:" + xhr.readyState + ")[ST:" + xhr.status + "] RESP: " + xhr.responseText);
			_putServerInDisconnectedState();
			_setIdle();
		}		
	}	
	
	
	var _register_new_seed = function() {
		try {
			if (self.SCO.service != "logout") {
				var serverResponse = JSON.parse(self.SCO.serverResponse);
				seed = serverResponse.Paranoia_Seed;
				timestamp = serverResponse.Paranoia_Timestamp;
				//log ("PINGED@"+timestamp+" seed: " + seed);
				if (seed == null || timestamp == null) {
					throw ("Unable to extract Paranoia_Seed or Paranoia_Timestamp from server response: " + self.SCO.serverResponse);
				}
			}			
		} catch(e) {
			log("SEED REGISTRATION FAILED: " +e);
			log("serverResponse: " +self.SCO.serverResponse);
			_putServerInDisconnectedState();
			return (false);
		}
		return(true);
	}
	
	var _getPostDataDefaultObject = function(service) {
		var answer = new Object;
		answer["service"] = service;
		answer["username"] = config["username"];	
		if (seed != null) {
			answer["password"] = PPM.pUtils.md5hash(PPM.pUtils.md5hash(config["password"]) + seed);
		}
		return(answer);
	}	
	
	var _setBusy = function() {
		_setBusyState(true);
	}
	var _setIdle = function() {
		_setBusyState(false);
		//_execute_next_task_in_operation_queue();
	}
	var _setBusyState = function(b) {
		//log("setting BUSY STATE FROM: "+ is_busy + " TO: " + b);
		is_busy = b;
	}
	
	var _putServerInDisconnectedState = function() {
		is_connected = false;
		seed = null;
		timestamp = null;
		disconnection_ts = Date.now();//so we know when we disconnected and can do auto reconnection after n ms
	}
	
	this.killServer = function() {
		_ping_service_stop();
	}
	
	var log = function(msg) {PPM.log(msg,"pServer/"+config["number"]+"/"+config["type"]);}
	
	
	_ping_service_start();
}

ParanoiaServer.prototype = {
	Cc: Components.classes,
	Ci: Components.interfaces,
	Cu: Components.utils,
	Cui: Cu["import"]
}	
