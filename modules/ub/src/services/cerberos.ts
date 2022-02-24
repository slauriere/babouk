"use strict";
import AccessControl from 'accesscontrol';
import argon2 from "argon2";
import { NextFunction, Request, Response } from 'express';
import jwt from "jsonwebtoken";

import { getSphere, Reference, resolve, normalize, katonoma, serialize } from "@babouk/model";
import { error } from "../error.js";
import store from "./store.js";
import { getSettings } from "../utils.js";

const guard = new AccessControl.AccessControl();
// declare role ".nn" with no specific rights for now. TODO: declare rights
guard.grant(".nn");

// TODO: move secret and expiration delay in configuration

const createToken = async (secret: string, expiresIn: string, identifier: string, password: string) => {
  // TODO: is the password needed here
  return jwt.sign(
    {
      login: identifier,
      password: password
    },
    secret,
    { expiresIn: expiresIn }
  );
};

const grant = async (user: Reference) => {
  const identifier = katonoma(user);
  guard.grant(identifier).createAny('page').updateAny('page');
  const settings = await getSettings(getSphere(user));
  const policy = settings.cerbero;
  if (policy !== undefined && policy.stromae !== undefined && katonoma(user) === policy.stromae) {
    guard.grant(identifier).deleteAny('page');
  }
}

const can = async (user: Reference, resource: Reference, action: string): Promise<boolean> => {
  // TODO: the set can actually be undefined if we check the access to a sphere
  // TODO: allow access restriction to a sphere
  if (resource.set === undefined)
    return true;
  const settings = await getSettings(resource.set);
  const policy = settings.cerbero;
  const userId = katonoma(user);
  const resourceId = katonoma(resource);
  switch (action) {
    case "read":
      if (userId !== ".nn")
        return true;
      else {
        // For now, all services are public in read mode except signup
        if (store.services.includes(resourceId) && resourceId !== ".signup")
          return true;
        if (policy === undefined)
          return true;
        else {
          if (resourceId === "" || resourceId === ".settings") {
            return true;
          }
          return policy.read === undefined || policy.read === ".nn";
        }
      }
    case "create":
      if (resourceId === ".signin") {
        return true;
      } else if (resourceId === ".signup") {
        return policy === undefined || policy.signup === true;
      } else {
        return guard.can(userId).createAny('page').granted;
      }
    case "write":
      return guard.can(userId).updateAny('page').granted;
    case "delete":
      return guard.can(userId).deleteAny('page').granted;
  }
  return false;
}
//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6ImEiLCJwYXNzd29yZCI6IiRhcmdvbjJpJHY9MTkkbT00MDk2LHQ9MyxwPTEkdDgrRStvaU4yRW16azl4eWZsVGtydyRJbVdKVEduQmFWR1hVZXZBQk0wVklIYTVjcmpwVUhHcTBWczE4WURNRU80IiwiaWF0IjoxNTg5Mjc1MzcwLCJleHAiOjE1ODk1MzQ1NzB9.FW4vng20eZdFzm8P7mKVXitvAxggfrLklzgI-VzW9AM
// Sign in or check token. This function is meant to be called either with a non empty password and an empty token,
// or with an empty password and with a non empty token
const signin = async (sphere: Reference, secret: string, expiresIn: string, login: string, password: string, token?: string): Promise<Object> => {
  if (login === undefined)
    return Promise.resolve({});
  const identifier = normalize(login);
  const user = await store.getUser(sphere, identifier);
  if (token == null && password != null) {
    // The user has just registered and the system is now signing him in.
    const hash = await store.getUserKey(user.reference);
    const result = await argon2.verify(hash, password);
    if (result === true) {
      const token = await createToken(secret, expiresIn, identifier, hash);
      await grant(user.reference);
      return {
        login: identifier,
        label: login,
        token: token
      };
    } else {
      throw new Error("Invalid account");
    }
  } else {
    // We check the existing token is valid
    // The token is checked by the jwt middleware declared in the routes but it calls next in order to not block the user interface completely
    // TODO: hander invalid token more properly
    if (token != null) {
      try {
        console.log("verifying......")
        const result = jwt.verify(token, secret);
        await grant(user.reference);
        return { login: login };
      } catch (e) {
        return Promise.resolve({});
      }
    } else {
      throw new Error("Invalid account");
    }
  }
};

// sign up
// TODO: the expiresIn and secret parameters should be moved to settings instead
const signup = async (sphere: Reference, secret: string, expiresIn: string, login: string, password: string): Promise<Object> => {
  const hash = await argon2.hash(password);
  const page = await store.addUser(sphere, login, hash);
  const identifier = katonoma(page);
  await createToken(secret, expiresIn, identifier, hash);
  return signin(sphere, secret, expiresIn, login, password);
};

// Express middleware controlling access
const cerberom = async (req: Request, res: Response, next: NextFunction) => {
  const segments = req.path.split("/");
  // NB: req.user is set by jwt
  req.login = (req.user !== undefined && req.user.login !== undefined) ? req.user.login : ".nn";
  // TODO: check if the "includes" call requires optimization since it is called often
  // If the first segment starts with a dot, it can either be a service (e.g. ".search") or an page (e.g. ".settings").
  // TODO: check what's the exact use of this if / else about services
  // if (segments.length > 0 && sam.services.includes(segments[1])) {
  //   console.log("segments", segments);
  //   const service = segments[1];
  //   try {
  //     console.log(req.method, katonoma(req.sphere), req.path, segments[1], req.iiakhawunti);
  //     const granted = await can(resolve(req.iiakhawunti, req.sphere), resolve(service, req.sphere), service);
  //     if (granted === true) next();
  //     else unauthorized(req, res);
  //   } catch (err) {
  //     err.status = 500;
  //     error(err, res, req.body);
  //   }
  // } else {
  const resource = segments[1];
  let action = "read";
  switch (req.method) {
    case "GET":
      action = "read";
      break;
    case "POST":
      action = "create";
      break;
    case "PUT":
      action = "write";
      break;
    case "DELETE":
      action = "delete";
      break;
  }
  console.log(req.method, katonoma(req.sphere), req.path, resource, req.login, action);
  try {
    const target = resolve(resource, req.sphere);
    const granted = await can(resolve(req.login, req.sphere), target, action);
    if (granted === true) next();
    else {
      console.log("unauthorized");
      const signinPage = resolve(".signin", req.sphere);
      const signinUrl = serialize(signinPage);
      if (req.method === "GET") {
        console.log("redirecting to", signinUrl);
        res.redirect(signinUrl + "?page=" + resource);
      } else {
        unauthorized(req, res);
      }
    }
  } catch (err) {
    err.status = 500;
    error(err, res, req.body);
  }
  //}
}

const unauthorized = (req: Request, res: Response) => {
  const err = new Error("Unauthorized") as any;
  err.status = 401;
  error(err, res, req.body);
}

export default { can, cerberom, signin, signup };
