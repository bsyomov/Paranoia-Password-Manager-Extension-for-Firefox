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
	
	this.name = "SinglePass";
	this.description= "This scheme will do a single pass AES encryption with a key.";
	
	this.encrypt = function(txt,key) {
		return(AES_ENCRYPT(txt,key));
	}
	
	this.decrypt = function(txt,key) {
		return(AES_DECRYPT(txt,key));
	}
	
	this.checkEncryptionKey = function(key) {
		if(key.length < 8) {
			return("The MK must be least 8 characters long.");
		}		
		return(true);
		
	}	
	
}).apply(this);
