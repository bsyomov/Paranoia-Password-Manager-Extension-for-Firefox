<?php
class ParanoiaUtils {
	function __construct($pConf) {
		require_once('aes/aes.php');     // AES PHP implementation
 		require_once('aes/aesctr.php');  // AES Counter Mode implementation
		$this->_pConf = $pConf;
	}
	
	function report_problem($message, $code = 404) {
		$headers = array(
					'400' => '400 Bad Request',
					'403' => '403 Forbidden',
					'404' => '404 Not Found',
					'503' => '503 Service Unavailable'
		);
		if ($this->_pConf->stealth_mode_on) {
			header('HTTP/1.1 ' . $headers{404},true,404);
			exit('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL '.$_SERVER['SCRIPT_NAME'].' was not found on this server.</p><hr><address>'.$_SERVER['SERVER_SIGNATURE'].'</address></body></html>');
		}
		//WE HAVE STEALTH MODE OFF SO WE CAN OUTPUT MESSAGES
		header('HTTP/1.1 ' . $headers{$code},true,$code);
		exit(json_encode($message));
	}
	
	function fix_utf8_encoding($string)	{
		if(mb_detect_encoding($string . " ", 'UTF-8,ISO-8859-1') == 'UTF-8') {
			return $string;
		} else {
			return utf8_encode($string);
		}
	}
	
	
	function get_raw_post_data() {
		try {
			$putdata = fopen("php://input", "r");
			$rawData = '';
			while ($data = fread($putdata,2048)) {$rawData .= $data;}
			return($rawData);
		} catch (Exception $e) {
			$this->report_problem("GET RAW DATA GENERAL ERROR!: " . $e->getMessage() , 400);
		}	
	}
	
	
	function decrypt_AesCtr($txt,$key) {
		return(AesCtr::decrypt($txt,$key,256));
	}
	function encrypt_AesCtr($txt,$key) {
		return(AesCtr::encrypt($txt,$key,256));
	}
	
	function local_json_decode($str) {
		try {
			$answer = json_decode($str);
		} catch (Exception $e) {
			//$this->report_problem("JSON DECODE ERROR: " . json_last_error(), 400);
			throw new Exception("JSON DECODE ERROR: " . json_last_error(), 400);
		}
		if ($answer === null) {
			//$this->report_problem("JSON DECODE ERROR: UNPARSABLE INPUT: " . json_last_error(), 400);
			throw new Exception("JSON DECODE ERROR: UNPARSABLE INPUT!", 400);
		}
		return($answer);
	}
	
	function local_json_encode($str) {
		try {
			$answer = json_encode($str);
		} catch (Exception $e) {
			$this->report_problem("JSON ENCODE ERROR: " . json_last_error(), 400);
		}
		if ($answer === null) {
			$this->report_problem("JSON ENCODE ERROR: NULL OUTPUT!", 400);
		}
		return($answer);
	}
	
	
	function getUgglyString() {//get variable length uggly string
		$seed = "";
		$seed_length = rand($this->_pConf->seed_length_min,$this->_pConf->seed_length_max);
		//randomly select how many chars from each type we will use
		$type_len[1] = rand($this->_pConf->seed_min_num_chars_per_type, $seed_length-(2*$this->_pConf->seed_min_num_chars_per_type));//type=1[ALPHA]
		$type_len[2] = rand($this->_pConf->seed_min_num_chars_per_type,$seed_length-$type_len[1]-$this->_pConf->seed_min_num_chars_per_type);//type=2[NUMERIC]
		$type_len[3] = $seed_length - $type_len[1] - $type_len[2];//type=3[SPECIAL]
		//		
		while(strlen($seed) < $seed_length) {
			$t = rand(1,3);
			$found = false;
			if ($type_len[$t]>0) {
				$type_len[$t]--;
				$chars = $this->_pConf->seed_chars[$t];
				$found = true;
			}
			if ($found) {
				$seed .= substr($chars,rand(0,strlen($chars)-1),1);
			}
		}
		return($seed);
	}
	
}
?>