/*
License
(The MIT License)

Copyright © 2010: Nando Vieira (simplesideias.com.br) - https://github.com/fnando/password_strength

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
files (the ‘Software’), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, 
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished 
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED ‘AS IS’, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE 
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS 
OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


var PasswordStrength = function(s) {
	var sc = s.specialchars.split("");
	var sc_escape_chars = '()[]{}.*?+^$|';//we will escape these chars with backslash
	
	//we will use specialchars in regular Expression so in this string we must escape special characters from sc_escape_chars
	var specialchars = '';
	for (var i=0; i<sc.length;i++) {
		var c = sc[i];
		if (sc_escape_chars.indexOf(c) != -1) {
			c = "\\" + c;
		}
		specialchars += c;
	}
	
	
	var MULTIPLE_NUMBERS_RE = new RegExp('\d.*?\d.*?\d','');											//	/\d.*?\d.*?\d/
	var MULTIPLE_SYMBOLS_RE = new RegExp('['+specialchars+'].*?'+'['+specialchars+']','');			//	/[!@#$%^&*?_~].*?[!@#$%^&*?_~]/
	var UPPERCASE_LOWERCASE_RE = new RegExp('([a-z].*[A-Z])|([A-Z].*[a-z])','');						//	/([a-z].*[A-Z])|([A-Z].*[a-z])/
	var SYMBOL_RE = new RegExp('['+specialchars+']','');												//	/[!@#\$%^&*?_~]/

	this.username = null;
	this.password = null;
	this.score = 0;
	this.status = null;

	this.test = function() {
		this.score = 0;

		if (this.containInvalidMatches()) {
			this.status = "invalid";
		} else {
			this.score += this.scoreFor("password_size");
			this.score += this.scoreFor("numbers");
			this.score += this.scoreFor("symbols");
			this.score += this.scoreFor("uppercase_lowercase");
			this.score += this.scoreFor("numbers_chars");
			this.score += this.scoreFor("numbers_symbols");
			this.score += this.scoreFor("symbols_chars");
			this.score += this.scoreFor("only_chars");
			this.score += this.scoreFor("only_numbers");
			this.score += this.scoreFor("username");
			this.score += this.scoreFor("sequences");
			this.score += this.scoreFor("repetitions");

			if (this.score < 0) {
				this.score = 0;
			}

			if (this.score > 100) {
				this.score = 100;
			}
			
			this.status = "BAD!";
			
			if (this.score > 20) {
				this.status = "weak";
			}

			if (this.score > 50) {
				this.status = "good";
			}

			if (this.score > 80) {
				this.status = "strong";
			}
			
			if (this.score > 95) {
				this.status = "PARANOID";
			}
		}

		return this.score;
	};

	this.scoreFor = function(name) {
		score = 0;

		switch (name) {
			case "password_size":
				if (this.password.length < 4) {
					score = -100;
				} else {
					score = this.password.length * 2;//4
				}
				break;

			case "numbers":
				if (this.password.match(MULTIPLE_NUMBERS_RE)) {
					score = 2;//5
				}
				break;

			case "symbols":
				if (this.password.match(MULTIPLE_SYMBOLS_RE)) {
					score = 2;//5
				}
				break;

			case "uppercase_lowercase":
				if (this.password.match(UPPERCASE_LOWERCASE_RE)) {
					score = 5;//10
				}
				break;

			case "numbers_chars":
				if (this.password.match(/[a-z]/i) && this.password.match(/[0-9]/)) {
					score = 10;//15
				}
				break;

			case "numbers_symbols":
				if (this.password.match(/[0-9]/) && this.password.match(SYMBOL_RE)) {
					score = 10;//15
				}
				break;

			case "symbols_chars":
				if (this.password.match(/[a-z]/i) && this.password.match(SYMBOL_RE)) {
					score = 10;//15
				}
				break;

			case "only_chars":
				if (this.password.match(/^[a-z]+$/i)) {
					score = -15;
				}
				break;

			case "only_numbers":
				if (this.password.match(/^\d+$/i)) {
					score = -15;
				}
				break;

			case "username":
				if (this.password == this.username) {
					score = -100;
				} else if (this.password.indexOf(this.username) != -1) {
					score = -50;
				}
				break;

			case "sequences":
				score += -15 * this.sequences(this.password);
				score += -15 * this.sequences(this.reversed(this.password));
				break;

			case "repetitions":
				score += -(this.repetitions(this.password, 2) * 4);
        			score += -(this.repetitions(this.password, 3) * 3);
        			score += -(this.repetitions(this.password, 4) * 2);
				break;
		};

		return score;
	};

	this.isGood = function() {
		return this.status == "good";
	};

	this.isWeak = function() {
		return this.status == "weak";
	};

	this.isStrong = function() {
		return this.status == "strong";
	};

	this.isInvalid = function() {
	  return this.status == "invalid";
	};

	this.isValid = function(level) {
		if(level == "strong") {
			return this.isStrong();
		} else if (level == "good") {
			return this.isStrong() || this.isGood();
		} else {
			return !this.containInvalidMatches();
		}
	};

	this.containInvalidMatches = function() {
		if (!this.exclude) {
			return false;
		}

		if (!this.exclude.test) {
			return false;
		}

		return this.exclude.test(this.password.toString());
	};

	this.sequences = function(text) {
		var matches = 0;
		var sequenceSize = 0;
		var codes = [];
		var len = text.length;
		var previousCode, currentCode;

		for (var i = 0; i < len; i++) {
			currentCode = text.charCodeAt(i);
			previousCode = codes[codes.length - 1];
			codes.push(currentCode);

			if (previousCode) {
				if (currentCode == previousCode + 1 || previousCode == currentCode) {
					sequenceSize += 1;
				} else {
					sequenceSize = 0;
				}
			}

			if (sequenceSize == 2) {
				matches += 1;
			}
		}

		return matches;
	};

	this.repetitions = function(text, size) {
		var count = 0;
  		var matches = {};
		var len = text.length;
		var substring;
		var occurrences;
		var tmpText;

		for (var i = 0; i < len; i++) {
			substring = text.substr(i, size);
			occurrences = 0;
			tmpText = text;

			if (matches[substring] || substring.length < size) {
				continue;
			}

			matches[substring] = true;

			while ((i = tmpText.indexOf(substring)) != -1) {
				occurrences += 1;
				tmpText = tmpText.substr(i + 1);
			};

			if (occurrences > 1) {
				count += 1;
			}
		}

		return count;
	};

	this.reversed = function(text) {
		var newText = "";
		var len = text.length;

		for (var i = len -1; i >= 0; i--) {
			newText += text.charAt(i);
		}

		return newText;
	};
};

PasswordStrength.test = function(settings, username, password) {
	strength = new PasswordStrength(settings);
	strength.username = username;
	strength.password = password;
	strength.test();
	return strength;
};
