const express = require('express');

// var jsonexport = require('jsonexport');

const circularJSON = require('circular-json');
const fs = require('fs');
const nse = require('./nse_lib');
const fo = require('./fo_lib');
const live = require('./live_lib');
const exp = require('constants');
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.json());
nse.loadCookies();

app.get('/', (req, res) => res.redirect('/index.html'));
app.get('/visuals', (req, res) => res.redirect('/visuals.html'));
app.get('/temp', (req, res) => res.redirect('/temp.html'));
app.get('/multi', (req, res) => res.redirect('/multi.html'));
app.get('/oca', (req, res) => res.redirect('/oca.html'));
app.get('/entry', (req, res) => res.redirect('/entry.html'));
app.get('/api', (req, res) => res.redirect('/api.html'));
app.get('/oichange', (req, res) => res.redirect('/oi-oichange-option-chain.html'));
app.get('/volume_chain', (req, res) => res.redirect('/volume-option-chain.html'));



app.get('/chain', async (req, res) => {
  try {
    let resp = await nse.getOptionChain('NIFTY'); // can enter NIFTY / BANKNIFTY
    res.send(resp);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.get('/chain/:instrument', async (req, res) => {
  try {
    let instrument = req.params.instrument;
    let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
    //let merRes = fo.mergeObjects(resp.records.data);
    res.send(resp);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Mutliple strike prices recieved from NSE with current spot/underlying price
// Result will be shown in CE/PE object, which again comes with NSE. We are adding greeks to the respective object
// Expiry date and instrument(indexes) will be selected in multi.html page

app.get('/multiapi', async (req, res) => {
  try {
    let liveData = [];
    liveData['NIFTY'] = await nse.getOptionChain('NIFTY'); // can enter NIFTY / BANKNIFTY
    liveData['BANKNIFTY'] = await nse.getOptionChain('BANKNIFTY');
    let liveSingleArray = [];
    // let { expiry, instrument } = req.params;
    let entryJson = JSON.parse(fs.readFileSync(`public/data/multi.json`, 'utf8'));

    let response = {
      NIFTY: [],
      BANKNIFTY: [],
    };



    for (const data of entryJson.data) {
      let res = await fo.getMulti(liveData[data.indexes], data.expiryDate);
      liveSingleArray = [...liveSingleArray, ...res];
      response[data.indexes] = [...response[data.indexes], ...res];

    }

    res.send(liveSingleArray);

  } catch (err) {
    res.status(500).send(err.message);
  }
});



// Whatever strikeprice with Call/Put option with whatever we Buy/Selling will be compared against -loop+ from current spot price
// Result will be shown in CPE in Data object
// Compare will compare each -loop+ rows with among all the selected strike price from entry.html
// app.get('/offline/:instrument/:type/:loop/start/:start/basket/:basket/gap/:gap', async (req, res) => {
app.get('/offline/:instrument/:type/:loop/start/:start/basket/:basket/gap/:gap', async (req, res) => {


  try {
    let { instrument, start, type, loop, basket, gap } = req.params;
    start = start == 0 ? fo.getTodaysDate() : start;
    let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
    console.log('req.params' , req.params)

    let filteredData = [];
    resp.records.expiryDates.forEach((expiry) => {
      resp.records.data.forEach((data) => {
        if (data.expiryDate == expiry) {
          filteredData.push(data);
          // console.log(filteredData);
        }
      });
    });


    let merRes = fo.mergeObjects(filteredData);
    let entryJson = JSON.parse(fs.readFileSync(`public/data/entry.json`, 'utf8'));

    //Filter for baskets
    if (basket !== 'ALL')
      // console.log('entryJson.data',entryJson.data)
      entryJson.data = fo.findObject(entryJson.data, {
        basketid: basket,
      });
      // console.log('s',entryJson.data)
    //Only for selected entry strike price, expiry and indexes find out greeks
    //These will be strike prices from entry.json
    let FOGreeks = [];
    merRes.forEach((obj) => {
      // console.log('entryJson.data' , entryJson.data)
      // Find saved entry prices (expiryDate and strikePrice) from list of NSE list of objects
      let savedEntryPrices = fo.findObject(entryJson.data, {
        expiry: obj.expiryDate,
        indexes: instrument,
        strike: obj.strikePrice,
      });

      // then use saved expirtyDate, strike price and other info's with NSE object like spot price, IV

      if(savedEntryPrices)
      savedEntryPrices.forEach((savedEntryPrice) => {
        //savedEntryPrice.callput = savedEntryPrice.callput == 'Call' ? 'CE' : 'PE';
        // this will be fetched from live value
        let spot = obj.CE ? obj.CE.underlyingValue : obj.PE.underlyingValue;
        let reqObj = {
          params: {
            spot,
            strike: obj.strikePrice,
            instrument,
            expiry: obj.expiryDate,
            start,
            entry: undefined,
            lotsize: instrument == 'NIFTY' ? 50 : 25,
            numlots: undefined,
            loop: Number(loop),
            entryJson: savedEntryPrice,
            gap: Number(gap),
          },
        };
        let rows = fo.greekCalc(reqObj, [obj]);
        FOGreeks.push({
          strikePrice: obj.strikePrice,
          expiryDate: obj.expiryDate,
          startDate: start,
          callput: savedEntryPrice.callput,
          spot: spot,
          strike: `${obj.strikePrice} ${savedEntryPrice.callput}`,
          basket,
          rows,
        });
      });

    });

    // console.log('FOGreeks' , FOGreeks)

    let compare = fo.addCompare(FOGreeks, loop);

    if (type == 'DATA') {
      res.send(FOGreeks);
    } else if (type == 'COMPARE') {
      res.send(compare);
    } else {
      res.send({ data: FOGreeks, compare });
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/multi', async (req, res) => {
  try {
    let json = JSON.stringify(req.body);
    fs.writeFile(`public/data/multi.json`, json, 'utf8', () => {
      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/multi', async (req, res) => {
  try {
    let json;
    fs.readFile(`public/data/multi.json`, 'utf8', (err, data) => {
      if (err) {
        json = err;
      } else {
        if (data) {
          json = JSON.parse(data);
        } else {
          json = { data: [] };
        }
      }

      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/store', async (req, res) => {
  try {
    let json = JSON.stringify(req.body);
    fs.writeFile(`public/data/entry.json`, json, 'utf8', () => {
      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/store/entry', async (req, res) => {
  try {
    let json;
    fs.readFile(`public/data/entry.json`, 'utf8', (err, data) => {
      if (err) {
        json = err;
      } else {
        if (data) {
          json = JSON.parse(data);
        } else {
          json = { data: [] };
        }
      }

      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/live/connect', async (req, res) => {
  try {
    const socket = await live.main();
    let socketData = circularJSON.stringify(socket);
    fs.writeFile(`public/data/socket.json`, socketData, 'utf8', () => {
      res.send(`Websocket connection is Open`);
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/live/open/:tickdata', async (req, res) => {
  try {
    let { tickdata } = req.params;
    const socketMain = await live.main();
    fs.readFile(`public/data/socket.json`, 'utf8', async (err, resData) => {
      if (err) {
        res.status(400).send(err);
      } else {
        if (resData) {
          try {
            let socket = JSON.parse(resData);
            result = await live.readTicket(socketMain, tickdata);
            res.send(result);
          } catch (err) {
            res.status(500).send(err.message);
          }
        } else {
          res.status(400).send('No socket found');
        }
      }
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/live/:instrument/:type/:loop/start/:start/basket/:basket/gap/:gap', async (req, res) => {
  try {
    let { instrument, start, type, loop } = req.params;
    start = start == 0 ? fo.getTodaysDate() : start;

    const socketMain = await live.main();

    let liveIndices = [];
    let liveNifty = await live.readTicket(socketMain, `NSE_INDICES_NIFTY.json`);
    liveIndices['NIFTY'] = JSON.parse(liveNifty);

    liveIndices['FINNIFTY'] = await live.readTicket(socketMain, `NSE_INDICES_BANKNIFTY.json`);
    liveIndices['FINNIFTY'] = JSON.parse(liveIndices['FINNIFTY']);
    //bankIndicesData = {"UniqueName":"NSE_INDICES_NIFTY_BANK","Symbol":"BANKNIFTY","Ticker":"BANKNIFTY","Contract":null,"Exchange":"NSE","InstrumentType":"INDICES","ExpiryString":"","StrikePriceString":"0","StrikePrice":0.0,"OptionType":"XX","LastTradedTime":"2023-02-14T15:28:34","LTD":20230214,"LTT":152834,"BBP":0.0,"BBQ":0,"BSP":0.0,"BSQ":0,"LTP":41622.4,"Open":41636.2,"High":41643.45,"Low":41622.4,"Vol":0,"PrevVol":0,"DayOpen":41410.45,"DayHighest":41718.0,"DayLowest":41195.75,"PrevClose":41282.2,"TTQ":0,"OI":0,"PrevOI":0,"ATP":0.0,"TTV":0.0,"IV":0}

    //indicesData = '{"UniqueName":"NSE_INDICES_NIFTY_50","Symbol":"NIFTY","Ticker":"NIFTY","Contract":null,"Exchange":"NSE","InstrumentType":"INDICES","ExpiryString":"","StrikePriceString":"0","StrikePrice":0.0,"OptionType":"XX","LastTradedTime":"2023-02-14T14:40:14","LTD":20230214,"LTT":144014,"BBP":0.0,"BBQ":0,"BSP":0.0,"BSQ":0,"LTP":17944.7,"Open":17942.35,"High":17944.7,"Low":17942.1,"Vol":0,"PrevVol":0,"DayOpen":17840.35,"DayHighest":17954.55,"DayLowest":17800.05,"PrevClose":17770.9,"TTQ":0,"OI":0,"PrevOI":0,"ATP":0.0,"TTV":0.0,"IV":0}';
    let entryJson = JSON.parse(fs.readFileSync(`public/data/entry.json`, 'utf8'));

    //Filter for baskets
    if (basket !== 'ALL')
      entryJson.data = fo.findObject(entryJson.data, {
        basketid: basket,
      });

    //Only for selected entry strike price, expiry and indexes find out greeks
    //These will be strike prices from entry.json
    let FOGreeks = [];

    // then use saved expirtyDate, strike price and other info's with NSE object like spot price, IV
    for (const savedEntryPrice of entryJson.data) {
      let expiryFormat = savedEntryPrice.expiry.split('-').join('').toUpperCase();
      let instuFormat = savedEntryPrice.indexes == 'BANKNIFTY' ? 'FINNIFTY' : savedEntryPrice.indexes;
      //savedEntryPrice.callput = savedEntryPrice.callput == 'Call' ? 'CE' : 'PE';
      let liveData = await live.readTicket(
        socketMain,
        `NSE_OPTIDX_${instuFormat}_${expiryFormat}_${savedEntryPrice.strike}_${savedEntryPrice.callput}.json`
      );

      // liveData = {"UniqueName":"NSE_OPTIDX_NIFTY_16FEB2023_18100_PE","Symbol":"NIFTY","Ticker":"NIFTY_18100PE-16FEB2023",
      // "Contract":"-16FEB2023","Exchange":"NSE","InstrumentType":"OPTIDX","ExpiryString":"16FEB2023","StrikePriceString":"18100",
      // "StrikePrice":18100.0,"OptionType":"PE","LastTradedTime":"2023-02-14T14:40:14","LTD":20230214,"LTT":144014,"BBP":175.35,
      // "BBQ":50,"BSP":175.5,"BSQ":50,"LTP":175.45,"Open":176.2,"High":176.3,"Low":175.45,"Vol":1050,"PrevVol":37629,"DayOpen":284.15,
      // "DayHighest":307.05,"DayLowest":168.65,"PrevClose":321.95,"TTQ":4581900,"OI":530200,"PrevOI":11387500,"ATP":215.22,"TTV":985957868.0,"IV":15.58}

      liveData = JSON.parse(liveData);
      let liveDataArray;
      // read file and make object
      liveDataArray = JSON.parse(fs.readFileSync('public/data/live.json', 'utf8'));
      liveDataArray.data.push(liveData);
      //write file
      fs.writeFileSync('public/data/live.json', JSON.stringify(liveDataArray));

      //this obj is basically how we receieve it from NSE but it here we need to manual create it
      let obj = {
        strikePrice: savedEntryPrice.strike,
        expiryDate: savedEntryPrice.expiry,
      };
      obj[liveData.OptionType] = {
        underlyingValue: liveIndices[instuFormat].LTP,
        impliedVolatility: liveData.IV,
        vol: liveData.Vol,
        oi: liveData.OI,
      };
      // obj[liveData.OptionType]['underlyingValue'] = indicesData.LTP;
      // obj[liveData.OptionType]['impliedVolatility'] = liveData.IV;

      // this will be fetched from live value
      let spot = obj.CE ? obj.CE.underlyingValue : obj.PE.underlyingValue;
      let reqObj = {
        params: {
          spot,
          strike: obj.strikePrice,
          instrument,
          expiry: obj.expiryDate,
          start,
          entry: undefined,
          lotsize: instrument == 'NIFTY' ? 50 : 25,
          numlots: undefined,
          loop: Number(loop),
          entryJson: savedEntryPrice,
          gap: Number(gap),
        },
      };
      let rows = fo.greekCalc(reqObj, [obj]);
      FOGreeks.push({
        strikePrice: obj.strikePrice,
        expiryDate: obj.expiryDate,
        startDate: start,
        callput: savedEntryPrice.callput,
        spot: spot,
        strike: `${obj.strikePrice} ${savedEntryPrice.callput}`,
        rows,
      });
    }

    let compare = fo.addCompare(FOGreeks, loop);

    if (type == 'DATA') {
      let GreekDataArray;
      // read file and make object
      GreekDataArray = JSON.parse(fs.readFileSync('public/data/data.json', 'utf8'));
      GreekDataArray.data.push(FOGreeks);
      //write file
      fs.writeFileSync('public/data/data.json', JSON.stringify(GreekDataArray));
      res.send(FOGreeks);
    } else if (type == 'COMPARE') {
      let compareDataArray;
      // read file and make object
      compareDataArray = JSON.parse(fs.readFileSync('public/data/compare.json', 'utf8'));
      compareDataArray.data.push(compare);
      //write file
      fs.writeFileSync('public/data/compare.json', JSON.stringify(compareDataArray));
      res.send(compare);
    } else {
      res.send({ data: FOGreeks, compare });
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(port, () => console.log(`App listening on port ${port}!`));