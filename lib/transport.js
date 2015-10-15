'use strict';

//var Mailgun = require('mailgun-js');
var packageData = require('../package.json'),
	needle = require('needle');

module.exports = function (options) {
	return new MailgunTransport(options);
};

function MailgunTransport(options) {
	this.options = options || {};
	this.name = 'Mailgun';
	this.version = packageData.version;

	// this.mailgun = Mailgun({
	// 	apiKey: this.options.auth.api_key,
	// 	domain: this.options.auth.domain || ''
	// });
}


MailgunTransport.prototype.send = function send(mail, callback) {
	console.log('Sending with mailgun...');
	this.generateMessage(mail.message.createReadStream(), (function(err, raw) {
			if (err) {
					return typeof callback === 'function' && callback(err);
			}
			this.sendMessage(mail, raw, callback);
	}).bind(this));
};

/**
 * <p>Compiles a BuildMail message and forwards it to handler that sends it.</p>
 *
 * @param {Object} mail Mail object
 * @param {Function} callback Callback function to run when the sending is completed
 */
MailgunTransport.prototype.sendMessage = function(mail, raw, callback) {
	//new Buffer(raw, 'utf-8') // required
	callback = callback || function(){};
	/*
curl -s --user 'api:key-da56cd51c69ca69ec260e3b7d086dca2' \
		https://api.mailgun.net/v3/sandboxe44c2da718fb4c8f8c78d7caf95065b0.mailgun.org/messages.mime \
		-F to='bob@example.com' \
		-F message=@files/message.mime
	*/
	var endpoint = 'https://api.mailgun.net/v3';
	var url = endpoint+'/'+this.options.auth.domain+'/messages.mime';
	var opts = {
		username: 'api',
		password: this.options.auth.api_key,
		multipart: true
	};
	var data = {
		to: mail.data.to,
		message: {
			buffer       : new Buffer(raw, 'utf-8'),
			filename     : 'message.mime',
			content_type : 'Message/rfc822'
		}
	};
	needle.post(url, data, opts, function(err, resp, body){
		if ( err ) { return callback(err); }

		if ( err ) {
			if (!(err instanceof Error)) {
				err = new Error('Email failed: ' + err);
			}
			return callback(err, null);
		}
		return callback(null, {
			envelope: mail.data.envelope || mail.message.getEnvelope(),
			messageId: data.id
		});
	});
};


/**
 * <p>Compiles the BuildMail object to a string.</p>
 *
 * <p>SES requires strings as parameter so the message needs to be fully composed as a string.</p>
 *
 * @param {Object} mailStream BuildMail stream
 * @param {Function} callback Callback function to run once the message has been compiled
 */

MailgunTransport.prototype.generateMessage = function(mailStream, callback) {
		var chunks = [];
		var chunklen = 0;

		mailStream.on('data', function(chunk) {
				chunks.push(chunk);
				chunklen += chunk.length;
		});

		mailStream.on('end', function() {
				callback(null, Buffer.concat(chunks, chunklen).toString());
		});
};

