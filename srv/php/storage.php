<?php
class ParanoiaStorage {
	private $_dbh;	
	
	function __construct($pConf, $pUtils) {
		$this->_pConf = $pConf;
		$this->_pUtils = $pUtils;
		//$this->_JSON = $json;
		$this->_REQUEST_IP = $_SERVER['REMOTE_ADDR'];
		$this->_TIMESTAMP = date("U");
		$hostname = $this->_pConf->mysql_server;
		$dbname = $this->_pConf->mysql_database;
		$dbuser = $this->_pConf->mysql_username;
		$dbpass = $this->_pConf->mysql_password;
		
		$this->check_do_tests();//test functions only with stealth mode OFF and ?test param on url
		
		$this->_dbh = mysql_pconnect($hostname, $dbuser, $dbpass);
		
		if (!$this->_dbh) {
		   throw new Exception("Database unavailable", 503);
		}
		
		if (!mysql_select_db($dbname, $this->_dbh)) {
		   throw new Exception("Database unavailable", 503);
		}		

		$RAWPOST = $this->_pUtils->get_raw_post_data();
		$this->_JSON = $this->decryptRawPost($RAWPOST);
		
		///used to encrypt data in response - we need to get it right away before new seed will be assigned and saved into db
		$this->lastseed = $this->get_current_seed();			
	}
	
	private function decryptRawPost($RAWPOST) {
		$answer = false;
		try {
			//1) let's get array all registered seeds from db assigned to ip===$this->_REQUEST_IP and see if this stuff decrypts
			$q = 'SELECT seed FROM '.$this->_pConf->mysql_table_seed.' AS res WHERE res.ip = "'.$this->_REQUEST_IP.'"';
			$res = $this->execute_sql($q);
			if(mysql_num_rows($res) > 0) {
				while ($row = mysql_fetch_object($res)) {
					try {
						$jsonString = $this->_pUtils->decrypt_AesCtr($RAWPOST, $row->seed);
						$answer = $this->_pUtils->local_json_decode($this->_pUtils->fix_utf8_encoding($jsonString));
					} catch (Exception $e) {
						//this didn't work out...
					}
				}			
			}
			
			//2) let's get all users and try to decrypt rawpost with: 1st=password, 2nd=username and see if it works
			if ($answer === false) {
				$q = 'SELECT username, password FROM '.$this->_pConf->mysql_table_user.' AS res';
				$res = $this->execute_sql($q);
				if(mysql_num_rows($res) > 0) {
					while ($row = mysql_fetch_object($res)) {
						try {
							$jsonString = $this->_pUtils->decrypt_AesCtr($this->_pUtils->decrypt_AesCtr($RAWPOST, $row->password), $row->username);
							$answer = $this->_pUtils->local_json_decode($this->_pUtils->fix_utf8_encoding($jsonString));
							$answer->username = $row->username;
							$answer->password = $row->password;
						} catch (Exception $e) {
							//this didn't work out...
						}
					}
				}
			}		
			//BAIL OUT
			if ($answer === false) {
				throw new Exception("UNABLE TO DECRYPT RAW DATA!", 400);
			}
			//OK
			return($answer);
		} catch (Exception $e) {
			throw new Exception($e->getMessage(), $e->getCode());
		}
	}
	
	function encryptResponse($answer, $service) {
		if ($service != "get_login_seed") {
			//unless the service request was "get_login_seed" we crypt all data with current seed
			$cryptedResponse = $this->_pUtils->encrypt_AesCtr($this->_pUtils->local_json_encode($answer),$this->lastseed);			
		} else {
			//we have the very first seed in $answer but PPM on the other side does not have anything to decrypt data with
			//so we do the same thing as what we did on the incoming request :
			//we send data back crypted with the username and the password of this user
			$cryptedResponse = $this->_pUtils->encrypt_AesCtr($this->_pUtils->encrypt_AesCtr($this->_pUtils->local_json_encode($answer),$this->_JSON->username),$this->_JSON->password);
		}
		//I WOULD LIKE TO GET RID OF THE FOLLOWING LINE BUT IF I DO PPM IS UNABLE TO DECRYPT IT WHYYYY????? (encoding?)			
		$cryptedResponse = $this->_pUtils->local_json_encode($cryptedResponse);
		return($cryptedResponse);
	}

	
	
