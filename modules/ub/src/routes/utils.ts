import express, { NextFunction, Request, Response } from 'express';

import { Reference, resolve, Type } from "@babouk/model";
import { sys } from "../utils.js";

//const jsonBodyParser = bodyParser.json({ limit: "5mb", type: "application/json" });
const jsonParser = express.json({ limit: "1mb" });

const getSphereReference = (req: Request): Reference => {
  // TODO: don't crash the server
  if (req.hostname === undefined) throw new Error("No host found in request, aborting.")
  //const index = host.indexOf(".");
  //if (index > 0) {
  //return resolve(host, undefined, Type.SPHERE);
  //} else {
  return resolve(req.hostname, undefined, Type.SPHERE);
  //}
}

const withLanguage = (uri: string): string[] => {
  let array = uri.split(":");
  if (array.length === 1)
    array.push("default");
  return array;
}

const getPageReference = (req: Request): Reference => {
  const pageRef = withLanguage(req.params.uri);
  // req.sphere can be undefined when getPageReference is called from multer for storing files
  let reference = resolve(pageRef[0], req.sphere !== undefined ? req.sphere : getSphereReference(req), Type.PAGE, pageRef[1]);
  const segments = req.path.split("/");
  if (segments[1] === sys.iiakhawunti) {
    const parent = resolve(sys.iiakhawunti, req.sphere, Type.SERVICE);
    reference = resolve(pageRef[0], parent, Type.PAGE, pageRef[1]);
  }
  return reference;
}

// Express middleware for extracting the sphere reference
const sphereExtractor = (req: Request, res: Response, next: NextFunction) => {
  req.sphere = getSphereReference(req);
  next()
}

const isBot = (req: Request): boolean => {
  const agent = req.headers["user-agent"];
  console.log("agent", agent);
  if (agent === undefined) return false;
  return agent.startsWith("facebookexternalhit") || agent.indexOf("bot") >= 0;
}

// TODO: see if we can use a middleware for specific routes which sends json or html depending on the 'accept' header in the request
const wantsHtml = (req: Request, res: Response): boolean => {
  const accept = req.headers.accept;
  // TODO: can probably be written with optional chaining: accept?.indexOf(...)
  const wantsHtml = accept != undefined && (accept.indexOf("text/html") >= 0 || accept.indexOf("application/xhtml+xml") >= 0);
  // set headers to prevent browsers to load JSON instead of HTML when duplicating a tab or when reusing a tab which has been left inactive for a while
  res.vary("content-type");
  res.header("cache-control", "no-store");
  return wantsHtml;
}

export default {
  sphereExtractor, wantsHtml, isBot, getPageReference
};
