function PASSCARD(settings) {//{"id":"2","parent_id":"0","collection":"passcard","payload":"{\"name\":\"MITICO\"}"}	
	if (typeof(settings) == "undefined" || typeof(settings.id) == "undefined" || typeof(settings.collection) == "undefined" || settings.collection != "passcard") {return(false)};
	//Cui("resource://paranoia/utilities.jsm", this);
	//
	var id = settings.id;
	var parent_id = settings.parent_id;
	var collection = "passcard";
	var is_container = true;
	var is_open = false;
	var sync_state = 0; // 0=OK(in sync), 1=SYNCING, 2=ERROR(out of sync)
	//
	try {
		var payload = JSON.parse(settings.payload);
	} catch (e) {
		return (false);
	}
	//
	var childnodes = new Array();
	
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
		} else if (prop == "username") {
			answer = payload["username"];
		} else if (prop == "password") {
			answer = payload["password"];
		} else if (prop == "url") {
			answer = payload["url"];
		} else if (prop == "is_container") {
			answer = is_container;
		} else if (prop == "is_open") {
			answer = is_open;
		} else if (prop == "sync_state") {
			answer = sync_state;
		} else if (prop == "number_of_children") {
			answer = childnodes.length;
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
		} else if (prop == "username") {
			payload[prop] = value;
			answer = true;
		} else if (prop == "password") {
			payload[prop] = value;
			answer = true;
		} else if (prop == "url") {
			payload[prop] = value;
			answer = true;
		} else if (prop == "is_open") {
			is_open = value;
			answer = true;
		} else {
			//JackFFext.log("PASSCARD.set -> no propery ["+prop+"] by this name here.");
		}
		return(answer);
	}
	
	this.getChildren = function() {return childnodes;}
	
	this.getChildWithID = function(id) {
		var answer = false;
		for (i = 0; i < childnodes.length; i++) {
			if (id == childnodes[i].get("id")) {
				answer = childnodes[i];
				break; 
			}
		}
		return(answer);
	}
	
	
	this.addUrlcard = function(UC) {
		if (UC != false) {
			childnodes.push(UC);
		}
	}
	
	this.removeUrlcard = function(UC) {
		if (UC != false) {
			var id = UC.get("id");
			for (i = 0; i < childnodes.length; i++) {
				if (id == childnodes[i].get("id")) {
					childnodes.splice(i,1);
					break; 
				}
			}
		}
	}
	
	
	this.getDataForSaving = function() {
		var data = {};
		data.id = id;
		data.parent_id = parent_id;
		data.collection = collection;
		data.payload = JSON.stringify(payload);
		return(data);
	}
	
	this.saveData = function(operation) {//operation: [insert|update|delete]		
		sync_state = 1;
		//notifying ServerConcentrator
		var identifier = {"id":id, "type":collection, "operation":operation};
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-server-data-save-request", JSON.stringify(identifier));
	}
	this.saveDataConfirmation = function(operation) {
		//called from serverConcentrator/_operation_queue_execution_result when all servers have successfully executed save request
		sync_state = 0;
		//notifying pSettings
		var identifier = {"id":id, "type":collection, "operation":operation}; 
		Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService).notifyObservers(null, "paranoia-data-element-state-change", JSON.stringify(identifier));
	}
	
}

PASSCARD.prototype = {
	Cc: Components.classes,
	Ci: Components.interfaces,
	Cu: Components.utils,
	Cui: Cu["import"],	
}
