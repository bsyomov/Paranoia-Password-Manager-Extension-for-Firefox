/*
MySQL Database Structure For Paranoia Server Firefox Add-on Component
Date: 10/09/2011 06:58:30
*/

-- ----------------------------
-- Table structure for paranoia_data
-- ----------------------------
CREATE TABLE `paranoia_data` (
  `id` varchar(36) NOT NULL,
  `parent_id` varchar(36) NOT NULL DEFAULT '0',
  `username` varchar(64) NOT NULL DEFAULT '',
  `collection` varchar(32) NOT NULL,
  `payload` text,
  PRIMARY KEY (`id`,`username`,`collection`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for paranoia_seeds
-- ----------------------------
CREATE TABLE `paranoia_seeds` (
  `username` varchar(64) NOT NULL,
  `seed` varchar(64) NOT NULL,
  `timestamp` int(11) unsigned NOT NULL,
  `ip` varchar(15) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for paranoia_users
-- ----------------------------
CREATE TABLE `paranoia_users` (
  `username` varchar(64) NOT NULL,
  `password` varchar(64) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;


