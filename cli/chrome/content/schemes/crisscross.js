(function() {
	/*
	 * The following functions are available in this scope:
	 * LOG(msg:string) - the main Paranoia logging facility
	 * AES_ENCRYPT(txt:string, key:string) - The main AES encryption facility using 256 bit encryption
	 * AES_DECRYPT(txt:string, key:string) - The main AES decryption facility using 256 bit encryption
	 * MD5_HASH(txt:string) - Returns the md5 hash of a string
	 * 
	 * ENCRYPTION SCHEMES ON LOAD WILL BE CHECKED FOR AND NEED TO HAVE:
	 * name:string -> ES name
	 * description:string -> ES description
	 * encrypt:function -> ES crypt function 
	 * decrypt:function -> ES decrypt function
	 * checkEncryptionKey:function -> ES encryption key check function that returns error message if key is not valid otherwise true
	*/
	
	this.name = "CrissCross";
	this.description= "This scheme will crypt data with Aes and then mix up the resulting string (Lengh=n) as: C(1)+C(n)+C(2)+C(n-1)...";
	
	this.encrypt = function(txt,key) {
		return(crossString(AES_ENCRYPT(txt,key)));	
	}
	
	this.decrypt = function(txt,key) {
		return(AES_DECRYPT(decrossString(txt),key));
	}
	
	this.checkEncryptionKey = function(key) {
		if(key.length < 8) {
			return("The MK must be least 8 characters long.");
		} else if (key.length > 32) {
			return("The 256 bit Aes encryption will use at most 32 characters.");
		} 
		return(true);		
	}
	
	var crossString = function (txt) {
		var a = [];
		var t = txt.split("");
		while (t.length > 0) {
			a.push(t.splice(0,1));
			a.push(t.splice(t.length-1,1));    
		}
		return(a.join(""));
	}
	
	var decrossString = function(txt) {
		var a1 = [];
		var a2 = [];
		var t = txt.split("");
		while (t.length > 0) {
			a1.push(t.splice(0,1));
			a2.splice(0,0,t.splice(0,1));
		}
		return(a1.join("")+a2.join(""));
	}
	
}).apply(this);
