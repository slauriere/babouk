import express, { Request } from 'express';
import jwt from "express-jwt";
const jsonParser = express.json({ limit: "1mb" });

import cerberos from "../services/cerberos.js";
import utils from "./utils.js";
import { error } from "../error.js";

const create = (authConfig: any) => {
  const authenticator = jwt({
    secret: authConfig.secret,
    credentialsRequired: false,
    getToken: function fromHeaderOrQuerystring(req: Request) {
      // The commented code below is when sending the token in the headers rather than as a cookie. Keep it for now.
      //if (req.headers.authorization && req.headers.authorization.split(" ")[0].toLowerCase() === "bearer") {
      // return req.headers.authorization.split(" ")[1];
      //} else if (req.query && req.query.token) {
      //  return req.query.token;
      //}
      if (req.cookies != null) return req.cookies.token;
      return null;
    }
  });

  const router = express.Router();

  router.use((req, res, next) => {
    const handleErrorNext = (err: any) => {
      //if (err) {
      // TODO: log error in morgan logger instead of the console
      if (err !== undefined) {
        console.log("jwt error", err);
        // TODO: check the general flow on error, especially when the jwt token is invalid
        //return next(err);
      }
      // if (err.name === 'UnauthorizedError' && err.inner.name === 'TokenExpiredError') {
      //   // TODO: a message should be sent informing the user to re-log
      //   return next();
      // }
      //}
      next();
    };
    authenticator(req, res, handleErrorNext);
  });

  router.use(utils.sphereExtractor);
  router.use(cerberos.cerberom);

  /**
   *  @openapi
   *  /.signin:
   *    post:
   *      summary: Authenticates a user
   *      tags: [Authentication or registration]
   *      requestBody:
   *        description: User login/password
   *        content: 
   *          'application/json':
   *            schema:
   *              type: object
   *              properties:
   *                login:
   *                  type: string
   *                password:
   *                  type: string
   *      responses:
   *        "200":
   *          description: The user could be authenticated
   *        "404":
   *          description: The user could not be authenticated
   */

  router.post("/.signin", jsonParser, (req, res) => {
    // TODO: add middleware which extracts the sphere id automatically for each route
    //const sphere = extractSphere(req);
    // signin is called either on login/password submission, or on cookie submission
    // when the user interface initializes and checks whether the current user is already logged-in
    const { login, password } = req.body;
    cerberos
      .signin(req.sphere, authConfig.secret, authConfig.duration, login != null ? login : req.cookies.login, password, req.cookies.token)
      .then((data: any) => {
        res.send(data);
      })
      .catch((err: Error) => error(err, res, req.body));
  });


  /**
   *  @openapi
   *  /.signup:
   *    post:
   *      summary: Authenticates a user
   *      tags: [Authentication or registration]
   *      requestBody:
   *        description: User login/password
   *        content: 
   *          'application/json':
   *            schema:
   *              type: object
   *              properties:
   *                login:
   *                  type: string
   *                password:
   *                  type: string
   *      responses:
   *        "200":
   *          description: The user was signed up successfully
   *        "404":
   *          description: The user could be signed up
   */

  router.post("/.signup", jsonParser, (req, res) => {
    const { login, password } = req.body;
    cerberos
      .signup(req.sphere, authConfig.secret, authConfig.duration, login, password)
      .then((result: Object) => {
        res.send(result);
      }).catch((err: Error) => error(err, res, req.body));
  });

  return router;
};

export default {
  create
};
