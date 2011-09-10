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
	
	this.name = "AesMd5";
	this.description= "This scheme will do one pass AES with a key and a second pass with the md5 hash of the key.";
	
	this.encrypt = function(txt,key) {
		return(AES_ENCRYPT(AES_ENCRYPT(txt,key),MD5_HASH(key)));
	}
	
	this.decrypt = function(txt,key) {
		return(AES_DECRYPT(AES_DECRYPT(txt,MD5_HASH(key)),key));
	}
	
	this.checkEncryptionKey = function(key) {
		if(key.length < 8) {
			return("The MK must be least 8 characters long.");
		}
		return(true);
		
	}	
	
}).apply(this);

