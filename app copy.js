const express = require('express');
const fs = require('fs');
const nse = require('./nse_lib');
const fo = require('./fo_lib');
const { networkInterfaces } = require('os');
const exp = require('constants');
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static('public'));
app.use(express.json());
nse.loadCookies();
app.get('/', (req, res) => res.redirect('/index.html'));
app.get('/multi', (req, res) => res.redirect('/multi.html'));
app.get('/chain', async (req, res) => {
  try {
    let resp = await nse.getOptionChain('NIFTY'); // can enter NIFTY / BANKNIFTY
    res.send(resp);
  } catch (err) {
    res.status(500).send(err);
  }
});
app.get('/chain/:instrument', async (req, res) => {
  try {
    let instrument = req.params.instrument;
    let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
    //let merRes = fo.mergeObjects(resp.records.data);
    res.send(resp);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/multiapi', async (req, res) => {
  try {
    let liveData = [];
    liveData['NIFTY'] = await nse.getOptionChain('NIFTY'); // can enter NIFTY / BANKNIFTY
    liveData['BANKNIFTY'] = await nse.getOptionChain('BANKNIFTY');
    let liveSingleArray = [];
    // let { expiry, instrument } = req.params;
    let entryJson = JSON.parse(fs.readFileSync(`public/data/multi.json`, 'utf8'));
    let response = {
      'NIFTY': [],
      'BANKNIFTY': []
    }
    for (const data of entryJson.data) {
      let res = await fo.getMulti(liveData[data.indexes], data.expiryDate);
      liveSingleArray = [...liveSingleArray, ...res];
      response[data.indexes] = [...response[data.indexes], ...res];
    };
    
    res.send(liveSingleArray);
  } catch (err) {
    res.status(500).send(err);
  }
});

// app.get(
//   '/chain/:instrument/spot/:spot/strike/:strike/expiry/:expiry/start/:start/entry/:entry/lotsize/:lotsize/numlots/:numlots',
//   //nifty - 50, banknifty 25
//   //strike -
//   async (req, res) => {
//     try {
//       let { strike, instrument, expiry, start } = req.params;
//       start = start == 0 ? fo.getTodaysDate() : start;
//       let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
//       let filteredData = [];
//       resp.records.data.forEach((data) => {
//         if (data.expiryDate == expiry) {
//           filteredData.push(data);
//         }
//       });
//       let merRes = fo.mergeObjects(filteredData);

//       let strikeObj = merRes.filter((obj) => obj['strikePrice'] === Number(strike));
//       let FOGreeks = fo.greekCalc(req, strikeObj);
//       res.send(FOGreeks);
//     } catch (err) {
//       res.status(500).send(err);
//     }
//   }
// );

app.get('/offline/:instrument/:type/:loop/start/:start', async (req, res) => {
  try {
    let { instrument, start, type, loop } = req.params;
    start = start == 0 ? fo.getTodaysDate() : start;
    let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
    let filteredData = [];
    resp.records.expiryDates.forEach((expiry) => {
      resp.records.data.forEach((data) => {
        if (data.expiryDate == expiry) {
          filteredData.push(data);
        }
      });
    });

    let merRes = fo.mergeObjects(filteredData);
    let entryJson = JSON.parse(fs.readFileSync(`public/data/entry.json`, 'utf8'));

    let FOGreeks = [];
    merRes.forEach((obj) => {
      let savedEntryPrices = fo.findObject(entryJson.data, {
        expiry: obj.expiryDate,
        indexes: instrument,
        strike: obj.strikePrice,
      });

      savedEntryPrices?.forEach((savedEntryPrice) => {
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
          },
        };
        let rows = fo.greekCalc(reqObj, [obj]);
        FOGreeks.push({
          strikePrice: obj.strikePrice,
          expiryDate: obj.expiryDate,
          startDate: start,
          callput: savedEntryPrice.callput,
          spot: spot,
          rows,
        });
      });
    });

    let compare = [];

    for (let compRowIndex = 0; compRowIndex < Number(loop) * 2; compRowIndex++) {
      let compareRow = {};

      for (let compIndex = 0; compIndex < FOGreeks.length; compIndex++) {
        if (compIndex == 0) {
          compareRow.underlyingValue = FOGreeks[compIndex].rows[compRowIndex].CPE.underlyingValue;
        }
        let callputLabel = `${FOGreeks[compIndex].callput}_${compIndex + 1}`;
        compareRow[`${callputLabel}-points`] = FOGreeks[compIndex].rows[compRowIndex].CPE.points;
        compareRow[`${callputLabel}-PL`] = FOGreeks[compIndex].rows[compRowIndex].CPE.PL;
        compareRow[`${callputLabel}-iv`] = FOGreeks[compIndex].rows[compRowIndex].CPE.iv;
        compareRow[`${callputLabel}-timeValue`] = FOGreeks[compIndex].rows[compRowIndex].CPE.timeValue;
        compareRow[`${callputLabel}-premium`] = FOGreeks[compIndex].rows[compRowIndex].CPE.premium;
        //compareRow[`${callputLabel}-underlying`] = FOGreeks[compIndex].rows[compRowIndex].CPE.underlying;
        //compareRow[`${callputLabel}-option`] = FOGreeks[compIndex].rows[compRowIndex].CPE.option;
      }

      let totalPoints = 0;
      let totalPL = 0;
      let totaliv = 0;
      let totaltimeValue = 0;
      for (const key in compareRow) {
        if (compareRow.hasOwnProperty(key)) {
          if (key.includes('-points')) {
            totalPoints = totalPoints + compareRow[key];
          }
          if (key.includes('-PL')) {
            totalPL = totalPL + compareRow[key];
          }

          if (key.includes('-iv')) {
            totaliv = totaliv + compareRow[key];
          }
          if (key.includes('-timeValue')) {
            totaltimeValue = totaltimeValue + compareRow[key];
          }
        }
      }

      compareRow.NetPoints = totalPoints;
      compareRow.NetPL = totalPL;
      compareRow.NetIV = totaliv;
      compareRow.NetTimeValue = Number(totaltimeValue.toFixed(4));

      compare.push(compareRow);
    }

    if (type == 'DATA') {
      res.send(FOGreeks);
    } else if (type == 'COMPARE') {
      res.send(compare);
    } else {
      res.send({ data: FOGreeks, compare });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/store', async (req, res) => {
  try {
    let json = JSON.stringify(req.body);
    fs.writeFile(`public/data/entry.json`, json, 'utf8', () => {
      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/multi', async (req, res) => {
  try {
    let json = JSON.stringify(req.body);
    fs.writeFile(`public/data/multi.json`, json, 'utf8', () => {
      res.send(json);
    });
  } catch (err) {
    res.status(500).send(err);
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
    res.status(500).send(err);
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
    res.status(500).send(err);
  }
});

// app.get("/info/:instrument", async (req, res) => {
//     try {
//         let instrument = req.params.instrument;
//         let resp = await nse.getOptionChain(instrument); // can enter NIFTY / BANKNIFTY
//         let merRes = fo.mergeObjects(resp.records.data);
//         let strikePrices = [];
//         let mapped = [];
//         merRes.forEach((obj) => {
//             if (!strikePrices.includes(obj.strikePrice)) {
//                 strikePrices.push(obj.strikePrice);
//             }

//             mapped.push({
//                 strikePrice: obj.strikePrice,
//                 expiryDate: obj.expiryDate,
//             });
//         });
//         res.send({
//             expiryDates: resp.records.expiryDates,
//             strikePrices: strikePrices,
//             mapped: mapped,
//         });
//     } catch (err) {
//         res.status(500).send(err);
//     }
// });

app.listen(port, () => console.log(`App listening on port ${port}!`));
