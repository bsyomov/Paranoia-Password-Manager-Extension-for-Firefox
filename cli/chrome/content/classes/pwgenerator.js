//VERY STUPID PASSWORD GENERATOR - I think we can do better than this

var passwordGenerator = {};  //namespace
  
passwordGenerator.getRandomPassword = function (s) {	
	//var pwlen = s.pwlen;
	//var charexcludes = s.charexcludes;
	//
	var cs_alpha_lower = "abcdefghijklmnopqrstuvwxyz";
	var cs__alpha_upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var cs_numeric = "0123456789";
	var cs_special = s.specialchars;
	//
	var charset = cs_alpha_lower + cs__alpha_upper + cs_numeric + cs_special;
	
	
	var rc = "";
	for (var i = 0; i < s.pwlen; i++) {
		rc += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	//
	return(rc);
}
  
