/*'use strict'

import * as config from '../config/config';


const mysql = require('mysql');

var db_config = {
  host: config.env.HOST,
  user: config.env.DB_USER,
  password: config.env.PASSWORD,
  database: config.env.DATABASE
};

var db:any;

function handleDisconnect(){
  db = mysql.createConnection(db_config);
  db.connect(function(err:any){
    if(err){
      console.log('error when connecting to db:', err);
      
        setTimeout(handleDisconnect, 2000);
      }
  });
  //module.exports = connection;
  db.on('error', function(err:any){
    console.log('db error', err);

    if(err.code === 'PROTOCOL_CONNECTION_LOST'){
      handleDisconnect();
    } else{
      handleDisconnect();
    }
  });
}
handleDisconnect();

export class DB{
  constructor(){
  }

  static query(sql:any ){
    return new Promise((resolve,reject)=>{
      //handleDisconnect()
      db.query(sql, (err:any, result:any) => {
        resolve(result);
      })

    })
  }
}
*/