	private function remove_all_stale_seeds() {
		//LET'S REMOVE ALL STALE SEEDS
		$q = 'DELETE FROM '.$this->_pConf->mysql_table_seed.' WHERE timestamp < ' . ($this->_TIMESTAMP-$this->_pConf->seed_life_time);
		$this->execute_sql($q);
	}
	
	private function check_if_user_exists() {
		//LET'S CHECK IF WE HAVE USER IN USERS TABLE
		$q = 'SELECT username FROM '.$this->_pConf->mysql_table_user.' WHERE username = "'.$this->_JSON->username.'"';
		$res = $this->execute_sql($q);
		if(mysql_num_rows($res) != 1) {
			throw new Exception("Authentication error - You are not allowed here", 403);
		}
	}
	
	function getRequestedService() {
		return($this->_JSON->service);
	}
	
	function get_storage_timestamp() {
		return($this->_TIMESTAMP);
	}
	
	function get_current_seed() {
		$q = 'SELECT seed FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$this->_JSON->username.'" AND ip = "'.$this->_REQUEST_IP.'"';
		$res = $this->execute_sql($q);
		if (mysql_num_rows($res) > 1) {
			throw new Exception("Multiple current seeds!", 403);
		} else if (mysql_num_rows($res) == 0) {
			$seed = null;//no problem
		} else {
			$row = mysql_fetch_object($res);
			$seed = $row->seed;
		}		
		return($seed);
	}
	
	function get_assign_new_seed() {		
		//LET'S CHECK IF CURRENT USER ALREADY HAS SEED
		$q = 'SELECT seed FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$this->_JSON->username.'" AND ip = "'.$this->_REQUEST_IP.'"';
		$res = $this->execute_sql($q);
		if (mysql_num_rows($res) == 0) {
			//LET'S CREATE NEW SEED
			$seed = $this->_pUtils->getUgglyString();
			$q = 'INSERT INTO '.$this->_pConf->mysql_table_seed.' (username,seed,timestamp,ip) VALUES ("'.$this->_JSON->username.'","'.$seed.'",'.$this->_TIMESTAMP.',"'.$this->_REQUEST_IP.'")';
			$this->execute_sql($q);
		} else if (mysql_num_rows($res) == 1) {
			//LET'S UPDATE SEED TO A NEW ONE
			$seed = $this->_pUtils->getUgglyString();
			$q = 'UPDATE '.$this->_pConf->mysql_table_seed.' SET seed = "'.$seed.'", timestamp = '.$this->_TIMESTAMP.', ip = "'.$this->_REQUEST_IP.'" WHERE username = "'.$this->_JSON->username.'"';
			$this->execute_sql($q);
		} else if (mysql_num_rows($res) > 1) {
			throw new Exception("Multiple seeds found!", 403);
		}		
		if (!isset($seed)) {
			throw new Exception("Unable to get seed!", 403);	
		}
		return($seed);
	}
	
	function verify_user() {
		//$username = $this->_JSON->username;
		//$password = $this->_JSON->password;
		if(empty($this->_JSON->password)) {throw new Exception("Authentication error - No Password!", 403);}
		
		//get presumed username	and password
		$q = 'SELECT * FROM '.$this->_pConf->mysql_table_user.' WHERE username = "' . mysql_real_escape_string($this->_JSON->username) . '"';
		$res = $this->execute_sql($q);
		if(mysql_num_rows($res) != 1) {
			throw new Exception("Authentication error - No user here by that login!", 403);
		}
		$user = mysql_fetch_object($res);
		
		//LET'S GET USER'S CURRENT SEED WITH WHICH HE WILL BE 'FIDDLING' HIS PASSWORD
		$q = 'SELECT seed FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$this->_JSON->username.'" AND ip = "'.$this->_REQUEST_IP.'"';
		$res = $this->execute_sql($q);
		if(mysql_num_rows($res) != 1) {
			throw new Exception("Authentication error - No seed!", 403);
		}
		$row = mysql_fetch_object($res);
		$seed = $row->seed;
		
		$local_password = md5($user->password . $seed);
		
		if ($local_password != $this->_JSON->password) {
			throw new Exception("Authentication error - Passwords don't match!".$local_password, 403);
		}
		
	}
	
