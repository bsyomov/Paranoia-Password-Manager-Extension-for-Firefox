Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function ParanoiaPasswordManagerComponent() {
	this.wrappedJSObject = this;
}

ParanoiaPasswordManagerComponent.prototype = {
	classID: Components.ID("{444a1959-b040-467c-8978-5a7ea503f0a6}"),
	contractID: "@alfazeta.com/ParanoiaPasswordManagerComponent;1",
	className: "ParanoiaPasswordManagerComponent",
	classDescription: "Paranoia Password Manager XPCOM Component Core Service",
	
	_xpcom_categories: [{
        category: "profile-after-change"
    }],
    
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver, Components.interfaces.nsISupportsWeakReference]),
	
	observe: function () {
		var Console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		try {			
			Console.logStringMessage("---STARTING COMPONENT INITIALIZATION ::: PARANOIA---");
			Components.utils.import("resource://paranoiaModules/main.jsm");//import into global scope
			ParanoiaPasswordManager.initApplication();
			Console.logStringMessage("---FINISHED COMPONENT INITIALIZATION ::: PARANOIA---");
		} catch (e) {
			Console.logStringMessage("!!!FAILED COMPONENT INITIALIZATION ::: PARANOIA!!!\n"+e);
			Components.utils.reportError("!!!FAILED COMPONENT INITIALIZATION ::: PARANOIA!!!\n"+e);
		}
	}
};


const NSGetFactory = XPCOMUtils.generateNSGetFactory([ParanoiaPasswordManagerComponent]);

