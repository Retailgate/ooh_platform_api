import * as config from './src/config/config';
import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import cluster from 'cluster';
import { UserRoute } from './src/routes/user.route';
import { DashboardRoute } from './src/routes/dashboard.route';

const numCPUs = require('os').cpus().length;
const app = express();

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

  app.listen(config.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${config.env.PORT}`);
  })

}