	function get_data() {
		$answer = new stdClass();
		
		$where[] = 'res.username =  "'.$this->_JSON->username.'"';
		
		if (isset($this->_JSON->payload_collection)) {
			$where[] = "res.collection = '" . $this->_JSON->payload_collection . "'";
		}
		
		if (isset($this->_JSON->payload_id)) {
			$where[] = "res.id = " . $this->_JSON->payload_id;
		}
		
		$where = ' WHERE ' . implode( ' AND ', $where );
		$q = 'SELECT id, parent_id, collection, payload FROM '.$this->_pConf->mysql_table_data.' AS res ' . $where;
		$res = $this->execute_sql($q);
		if(mysql_num_rows($res) > 0) {
			$answer->payloads = array();
			while ($row = mysql_fetch_object($res)) {
				$answer->payloads[] = $row;
			}				
		}
		mysql_free_result($res);
		return($answer);	
	}

	function set_data() {
		$username = $this->_JSON->username;
		$answer = new stdClass();		
		$payloads = $this->_JSON->payloads;
		foreach ($payloads as $payload) {
			if ($payload->operation != "delete" && $this->check_if_id_exists($payload->id, $this->_JSON->username) == true) {//UPDATE 
				$where = array();
				$where[] = 'res.username =  "'.$this->_JSON->username.'"';
				$where[] = 'res.collection =  "'.$payload->collection.'"';
				$where[] = 'res.id =  "'.$payload->id.'"';
				$where = ' WHERE ' . implode( ' AND ', $where );
				$q = 'UPDATE '.$this->_pConf->mysql_table_data.' AS res SET payload = \''.$payload->payload.'\'' . $where;				
			} else if ($payload->operation != "delete" && $this->check_if_id_exists($payload->id, $this->_JSON->username) == false){//INSERT
				$q = 'INSERT INTO '.$this->_pConf->mysql_table_data
					.' (id, parent_id, username, collection, payload) VALUES ('
					.'"'.$payload->id.'", '
					.'"'.$payload->parent_id.'", '
					.'"'.$this->_JSON->username.'", '
					.'"'.$payload->collection.'", '
					.'\''.$payload->payload.'\')';
			} else if ($payload->operation == "delete" && $this->check_if_id_exists($payload->id, $this->_JSON->username) == true) {
				$q = 'DELETE FROM '.$this->_pConf->mysql_table_data.' WHERE id = "'.$payload->id.'" AND username = "'.$this->_JSON->username.'"';
			} else {
				$answer->set_data_msg = "No suitable operation(".$payload->operation.") found!";
			}
			if (isset($q)) {
				$this->execute_sql($q);
			}
		}
		return($answer);	
	}
	
	function logout_user() {	
		$answer = new stdClass();
		$q = 'DELETE FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$this->_JSON->username.'" AND ip = "'.$this->_REQUEST_IP.'"';
		$this->execute_sql($q);
		$answer->response = "User disconnected.";
		return($answer);	
	}
	
	
	private function check_if_id_exists($id, $username) {
		$q = 'SELECT id FROM '.$this->_pConf->mysql_table_data.' WHERE id = "'.$id.'" AND username="'.$username.'"';
		$res = $this->execute_sql($q);
		if(mysql_num_rows($res) > 0) {
			return (true);
		} else {
			return(false);
		}
	}
	
	private function execute_sql($q) {
		if (!($res = mysql_query($q,$this->_dbh))) {
			throw new Exception("General SQL error(".$q."): " . mysql_error() , 503);
		}
		return($res);
	}
	
