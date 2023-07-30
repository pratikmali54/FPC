const gaussian = require('./gaussian');
const nse = require('./nse_lib');

function deltaTime(data) {
  var date_expiry = new Date(data.expiry),
    date_now = new Date(data.start);

  var seconds = (date_expiry - date_now) / 1000,
    minutes = seconds / 60,
    hours = minutes / 60,
    delta_t = hours / 24 / 365.0;

  return delta_t;
}

function greeksBlackScholesCal(data, type) {
  data = Object.assign({}, data);
  //console.log(data);

  var volt = data.volatility / 100,
    int_rate = data.interest / 100;

  var delta_t = deltaTime(data);

  //var d1 = (Math.log(data.spot / data.strike) + (int_rate + Math.pow(volt, 2) / 2) * delta_t) / (volt * Math.sqrt(delta_t)),
  //  d2 = (Math.log(data.spot / data.strike) + (int_rate - Math.pow(volt, 2) / 2) * delta_t) / (volt * Math.sqrt(delta_t));

  var d1 =
      (Math.log(data.spot / data.strike) + (int_rate + Math.pow(volt, 2) / 2) * delta_t) / (volt * Math.sqrt(delta_t)),
    d2 =
      (Math.log(data.spot / data.strike) + (int_rate - Math.pow(volt, 2) / 2) * delta_t) / (volt * Math.sqrt(delta_t));

  var fv_strike = data.strike * Math.exp(-1 * int_rate * delta_t);

  //For calculating CDF and PDF using gaussian library
  // @ts-ignore
  var distribution = gaussian(0, 1);

  //Premium Price
  var call_premium = data.spot * distribution.cdf(d1) - fv_strike * distribution.cdf(d2),
    put_premium = fv_strike * distribution.cdf(-1 * d2) - data.spot * distribution.cdf(-1 * d1);

  //Option greeks
  var call_delta = distribution.cdf(d1),
    put_delta = call_delta - 1;

  var call_gamma = distribution.pdf(d1) / (data.spot * volt * Math.sqrt(delta_t)),
    put_gamma = call_gamma;

  var call_vega = (data.spot * distribution.pdf(d1) * Math.sqrt(delta_t)) / 100,
    put_vega = call_vega;

  var call_theta =
      ((-1 * data.spot * distribution.pdf(d1) * volt) / (2 * Math.sqrt(delta_t)) -
        int_rate * fv_strike * distribution.cdf(d2)) /
      365,
    put_theta =
      ((-1 * data.spot * distribution.pdf(d1) * volt) / (2 * Math.sqrt(delta_t)) +
        int_rate * fv_strike * distribution.cdf(-1 * d2)) /
      365;

  var call_rho = (fv_strike * delta_t * distribution.cdf(d2)) / 100,
    put_rho = (-1 * fv_strike * delta_t * distribution.cdf(-1 * d2)) / 100;

  let iv = 0;
  if (type == 'CE') {
    iv = getIV({ spot: data.spot, strike: data.strike }, 'CE');
    return {
      fv_strike: Number(fv_strike),
      premium: Number(call_premium.toFixed(2)),
      delta: Number(call_delta.toFixed(4)),
      gamma: isNaN(Number(call_gamma.toFixed(4))) ? 0 : Number(call_gamma.toFixed(4)),
      vega: Number(call_vega.toFixed(4)),
      theta: Number(call_theta.toFixed(4)),
      rho: Number(call_rho.toFixed(4)),
      iv: Number(iv),
      timeValue: getTimeValue({ premium: data.lastPrice, iv }),
    };
  } else {
    iv = getIV({ spot: data.spot, strike: data.strike }, 'PE');
    return {
      fv_strike: Number(fv_strike),
      premium: Number(put_premium.toFixed(2)),
      delta: Number(put_delta.toFixed(4)),
      gamma: isNaN(Number(put_gamma.toFixed(4))) ? 0 : Number(put_gamma.toFixed(4)),
      vega: Number(put_vega.toFixed(4)),
      theta: Number(put_theta.toFixed(4)),
      rho: Number(put_rho.toFixed(4)),
      iv,
      timeValue: getTimeValue({ premium: data.lastPrice, iv }),
    };
  }
}

function getIV(data, type) {
  let iv;
  if (type == 'CE') {
    iv = data.spot - data.strike < 0 ? 0 : data.spot - data.strike;
  } else {
    iv = data.strike - data.spot < 0 ? 0 : data.strike - data.spot;
  }
  return Number(iv.toFixed(2));
}

function getTimeValue(data) {
  return Number((data.premium - data.iv).toFixed(2));
}

