import express from 'express';

import { error } from "../error.js";
import saa from "../services/saa.js";

const router = express.Router();

// router.use(routes.sphereExtractor);
// router.use(cerberos.cerberom);

// Annotate with found named entities
router.get("/.ner", (req, res) => {
  const input = req.query.text as string;
  let entityParam = req.query.entities as string;
  const saaPath = req.query.saa as string;
  if (input !== undefined && entityParam !== undefined && saaPath !== undefined) {
    const entities = entityParam.split("\n").map(item => item.trim()); // this is to remove "\r" if any, and to trim entries
    saa.annotate(input, entities, saaPath)
      .then((annotations: any) => res.send(annotations))
      .catch((err: Error) => error(err, res, req.query));
  } else {
    error("NER: invalid arguments", res, req.query);
  }
});

export {
  router
};

