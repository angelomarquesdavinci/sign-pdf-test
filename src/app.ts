import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { TLSSocket } from "tls";

const fs = require("fs");
const app = express();
const https = require("https");
const PORT = process.env.PORT || 3002;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const opts = {
  key: fs.readFileSync("server_key.pem"),
  cert: fs.readFileSync("server_cert.pem"),
  requestCert: true,
  rejectUnauthorized: false,
};

app.get("/", (req: Request, res: Response) => {
  //   if (!(req.socket as TLSSocket).authorized) {
  //     // If not, respond with 403 and set a custom header to indicate that client certificate is required
  //     // res.set("SSL-Require-Cert", "true");
  //     res.status(403).send("Unauthorized: Client certificate required.");
  //     return;
  //   }

  const cert = (req.socket as TLSSocket).cer();

  //   console.log(cert);
  res.send("Hello TypeScript Express!");
});

app.get("/secure", (req: Request, res: Response) => {
  //   if (!(req.socket as TLSSocket).authorized) {
  //     // If not, respond with 403 and set a custom header to indicate that client certificate is required
  //     // res.set("SSL-Require-Cert", "true");
  //     res.status(403).send("Unauthorized: Client certificate required.");
  //     return;
  //   }

  const cert = (req.socket as TLSSocket).getPeerCertificate();

  console.log(cert);
  res.send("Hello TypeScript Express secure!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

https.createServer(opts, app).listen(9999);
