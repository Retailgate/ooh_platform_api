# Installation

### 1. Clone this repository
```
git clone https://github.com/Retailgate/ooh_platform_api.git
```
### 2. Inside the directory of the cloned repository, install required npm packages
```
npm install
```
### 3. Create a tmux session
```
tmux new -s ooh
```
> Install tmux if not yet installed (For Ubuntu)
> ```
> sudo apt install tmux -y
> ```
### 4. Run the program
```
sudo npx ts-node app.ts
```  
  
> Note:
>   
> If exiting the Linux instance via the terminal, you need to do it outside the tmux session so that the tmux session and the program shall persist even if you close the terminal session.
>
> Exit the tmux session by pressing the keys
> ```
> Ctrl + b then d
> ```
>
> Here is the reference for using tmux:
> https://hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/

PORT=20601
HOST=placeholder
DB_USER=placeholder
PASSWORD=placeholder
DATABASE=placeholder
SLACK_TOKEN=placeholder
TOKEN_SECRET=placeholder
PG_HOST=ooh-platform.cgy3xpod6h10.ap-southeast-1.rds.amazonaws.com
PG_DB_USER=ooh_rti
PG_PASSWORD=0^^N!pot3ncE
PG_DATABASE=ooh_platform
MAILER_API_KEY=mlsn.7682cf6e528da39e7fab409382b0070e549a58b83da25d56ae7b18d275376ba1
EMAIL_SENDER=booking@greetingsph.com
EMAIL=retailgate.chatmaster@gmail.com
EMAIL_PASS=mcaixllrdzaxrrqy
CRYPTO_KEY=79uchamdp0kruwxtz7mz32zp0qjhqiys
IV=65794a68624763694f694a49557a4931
QNE_DB_HOST=202.57.44.70\qnebss
QNE_DATABASE=UTASI_LIVEDB
QNE_PORT=20306
QNE_DB_USER=utasi
QNE_DB_PASSWORD=password
QNE_DATABASE_URL=qnebss
QNE_DB_DIALECT=mariadb
QNE_DB_OPERATORS_ALIASES=0
QNE_DB_POOL_MAX=5
QNE_DB_POOL_MIN=0
QNE_DB_POOL_ACQUIRE=30000
QNE_DB_POOL_IDLE=10000
QNE_DB_PORT=10010