	private function check_do_tests() {
		if (!$this->_pConf->stealth_mode_on && isset($_GET["test"])) {
			//THIS IS ONLY FOR THE TESTING FUNCTIONS(disabled if stealth_mode_on===true)
			try {
				$answer = "";
				$hostname = $this->_pConf->mysql_server;
				$dbname = $this->_pConf->mysql_database;
				$dbuser = $this->_pConf->mysql_username;
				$dbpass = $this->_pConf->mysql_password;				
				//
				$this->_dbh = mysql_pconnect($hostname, $dbuser, $dbpass);
				//
				if (!$this->_dbh) {
				   throw new Exception("No connection to database server - check hostname, username and password!", 503);
				}
				
				if (!mysql_select_db($dbname, $this->_dbh)) {
				   throw new Exception("Cannot select database - check database name and access permissions for user!", 503);
				}
				$T_user = "TEST0123456789";
				$T_seed = "TEST0123456789";
				$T_timespamp = 0;
				$T_ip = "127.0.0.1";
				
				//TRY DELETE - SO WE DONT'T GET MULTIPLE PRIMARY KEY ERROR IF RECORD IS STILL THERE FOR SOME REASON
				$q = 'DELETE FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$T_user.'" AND seed = "'.$T_seed.'" AND timestamp = "'.$T_timespamp.'" AND ip = "'.$T_ip.'"';
				$this->execute_sql($q);
				
				//TRY INSERT
				$q = 'INSERT INTO '.$this->_pConf->mysql_table_seed.' (username,seed,timestamp,ip) VALUES ("'.$T_user.'","'.$T_seed.'","'.$T_timespamp.'","'.$T_ip.'")';
				$this->execute_sql($q);
				
				//TRY SELECT
				$q = 'SELECT * FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$T_user.'" AND seed = "'.$T_seed.'" AND timestamp = "'.$T_timespamp.'" AND ip = "'.$T_ip.'"';
				$res = $this->execute_sql($q);
				if(mysql_num_rows($res) == 0) {
					throw new Exception("Unable to find previously inserted temporary record - check Insert and Select permissions on your database user!" , 400);
				}
				
				//TRY UPDATE CHANGING TIMESTAMP
				$T_timespamp = 1;
				$q = 'UPDATE '.$this->_pConf->mysql_table_seed.' SET timestamp = "'.$T_timespamp.'" WHERE username = "'.$T_user.'" AND seed = "'.$T_seed.'" AND ip = "'.$T_ip.'"';
				$this->execute_sql($q);
				
				//RE-TRY SELECT LOOKING FOR NEW TIMESTAMP
				$q = 'SELECT * FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$T_user.'" AND seed = "'.$T_seed.'" AND timestamp = "'.$T_timespamp.'" AND ip = "'.$T_ip.'"';
				$res = $this->execute_sql($q);
				if(mysql_num_rows($res) == 0) {
					throw new Exception("Unable to find previously updated temporary record - check Update and Select permissions on your database user!" , 400);
				}				
				
				//DELETE THEM ALL
				$q = 'DELETE FROM '.$this->_pConf->mysql_table_seed.' WHERE username = "'.$T_user.'" AND seed = "'.$T_seed.'" AND ip = "'.$T_ip.'"';
				$this->execute_sql($q);
				
				
				//OK - NOW WE SHOULD TEST JSON AND AES
				$TKEY = $this->_pUtils->getUgglyString();//will use this for en/de-ctyption
				$TESTOBJECT = new stdClass();
				$TESTOBJECT->name = "Paranoia Password Manager";
				$TESTOBJECT->ugglyString = $this->_pUtils->getUgglyString();
				//
				$TOSTR = $this->_pUtils->local_json_encode($TESTOBJECT);
				$TOSTR_ENCRYPTED = $this->_pUtils->encrypt_AesCtr($TOSTR,$TKEY);
				$TOSTR_DECRYPTED = $this->_pUtils->decrypt_AesCtr($TOSTR_ENCRYPTED,$TKEY);
				$TESTOBJECT2 = $this->_pUtils->local_json_decode($TOSTR_DECRYPTED);
				//if no errors thrown so far we are doing good
				if ($TESTOBJECT->name != $TESTOBJECT2->name || $TESTOBJECT->ugglyString != $TESTOBJECT2->ugglyString) {
					throw new Exception("The original and the encrypted/decrypted objects are different - probably you haven't installed or loaded JSON apache module.",400);
				}				
				
				//WE SHOULD BE OK
				//IF USER HAS SENT MD5 PW HASHING REQUEST(md5it=someusername)
				if (isset($_GET["md5it"]) && !empty($_GET["md5it"])) {					
					$answer = " hash: " . md5($_GET["md5it"]);
				}
				//
				exit("OK.<br />".$answer);
				//
			} catch (Exception $e) {
				$this->_pUtils->report_problem("TEST ERROR: " . $e->getMessage(), $e->getCode());
			}
		}
	}	
}
?>