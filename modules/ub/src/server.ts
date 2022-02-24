import express from 'express';
import cookier from 'cookie-parser';
import morgan from 'morgan';

import rfs from 'rotating-file-stream';
import vhost from "vhost";
//import bodyParser from "body-parser";

import { Reference } from "@babouk/model";
import { error } from "./error.js";
import routes from "./routes/index.js";

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// enhance Request type globally for the specific middlewares
// TODO: should be moved elsewhere
declare global {
  namespace Express {
    interface Request {
      sphere: Reference,
      user: any,
      login: string
    }
  }
}

const log = rfs.createStream('http.log', {
  interval: '1d',
  path: "./logs"
})

let server: any;

const get = () => {
  if (server === undefined) {
    return false;
  }
  return server;
};

const create = (config?: any) => {
  // If config is undefined, a default Express app is created, used as an http app that will redirect to https
  if (config === undefined) return express();
  server = express();
  server.use(morgan('combined', { stream: log }));
  server.use(cookier());
  const boka = config.boka;
  if (config.spheres != undefined) {
    const spheres = config.spheres.reduce((obj: any, sphere: any) => {
      obj[sphere.id] = sphere;
      // Set variable orbis.boka since it can be used later on by utils.bokag from routes.ts.
      // Each orbis boka can either be the global common boka, or specific.
      sphere.boka = sphere.boka != undefined ? sphere.boka : boka;
      // Use orbis boka if any, otherwise use the global one
      const host = vhost(sphere.id, express.static(sphere.boka));
      //dlala.use(`/${orbis.id}`, host);
      server.use("/", host);
      return obj;
    }, {});

    // Attach the spheres to the application so that they can be retrieved later on, in particular within sam.js
    server.spheres = spheres;
    server.boka = boka;

    // Attach secret and sessionDuration that will be used for authentication
    server.authentication = config.authentication;
  }

  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Babouk REST API",
        version: "0.1.0",
        description:
          "This API allows to create pages, add them media or rings and to execute queries against the graph of resources (pages, media, rings)",
        license: {
          name: "MIT",
          url: "https://spdx.org/licenses/MIT.html",
        },
        contact: {
          name: "Babouk",
          url: "https://babouk.net"
        },
      },
    },
    apis: ['./dist/routes/authentication.js', './dist/routes/pages.js', './dist/routes/search.js'],
    components: {
      securitySchemes: {
        Bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  };


  const specs = swaggerJsdoc(options);

  // server.use(
  //   bodyParser.urlencoded({
  //     extended: true,
  //   })
  // );
  // server.use(bodyParser.json());

  server.get('/api/swagger.json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  const uiOptions = {
    customCss: '.swagger-ui .topbar { display: none }\n.swagger-ui table tbody tr td:first-of-type { min-width: 10em; }',
    customSiteTitle: "Babouk REST API",
    customfavIcon: "/assets/favicon.ico"
  };

  server.use(
    "/api",
    swaggerUi.serve,
    swaggerUi.setup(specs, uiOptions)
  );

  

  server.use(routes.authentication.create(server.authentication));
  server.use(routes.history);
  server.use(routes.search);
  server.use(routes.pages);
  server.use(routes.home);

  // Server error
  server.use((err: any, req: any, res: any, next: any) => {
    // TODO: use real logger
    console.log(err);
    error(err, res);
    next(err);
  });

  return server;
};

export default { get, create };
