<?php
class paranoiaConfig {
	//STEALTH MODE
	/*
	true = any bad/unauthorized request will return "404 - Not Found" instead of real error
	false = use it if you need to find out why things don't work
	*/
	var $stealth_mode_on = true;


	//DATABASE - YOU MUST PUT YOUR CORRECT DATABASE SETTINGS HERE
	var $mysql_server = '127.0.0.1';
	var $mysql_database = '';
	var $mysql_username = '';
	var $mysql_password = '';
	var $mysql_table_user = 'paranoia_users';//do NOT change this unless you have changed the name of the table
	var $mysql_table_seed = 'paranoia_seeds';//do NOT change this unless you have changed the name of the table
	var $mysql_table_data = 'paranoia_data';//do NOT change this unless you have changed the name of the table


	//SEED (THIS IS A STRING LIKE THAT WILL BE RENEWED AND SENT BACK TO PPM ON EACH COMUNICATION TO USE FOR CRYPTING FULL COMUNICATION DATA)
	/*
	seed_chars - array of 3 types of characters to use in seed
			- TYPE 1(ALPHA) don't think you can add anything
			- TYPE 2(NUMERIC) don't think you can add anything
			- TYPE 3(SPECIAL) feel free but watch out some chars don't work like: !!!DO NOT USE: "£","\"

	seed_min_num_chars_per_type - use at least this number of characters from each of the tree types
								- !!! (seed_min_num_chars_per_type * 3) should be less or equal seed_length_min !!!

	seed_length_min - the seed must be at least this long (number of characters)

	seed_length_max - the seed must be at most this long (number of characters)

	seed_life_time -	!IN SECONDS! - created seed will be registered in database so when next encrypted comunication comes in
						the last seed will be used to decrypt data.
						This seed will be valid for this number of seconds after which it will be deleted from db.
						!!!IMPORTANT!!! - Make sure in PPM server configuration in your browser for the parameter
						"Ping interval(ms)" you must put a value LESS than this so you can keep your seeds alive

	*/
	var $seed_chars = array(
		1 => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
		2 => '0123456789',
		3 => '#@?!|&%^*+-=.:,;/([{< >}])'
	);
	var $seed_min_num_chars_per_type = 8;
	var $seed_length_min = 24;
	var $seed_length_max = 32;
	var $seed_life_time = 60;//seconds NOT miliseconds!!!


	//DEBUG - THIS FOR NOW IS NOT IMPLEMENTED ANYWHERE - SO YOU CAN CHANGE IT AS YOU WISH IT WILL DO NOTHING
	var $debug = true;
	var $debug_file = 'paranoia.log';

}
?>