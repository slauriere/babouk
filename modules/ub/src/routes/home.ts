import express from 'express';

import { getBoka } from "../utils.js";
import { error } from "../error.js";

const router = express.Router();

router.get("/", (req, res) => {
  // TODO: add response headers (cache, last-modified, etc. to all places where we send bokag)
  // TODO: retrieve home identifier from settings
  getBoka(req.sphere)
    .then(boka => {
      res.send(boka);
    })
    .catch((err: Error) => error(err, res, req.query));
})


export {
  router
};
