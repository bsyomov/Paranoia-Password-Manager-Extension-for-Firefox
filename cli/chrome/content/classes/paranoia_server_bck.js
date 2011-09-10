//import into global scope::: ParanoiaPasswordManager
Components.utils.import("resource://paranoiaModules/main.jsm");

function ParanoiaServer(serverConfig) {
	var config = serverConfig;;//["number", "type", "name","url","username","password","master_key","encryption_scheme","ping_interval_ms","srv_config_index"];
	/*
	 * TYPE: can be "master" or "mirror"
	 * NUMBER: if type=mirror this number indicates whiche server we are mirroring 
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
	var xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
	var log = function(msg) {PPM.log(msg,"pServer/"+config["number"]+"/"+config["type"]);}
	var self = this;
	var fullPayloadData = {};
	var do_async_request = true;
	//log("idle.");	
	
	this.connect = function() {//PHASE 1 - get initial login seed
		log("connecting...");	
		do_async_request = false;
		_comunicateWithServer({service: "get_login_seed", callback: "connect_phase_2"});	
	}
	
	this.connect_phase_2 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("PHASE 1 - GET LOGIN SEED FAILED! CONNECTION ABORTED!");
			return;
		}
		log("connecting(2)...");
		_comunicateWithServer({service: "ping", callback: "connect_phase_3"});
	}
	
	this.connect_phase_3 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("PHASE 2 - LOGIN FAILED! CONNECTION ABORTED!");
			return;
		}
		is_connected = true;//OK - WE ARE CONNECTED TO SERVER
		_ping_service_start(this);
		log("connected.");
		do_async_request = true;
		//tell server concentrator
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
		_comunicateWithServer({service: "logout", callback: "disconnect_phase_2"});
	}
	
	this.disconnect_phase_2 = function() {
		if(this.SCO.hasNewSeed !== true) {
			log("PHASE 2 - DISCONNECTION FAILED!");
			return;
		}
		is_connected = false;
		seed = null;
		log("disconnected.");
	}
	
	
	this.load_full_payload = function() {
		log("loading payload...");
		do_async_request = false;
		_comunicateWithServer({service: "get", callback: "load_full_payload_DONE"});
	}
	
	this.load_full_payload_DONE = function() {
		do_async_request = true;
		if(this.SCO.hasNewSeed !== true) {
			log("LOAD FULL PAYLOAD FAILED!");
			return;
		}
		var fpdata;
		
		try {
			fpdata = JSON.parse(xhr.responseText);
			//log("FULL PAYLOAD DATA: " + JSON.stringify(fpdata));
		} catch (e) {
			log("PARSE FULL PAYLOAD FAILED!");
			return;
		}		
		

		if (typeof(fpdata) == "object" && typeof(fpdata.payloads) == "object" && (fpdata.payloads instanceof Array)) {
			//log("PAYLOADS BEFORE DECRYPT: " + JSON.stringify(fpdata.payloads));
			for (var i=0; i<fpdata.payloads.length; i++) {
				fpdata.payloads[i].payload = PPM.pUtils.decryptWithScheme(fpdata.payloads[i].payload, config["master_key"], config["encryption_scheme"]);
			}
			//log("PAYLOADS AFTER DECRYPT: " + JSON.stringify(fpdata.payloads));
			fullPayloadData = fpdata;
			return;
		} else {
			return;
		}		
	}
	
	this.get_payloads = function() {
		return(fullPayloadData.payloads);
	}
	
	
	this.add_to_operation_queue = function(srvSaveData) {//id,parent_id,collection,payload
		log("OP2EXEC: " + JSON.stringify(srvSaveData));
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
				break;			
			default:
				break;
		}
		return(answer);
	}
	
	this.comunicateWithServer_DONE = function(ev) {
		try {
			
			//log("SCO: " + JSON.stringify(self.SCO));
			log("RS: " + xhr.readyState);
			log("STATUS: " + xhr.status);
			log("RESP: " + xhr.responseText);
			self.SCO.hasNewSeed = false;
			if (xhr.readyState == 4) {
				//xhr.onreadystatechange = null;
				if (xhr.status == 200 || xhr.status == 0) {					
					self.SCO.hasNewSeed = _register_new_seed(xhr);
				} else {
					log("comunicateWithServer[" + self.SCO.service + "] failed(" + xhr.status + "): " + xhr.responseText);
				}
				
				//log ("PINGED@"+timestamp+" seed: " + seed);
				
				_setIdle();
				
				//the callback function will be called anyways 
				if (typeof(self.SCO.callback) != "undefined" && typeof(self[self.SCO.callback]) == "function") {
					self[self.SCO.callback].call(self);
				}
				else {
					//log("comunicateWithServer - CANNOT CALLBACK: " + self.SCO.callback);
				}
			}
			
		} catch (e){
			log("comunicateWithServer FATAL ERROR:" + e);
		}
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
	
	
	var _ping_service_start = function(self) {
		log("registering ping service["+config["ping_interval_ms"]+"]");
		if (ping_interval_ref == null) {
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
		if (!is_connected){_ping_service_stop();return;}
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
	
	
	var _comunicateWithServer = function(SCO) {//SCO(ServerComunicationObject) {service:"name of service", callback:"callback function to call", payloads:...payloads...}
		_setBusy();
		var answer = false;
		self.SCO = SCO;
		var data2send = _getPostDataDefaultObject(SCO.service);
		if (typeof(SCO.payloads) == "object" && (SCO.payloads instanceof Array)) {data2send.payloads = SCO.payloads;}
		xhr.onreadystatechange = self.comunicateWithServer_DONE;
		xhr.open("POST", config["url"], do_async_request); //false === SYNC / true === ASYNC			
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send(JSON.stringify(data2send));
		return(answer);
	}
	
	
	
	var _register_new_seed = function(xhr) {
		seed = xhr.getResponseHeader("X-Paranoia-Seed");
		timestamp = xhr.getResponseHeader("X-Paranoia-Timestamp");
		if (seed == null) {
			log("GET SEED FAILED: " + xhr.responseText);
			_ping_service_stop();
			is_connected = false;
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
}

ParanoiaServer.prototype = {
	Cc: Components.classes,
	Ci: Components.interfaces,
	Cu: Components.utils,
	Cui: Cu["import"]
}	
