# Backend

Backend api code is in app.js file. Which is the main entry point for api's. Then there are other helper file like fo_lib.js, live_lib.js and nse_lib.js. 

## Localhost

nodemon.json file is used to auto restart local development server.

## Frontend code

Frontend html, css and javascript code is in public folder. For each requirement we have individual file like index.html, multi.html and entry.html Frontend will call app.js api's 

## Server
EC2 machine is used to deploy & run this code. Both backend and frontend code will run on same server. Just like this code base. Deployment is done using github ACTIONS, which will copy code to EC2 machine using SSH. EC2 machine is running PM2 package. Which will monitor the code change and restart the server, everytime code is copied from github ACTIONS.

DON'T change any development configuration files.

## URLS
You can access the express node.js server like this

http://ec2-13-234-148-74.ap-south-1.compute.amazonaws.com/offline/NIFTY/DATA/5/start/0/basket/C101/gap/3

http://ec2-13-234-148-74.ap-south-1.compute.amazonaws.com/offline/NIFTY/DATA/5/start/0

Public frontend code can be accessed like this

http://ec2-13-234-148-74.ap-south-1.compute.amazonaws.com/entry.html


.....................

## Option Analysis

I have mentioned below the conditions, I have implemented in analysis of call options on the webpage. 

Here, I am checking the price change and OI change and figuring out what is happening in the market. 

| Price Change | OI Change | Option Analysis | TREND |
|--|--|--|--|
| Positive | Positive | Long Buildup | BULLISH |
| Negative | Positive | Short Buildup | BEARISH |
| Positive | Negative | Short Covering | BULLISH |
| Negative | Negative | Long Liquidation | BEARISH |

Below table can give action plan for particular trend.

| NIFTY TREND | CALL Option | PUT Option |
|--|--|--|
| BULLISH | BUY | SELL |
| BEARISH | SELL | BUY |


## Page Screenshot

![alt text](https://raw.githubusercontent.com/aadityatamrakar/option_chain_analysis/master/screencapture-niftychain-herokuapp-2019-11-18-21_44_16.png)
