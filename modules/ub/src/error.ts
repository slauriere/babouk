export const error = (err:any, res:any, object?:any) => {
  console.log(err, err.status);
  //let error = err.code ? errno.code[err.code].description : err;
  const status = err.status ? err.status : 400;
  const message = err.message ? err.message : err.toString();
  res.status(status).send({
    err: message,
    object: object
  });
};
