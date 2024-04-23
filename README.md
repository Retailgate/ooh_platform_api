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