function getBuyingSellingOption(data) {
  let selling_points = (data.entry - data.premium.toFixed(2)).toFixed(2);
  let selling_PL = ((data.entry - data.premium.toFixed(2)) * (data.lotsize * data.numlots)).toFixed(2);
  let buying_points = (data.premium.toFixed(2) - data.entry).toFixed(2);
  let buying_PL = ((data.premium.toFixed(2) - data.entry) * (data.lotsize * data.numlots)).toFixed(2);

  if (data.orderType == 'Buy') {
    return {
      points: Number(buying_points),
      PL: Number(buying_PL),
      premiumStatus: 'PAID',
    };
  } else if (data.orderType == 'Sell') {
    return {
      points: Number(selling_points),
      PL: Number(selling_PL),
      premiumStatus: 'RECEIVED',
    };
  } else {
    return {
      selling_points: Number(selling_points),
      selling_PL: Number(selling_PL),
      buying_points: Number(buying_points),
      buying_PL: Number(buying_PL),
    };
  }
}

function convertDateFormat(dateString) {
  const dateParts = dateString.split('-');
  const day = dateParts[0];
  const month = dateParts[1];
  const year = dateParts[2];

  const months = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12',
  };

  return `${year}-${months[month]}-${day}`;
}

const mergeObjects = (arr) => {
  return arr.reduce((acc, obj) => {
    // check if the object already exists in the accumulator
    const existingObject = acc.find((o) => o.strikePrice === obj.strikePrice && o.expiryDate === obj.expiryDate);
    if (existingObject) {
      // merge the object into the existing object
      existingObject.prop3 = existingObject.prop3.concat(obj.prop3);
    } else {
      // add the object to the accumulator
      acc.push(obj);
    }
    return acc;
  }, []);
};

