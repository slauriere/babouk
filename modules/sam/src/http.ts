import axios from 'axios';

// This is to abstract from axios

const http = axios.create({
  baseURL: "/"
});

// const auth = (configuration: any) => {
//   let authorizationHeader = {};
//   const token = sessionStorage.getItem("kinui");
//   // TODO: should this be != null or != undefined or something else?
//   if (token) {
//     authorizationHeader = { authorization: "bearer " + token };
//   }
//   configuration.headers = Object.assign({}, authorizationHeader, configuration.headers);
//   return configuration;
// };

// http.interceptors.request.use(auth);

// TODO: possibly add a logger interceptor for debugging purpose

export { http };
