import express from 'express';

import { error } from "../error.js";
import wikji from "../services/wikji.js";

// TODO: add authenticator
const router = express.Router();

//router.use(routes.sphereExtractor);

// labels=Mozart&labels=Autriche&labels=Europe central&labels=France&labels=Football&labels=PSG&labels=Neymar
router.get("/.wikji", (req, res) => {
  const labels = req.query.labels;
  wikji.wikjid(labels)
    .then((result: any) => {
      res.send(result);
    })
    .catch((err: any) => error(err, res, req.query));
});

export {
  router
};
