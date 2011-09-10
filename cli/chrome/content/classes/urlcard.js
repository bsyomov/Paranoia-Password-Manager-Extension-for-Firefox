function URLCARD(settings) {//{"id":"2","parent_id":"0","collection":"passcard","payload":"{\"name\":\"MITICO\"}"}	
	if (typeof(settings) == "undefined" || typeof(settings.id) == "undefined" || typeof(settings.parent_id) == "undefined" || typeof(settings.collection) == "undefined" || settings.collection != "urlcard") {return(false)};
	//Cui("resource://paranoia/utilities.jsm", this);
	//
	var id = settings.id;
	var parent_id = settings.parent_id;
	var collection = "urlcard";
	var is_container = false;
	var sync_state = 0; // 0=OK(in sync), 1=SYNCING, 2=ERROR(out of sync)
	//
	try {
		var payload = JSON.parse(settings.payload);
	} catch (e) {
		return (false);
	}	
	//	
	if (typeof(payload.additional_fields) == "undefined") {
		payload.additional_fields = new Array();
	}
	
	this.get = function(prop) {
		var answer = false;
		if (prop == "id") {
			answer = id;
		} else if (prop == "parent_id") {
			answer = parent_id;
		} else if (prop == "collection") {
			answer = collection;
		} else if (prop == "name") {
			answer = payload["name"];
		} else if (prop == "url") {
			answer = payload["url"];
		} else if (prop == "is_container") {
			answer = is_container;
		} else if (prop == "sync_state") {
			answer = sync_state;
		} else if (prop == "additional_fields") {
			answer = JSON.parse(JSON.stringify(payload.additional_fields));//stupid but efficient way of creating a duplicate of additional_fields
		}
		return(answer);
	}
	
	this.set = function(prop,value) {
		var answer = false;
		if (prop == "parent_id") {
			parent_id = value;
			answer = true;
		} else 	if (prop == "name") {
			if (value.length > 0) {
				payload[prop] = value;
				answer = true;
			}
		} else if (prop == "url") {
			payload[prop] = value;
			answer = true;
		} else if (prop == "additional_fields") {
			payload.additional_fields = value;//--------------------------maybe we should check this!?!
			answer = true;
		} else {
			//JackFFext.log("PASSCARD.set -> no propery ["+prop+"] by this name here.");
		}
		return(answer);
	}
	
	
	this.getDataForSaving = function() {
		var data = {};
		data.id = id;
		data.parent_id = parent_id;
		data.collection = collection;
		data.payload = JSON.stringify(payload);
		/*
		var payload = {};
		payload.name = name;
		payload.url = url;
		payload.f_username = f_username;
		payload.f_password = f_password;
		payload.additional_fields = additional_fields;
		data.payload = JSON.stringify(payload);*/
		return(data);
	}
	
	this.saveData = function(operation) {//operation: [insert|update|delete]
		//notifying ServerConcentrator that we need operation on this element
		sync_state = 1;
		var identifier = {"id":id, "type":collection, "operation":operation};
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-server-data-save-request", JSON.stringify(identifier));
		/*!!here we should start a timer which should:
		 * 1) on timeout repeat this operation N times
		 * 2) if we retried N times and we still have NOT received CONFIRMATION then put sync_state in 2(out of sync) 
		 */
	}
	this.saveDataConfirmation = function(operation) {//called from serverConcentrator/_operation_queue_execution_result when all servers have successfully executed save request
		sync_state = 0;
		//notifying pSettings
		var identifier = {"id":id, "type":collection, "operation":operation}; 
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-data-element-state-change", JSON.stringify(identifier));
		//and obviously kill timer
	}
	
	
}

URLCARD.prototype = {
	Cc: Components.classes,
	Ci: Components.interfaces,
	Cu: Components.utils,
	Cui: Cu["import"],	
	
}
