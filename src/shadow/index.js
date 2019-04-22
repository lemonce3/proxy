const http = require('http');
const https = require('https');
const tls = require('tls');

class Shadow {
	constructor(hostname, port, mitmServer, shadowServer) {
		this.hostname = hostname;
		this.port = port;
		this.mitmServer = mitmServer;
		this.$server = shadowServer;
		this.address = null;
		this.isTls = shadowServer instanceof https.Server;

		this.$server.on('upgrade', mitmServer.strategy.UpgradeHandler(this));
	}

	get origin() {
		return `${this.isTls ? 'https' : 'http'}://${this.hostname}:${this.port}`;
	}

	init() {
		this.$server.listen();
		this.address = this.$server.address();
	}
	
	close() {
		this.$server.close();
	}
}

exports.http = class HttpShadow extends Shadow {
	constructor(hostname, port, mitmServer) {
		super(hostname, port, mitmServer, http.createServer());
		this.init();
	}
};

exports.https = class HttpsShadow extends Shadow {
	constructor(hostname, port, mitmServer, certKeyPair) {
		super(hostname, port, mitmServer, https.createServer({
			key: certKeyPair.privateKey,
			cert: certKeyPair.certificate,
			SNICallback(hostname, cb) {
				const certKeyPair = mitmServer.certificateStore.fetch(hostname);

				cb(null, tls.createSecureContext({
					key: certKeyPair.privateKey,
					cert: certKeyPair.certificate
				}));
			}
		}));

		this.$server.on('request', mitmServer.strategy.RequestHandler(this));
		this.init();
	}
};