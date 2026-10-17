Prints check to PDF.  
Keeps log in SQLite.  

## Deploying

On the server, run `./deploy.sh`. It pulls `main`, installs dependencies and restarts the pm2 process `checks`
(the server code is only loaded at startup, so a restart is needed after every pull).