// basic of CE and PE + Greek. All this is for offline
function greekCalc(req, strikeObj) {
  let { spot, strike, instrument, expiry, start, lotsize, loop, entryJson, gap } = req.params;

  //Fetch volatility from strikeObj for CE and PE
  //loop spot price for 50 up/down
  // pass it to calculator with strike, expiry, start, volatility, spot(-1,+1), interest:10 and type

  loop = loop ? loop : 5;
  let loopStart = Number(spot) - loop;
  let loopEnd = Number(spot) + loop;
  let FOGreeks = [];
  for (let i = loopStart; i <= loopEnd; i+=gap) {
    let greekObj = {
      strikePrice: Number(strike),
      expiryDate: expiry,
      startDate: start,
      CE: {
        strikePrice: Number(strike),
        expiryDate: expiry,
        underlying: instrument,
        impliedVolatility: strikeObj[0].CE ? Number(strikeObj[0].CE.impliedVolatility.toFixed(2)) : 0,
        underlyingValue: i,
      },
      PE: {
        strikePrice: Number(strike),
        expiryDate: expiry,
        underlying: instrument,
        impliedVolatility: strikeObj[0].PE ? Number(strikeObj[0].PE.impliedVolatility.toFixed(2)) : 0,
        underlyingValue: i,
      },
    };

    if (entryJson.callput == 'CE') {
      let callGreeks = greeksBlackScholesCal(
        {
          volatility: greekObj.CE.impliedVolatility,
          interest: 10,
          spot: greekObj.CE.underlyingValue,
          strike: greekObj.CE.strikePrice,
          lastPrice: greekObj.CE.underlyingValue,
          expiry: convertDateFormat(expiry) + 'T15:30:00',
          start: convertDateFormat(start) + 'T15:30:00',
        },
        'CE'
      );
      greekObj.CE = Object.assign(greekObj.CE, callGreeks);
      //   greekObj.CE = Object.assign(greekObj.CE, { iv: getIV({ spot: i, strike: strike }, 'Call') });
      greekObj.CE = Object.assign(greekObj.CE, {
        timeValue: getTimeValue({ premium: greekObj.CE.premium, iv: greekObj.CE.iv }),
      });

      greekObj.CE = Object.assign(
        greekObj.CE,
        getBuyingSellingOption({
          entry: Number(entryJson.entry),
          premium: greekObj.CE.premium,
          lotsize: Number(lotsize),
          numlots: Number(entryJson.numlots),
          orderType: entryJson.buysell,
        })
      );

      greekObj.CE = Object.assign(greekObj.CE, {
        entry: Number(entryJson.entry),
        lotsize: Number(lotsize),
        numlots: Number(entryJson.numlots),
        orderType: entryJson.buysell,
        quantity: Number(lotsize) * Number(entryJson.numlots),
      });
    } else {
      delete greekObj.CE;
    }

    if (entryJson.callput == 'PE') {
      let putGreeks = greeksBlackScholesCal(
        {
          volatility: greekObj.PE.impliedVolatility,
          interest: 10,
          spot: greekObj.PE.underlyingValue,
          strike: greekObj.PE.strikePrice,
          lastPrice: greekObj.PE.underlyingValue,
          expiry: convertDateFormat(expiry) + 'T15:30:00',
          start: convertDateFormat(start) + 'T15:30:00',
        },
        'PE'
      );
      greekObj.PE = Object.assign(greekObj.PE, putGreeks);
      //   greekObj.PE = Object.assign(greekObj.PE, { iv: getIV({ spot: i, strike: strike }, 'Put') });
      greekObj.PE = Object.assign(greekObj.PE, {
        timeValue: getTimeValue({ premium: greekObj.PE.premium, iv: greekObj.PE.iv }),
      });

      greekObj.PE = Object.assign(
        greekObj.PE,
        getBuyingSellingOption({
          entry: Number(entryJson.entry),
          premium: greekObj.PE.premium,
          lotsize: Number(lotsize),
          numlots: Number(entryJson.numlots),
          orderType: entryJson.buysell,
        })
      );

      greekObj.PE = Object.assign(greekObj.PE, {
        entry: Number(entryJson.entry),
        lotsize: Number(lotsize),
        numlots: Number(entryJson.numlots),
        orderType: entryJson.buysell,
        quantity: Number(lotsize) * Number(entryJson.numlots),
      });
    } else {
      delete greekObj.PE;
    }

    greekObj.CPE = greekObj.CE ? greekObj.CE : greekObj.PE;

    if (greekObj.CE) {
      delete greekObj.CE;
    }

    if (greekObj.PE) {
      delete greekObj.PE;
    }

    if (entryJson.buysell == 'Buy') {
      greekObj.CPE.underlyingPremium = greekObj.CPE.premium * 1;
      greekObj.CPE.underlyingPremiumTotal = greekObj.CPE.premium * greekObj.CPE.numlots * 1;
      greekObj.CPE.entryPremium = greekObj.CPE.entry * 1;
      greekObj.CPE.entryPremiumTotal = greekObj.CPE.entry * greekObj.CPE.numlots * 1;
      greekObj.CPE.deltaOrdered = greekObj.CPE.delta * 1;
      greekObj.CPE.deltaOrderedTotal = Number((greekObj.CPE.delta * greekObj.CPE.numlots * 1).toFixed(4));
      greekObj.CPE.gammaOrdered = greekObj.CPE.gamma * 1;
      greekObj.CPE.gammaOrderedTotal = Number((greekObj.CPE.gamma * greekObj.CPE.numlots * 1).toFixed(4));
      greekObj.CPE.thetaOrdered = greekObj.CPE.theta * 1;
      greekObj.CPE.thetaOrderedTotal = Number((greekObj.CPE.theta * greekObj.CPE.numlots * 1).toFixed(4));
      greekObj.CPE.vegaOrdered = greekObj.CPE.vega * 1;
      greekObj.CPE.vegaOrderedTotal = Number((greekObj.CPE.vega * greekObj.CPE.numlots * 1).toFixed(4));
    } else {
      greekObj.CPE.underlyingPremium = greekObj.CPE.premium * -1;
      greekObj.CPE.underlyingPremiumTotal = greekObj.CPE.premium * greekObj.CPE.numlots * -1;
      greekObj.CPE.entryPremium = greekObj.CPE.entry * -1;
      greekObj.CPE.entryPremiumTotal = greekObj.CPE.entry * greekObj.CPE.numlots * -1;
      greekObj.CPE.deltaOrdered = greekObj.CPE.delta * -1;
      greekObj.CPE.deltaOrderedTotal = Number((greekObj.CPE.delta * greekObj.CPE.numlots * -1).toFixed(4));
      greekObj.CPE.gammaOrdered = greekObj.CPE.gamma * -1;
      greekObj.CPE.gammaOrderedTotal = Number((greekObj.CPE.gamma * greekObj.CPE.numlots * -1).toFixed(4));
      greekObj.CPE.thetaOrdered = greekObj.CPE.theta * -1;
      greekObj.CPE.thetaOrderedTotal = Number((greekObj.CPE.theta * greekObj.CPE.numlots * -1).toFixed(4));
      greekObj.CPE.vegaOrdered = greekObj.CPE.vega * -1;
      greekObj.CPE.vegaOrderedTotal = Number((greekObj.CPE.vega * greekObj.CPE.numlots * -1).toFixed(4));
    }

    greekObj.CPE.orderHelper = `${greekObj.CPE.underlying}_${greekObj.expiryDate}_${greekObj.strikePrice}_${entryJson.callput}@${greekObj.CPE.entry}`;

    // remove unwanted properties
    let removeProps = [
      'strikePrice',
      'expiryDate',
      'startDate',
      'CPE.strikePrice',
      'CPE.expiryDate',
      'CPE.fv_strike',
      'CPE.rho',
    ];

    removeProps.forEach((props) => {
      greekObj = removeProperties(greekObj, props);
    });

    FOGreeks.push(greekObj);
  }

  return FOGreeks;
}

