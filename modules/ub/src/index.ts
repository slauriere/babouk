import commander from 'commander';
import fs from 'fs';
import http from 'http';
//import http from 'http2';
import https from 'https';
import yaml from 'js-yaml';

import server from './server.js'

const defaultConfigPath = 'ub.yaml'

commander.option('-c, --config <path>', 'use a config file')
  .parse(process.argv)

const getCasa = (config: any) => {
  if (config.localOnly) {
    return 'localhost'
  } else {
    return process.env.NW_ADDR || ''
  }
}

const validate = (path: any) => {
  if (!path) {
    path = defaultConfigPath
  }

  if (!fs.existsSync(path)) {
    commander.help()
  }
  return path
}

const configPath = validate(commander.config);
const config = yaml.load(fs.readFileSync(configPath).toString());
const app = server.create(config);

// https://medium.com/dailyjs/how-to-prevent-your-node-js-process-from-crashing-5d40247b8ab2
process.on('unhandledRejection', (reason: any, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});

if (config.certificate !== undefined) {
  const certificate = config.certificate;
  const key = fs.readFileSync(certificate.priv, 'utf8');
  const cert = fs.readFileSync(certificate.cert, 'utf8');
  const ca = fs.readFileSync(certificate.ca, 'utf8');

  const credentials = {
    key: key,
    cert: cert,
    ca: ca
  };

  https.createServer(credentials, app)
    .listen(config.port, getCasa(config), function () {
      console.log('Ub listening on port %s', config.port)
    })

  // also listen on standard port, with a redirection
  const redirector = server.create();
  redirector.get("*", (req: any, res: any, next: any) => {
    const host = req.headers.host;
    if (host === undefined) throw new Error("Host is undefined");
    let hostname = host;
    const index = host.indexOf(':');
    if (index > 0) {
      hostname = host.slice(0, index);
    }
    const redirection = `https://${hostname}:${config.port}${req.path}`;
    res.redirect(redirection);
  });
  http.createServer(redirector).listen(80, function () {
    console.log('Ub listening on port 80');
  });

} else {
  http.createServer(app)
    .listen(config.port, getCasa(config), function () {
      console.log('Ub listening on port %s', config.port)
    })
}

