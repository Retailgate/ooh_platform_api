import * as config from './src/config/config';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import cluster from 'cluster';
import { UserRoute } from './src/routes/user.route';
import { DashboardRoute } from './src/routes/dashboard.route';
import * as fs from 'fs';
import * as https from 'https';

const numCPUs = require('os').cpus().length;
const app = express();

/*const privateKey = fs.readFileSync('/etc/letsencrypt/live/oohplatformapi.retailgate.tech/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/oohplatformapi.retailgate.tech/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/oohplatformapi.retailgate.tech/chain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};*/

if(cluster.isMaster){
  //console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++){
    cluster.fork();
  }

  cluster.on('online', function(worker){
    //console.log('Worker ' + worker.process.pid + ' is online');
  });
  cluster.on('exit', (worker, code, signal) =>{
    //console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });
}else{
  app.use(cors({origin: '*'}));
  app.use(express.text());
  app.use(express.json());
  app.use(bodyParser.json({limit: '50mb'}));
  app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
  app.use( '/user', UserRoute);
  app.use( '/dashboard', DashboardRoute);

  app.get('/', (req, res) => {
    res.send('WiFi Beacon Dashboard APIs.');
  })

  /*const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(config.env.PORT, () => {
    console.log(`App listening at http://localhost:${config.env.PORT}`)
  })*/

  app.listen(config.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${config.env.PORT}`);
  })

}