// Live market + greek, hence we have to remove lot of live martket data
async function getMulti(liveData, expiry) {
  let filteredData = [];
  liveData.records.data.forEach((data) => {
    if (data.expiryDate == expiry) {
      filteredData.push(data);
    }
  });

  // merge filtered data for given expiry into combination of strike price and expiredate with CE/PE from NSE
  let merRes = mergeObjects(filteredData);
  merRes = merRes.map((res) => {
    let greeks;

    if (res.CE) {
      greeks = greeksBlackScholesCal(
        {
          volatility: res.CE.impliedVolatility,
          interest: 10,
          spot: res.CE.underlyingValue,
          strike: res.CE.strikePrice,
          expiry: convertDateFormat(expiry) + 'T15:30:00',
          start: Date.now(),
          lastPrice: res.CE.lastPrice,
        },
        'CE'
      );
      res.CE = Object.assign(res.CE, greeks);
    }

    if (res.PE) {
      greeks = greeksBlackScholesCal(
        {
          volatility: res.PE.impliedVolatility,
          interest: 10,
          spot: res.PE.underlyingValue,
          strike: res.PE.strikePrice,
          expiry: convertDateFormat(expiry) + 'T15:30:00',
          start: Date.now(),
          lastPrice: res.PE.lastPrice,
        },
        'PE'
      );
      res.PE = Object.assign(res.PE, greeks);
    }
    return res;
  });

  merRes = merRes.map((strike) => {
    let strikeRes = nse.optionChainAnalysis(strike);
    // remove unwanted properties , these are coming mostly from NSE option
    let removeProps = [
      'CE.expiry',
      'CE.identifier',
      'CE.pchangeinOpenInterest',
      'CE.totalSellQuantity',
      'CE.totalBuyQuantity',
      'CE.bidprice',
      'CE.bidQty',
      'CE.askQty',
      'CE.askPrice',
      'CE.d1',
      'CE.d2',
      'CE.pChange',
      'CE.fv_strike',
      'PE.strikePrice',
      'PE.expiryDate',
      'PE.underlying',
      'PE.identifier',
      'PE.pchangeinOpenInterest',
      'PE.pChange',
      'PE.totalBuyQuantity',
      'PE.totalSellQuantity',
      'PE.bidQty',
      'PE.bidprice',
      'PE.askQty',
      'PE.askPrice',
      'PE.d1',
      'PE.d2',
      'PE.fv_strike',
      'CE_A.price',
      'CE_A.OI',
      'CE_A.trend',
      'PE_A.price',
      'PE_A.OI',
      'PE_A.trend',
    ];
    removeProps.forEach((props) => {
      strikeRes = removeProperties(strikeRes, props);
    });
    return strikeRes;
  });
  return merRes;
}

function getTodaysDate() {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let day = new Date().getDate();

  const monthIndex = new Date().getMonth();
  const monthName = monthNames[monthIndex];

  const year = new Date().getFullYear();

  day = day < 10 ? `0${day}` : day;
  return `${day}-${monthName}-${year}`;
}

function findObject(array, properties) {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    let match = true;
    for (const property in properties) {
      if (array[i][property] !== properties[property]) {
        match = false;
        break;
      }
    }
    if (match) {
      result.push(array[i]);
    }
  }

  if (result.length > 0) {
    return result;
  } else {
    return null;
  }
}

function removeProperties(obj, props) {
  if (props.includes('.')) {
    let arr = props.split('.');
    delete obj[arr[0]][arr[1]];
  } else {
    delete obj[props];
  }
  return obj;
}

function addCompare(FOGreeks, loop) {
  let compare = [];

    for (let compRowIndex = 0; compRowIndex < FOGreeks[0].rows.length; compRowIndex++) {
      let compareRow = {};

      for (let compIndex = 0; compIndex < FOGreeks.length; compIndex++) {
        if (compIndex == 0) {
          compareRow.underlyingValue = FOGreeks[compIndex].rows[compRowIndex].CPE.underlyingValue;
        }
        let callputLabel = `${FOGreeks[compIndex].strikePrice}_${FOGreeks[compIndex].callput}`;
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

    return compare;
}

module.exports = {
  greeksBlackScholesCal,
  getBuyingSellingOption,
  getTimeValue,
  getIV,
  convertDateFormat,
  mergeObjects,
  greekCalc,
  getTodaysDate,
  findObject,
  removeProperties,
  getMulti,
  addCompare
};
