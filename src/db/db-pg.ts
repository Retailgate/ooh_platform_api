'use strict'

import * as config from '../config/config';
const pg_format = require('pg-format')
const { Client } = require('pg')

const client = new Client({
  host: config.env.PG_HOST,
  port: 5432,
  database: config.env.PG_DATABASE,
  user: config.env.PG_DB_USER,
  password: config.env.PG_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
})

function handleDisconnect(){

  client
  .connect()
  .then(() => console.log('connected'))
  .catch((err:any) => console.error('connection error', err.stack))

  client.on('error', (err:any) => {
    console.error('something bad has happened!', err.stack)
    handleDisconnect();
  })

}

handleDisconnect();

export class DBPG{
  constructor(){
  }

  static query(sql:any, params:any){
    return new Promise((resolve,reject)=>{
      //handleDisconnect()
      //db.query(sql, (err:any, result:any) => {
      //  resolve(result);
      //})  
      /* SQL format
       * {
       *   text: 'INSERT INTO TABLE(col1, col2) VALUES($1, $2)',
       *   values: [val1, val2]
       * }
      */
      //let query = pg_format(sql, params);

      client.query(sql, params, (err:any, res:any) => {
        //console.log(err ? err.stack : res.rows[0].message) // Hello World!
        if(err){
          console.log(err);
        } else{
          resolve(res.rows);
        }
        //client.end()
      })
  
    })
  }
  
  static multiInsert(sql:any, params:any){
    //let users = [['test@example.com', 'Fred'], ['test2@example.com', 'Lynda']];
    //let query1 = pg_format('INSERT INTO users (email, name) VALUES %L returning id', users);
    let query = pg_format(sql, params);  
    return new Promise((resolve,reject)=>{  
        client.query(query , (err:any, res:any) => {
          //console.log(err ? err.stack : res.rows[0].message) // Hello World!
          if(err){
            console.log(err);
          } else{
            resolve(res.rows);
          }
        })  
    })  
  }  

  static multiQuery(queries:any){
    var promArr = queries.map(function(item:any){
      return new Promise((resolve, reject) => {
        //console.log(item)
        client.query({
          text: item.text,
          values: item.values
        }, (err:any, res:any) => {
          //console.log(err ? err.stack : res.rows[0].message) // Hello World!
          if(err){
            console.log(err);
          } else{
            resolve({id: item.id, result: res.rows});
          }
          //client.end()
        })
      })
    })
    var final:any = Promise.all(promArr).then((values:any) => {
      var obj:any = {};
      for(let n in values){
        obj[values[n].id] = values[n].result
      }
      return(obj);
    });
    return final;
  }
}