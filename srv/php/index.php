<?php
	ini_set('display_errors',1);
	error_reporting(E_ALL);//REPORT ALL ERRORS AT LEAST UNTIL WE DON'T GET CONFIG AND SUPPRESS IT WITH STEALTH MODE
	require_once('config.php');
	$pConf = new paranoiaConfig();
	if ($pConf->stealth_mode_on) {
		ini_set('display_errors',0);
		error_reporting(0);//SUPRESS ALL ERROR REPORTING EXPLICITELY - can you say "E_NONE"?
	}	
	
	try {
		require_once('storage.php');
		require_once('utils.php');
		
		$pUtils = new ParanoiaUtils($pConf);
		$storage = new ParanoiaStorage($pConf,$pUtils);
		
		$service = $storage->getRequestedService();
		
		//EACH SERVICE REQUEST MUST BE AUTHED UNLESS IT IS THE INITIAL "get_login_seed" WHICH WILL NOT SEND PASSWORD
		if ($service != "get_login_seed") {
			$storage->verify_user();
		}
		
		switch ($service) {
			case "get_login_seed":
				$answer = new stdClass();
				$answer->response = "New seed assigned.";
				break;
			case "get":
				$answer = $storage->get_data();
				break;
			case "set":
				//sleep(1);
				$answer = $storage->set_data();
				break;
			case "ping":
				//sleep(2);
				$answer = new stdClass();
				$answer->response = "Pinged.";
				break;
			case "logout":
				$answer = $storage->logout_user();
				break;
			default:
				throw new Exception("Unknown service requested: " . $service, 400);
		}
		
		//generate new seed ... unless we are disconnecting
		if ($service != "logout") {
			$seed = $storage->get_assign_new_seed();
			$answer->Paranoia_Seed = $seed;
		}
		
		//...and timestamp
		$timestamp = $storage->get_storage_timestamp();
		$answer->Paranoia_Timestamp = $timestamp;
		
		//crypt answer
		$cryptedResponse = $storage->encryptResponse($answer, $service);		
		
		//put headers
		header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
		header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
		header("Cache-Control: no-store, no-cache, must-revalidate");
		header("Cache-Control: post-check=0, pre-check=0", false);
		header("Pragma: no-cache");
		//header("Content-type: application/json; charset=UTF-8");
		header("Content-type: text/plain; charset=UTF-8");
		
		//give answer
		print("$cryptedResponse");
		
	} catch (Exception $e) {
		$pUtils->report_problem($e->getMessage(), $e->getCode());
	}
?>
