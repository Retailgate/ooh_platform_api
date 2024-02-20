import * as crypto from 'crypto';
import * as config from '../config/config';

const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = config.env.CRYPTO_KEY;
const iv = config.env.IV;

export const EncryptUtils = {

//Encrypting text
async encrypt(text:any) {
  var response = new Promise(async (resolve, reject)=>{
    try{
        let cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        resolve({encryptedData: encrypted.toString('hex')});
        //resolve({ iv: iv, encryptedData: encrypted.toString('hex') });
        //resolve({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') });
    } catch(err){
        reject(err);
    }
  
  });
  return response;
  
},
  
//Decrypting text
async decrypt(text:any) {
  var response = new Promise(async (resolve, reject)=>{
    try{
      let iv = Buffer.from(text.iv, 'hex');
      let encryptedText = Buffer.from(text.encryptedData, 'hex');
      let decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      resolve(decrypted.toString())
      //resolve({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') });
    } catch(err){
        reject(err);
    }  
  });
  return response;
    
}

}