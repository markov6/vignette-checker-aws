'use strict';
const axios = require('axios');
const https = require('https');
const rootCas = require("ssl-root-cas").create();
const path = require('path');
rootCas.addFile(path.resolve(__dirname, "certs.pem"));
const httpsAgent = new https.Agent({ ca: rootCas });



module.exports.run = async (event, context) => {
  const response = await axios
    .get("https://check.bgtoll.bg/check/vignette/plate/BG/PA8261KM", {
      httpsAgent,
    })
    .catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log("Error", error.message);
      }
      console.log(error.config);
    });
  if (response.data) {
    console.log(response.data)
    const validUntil = new Date(response.data.vignette.validityDateToFormated);
    const epochEndTime = validUntil.getTime();
    console.log(Date.now())
    console.log(epochEndTime);
    const timeRemaining = epochEndTime - Date.now();
    //if time remaining is less than 1 week send to SNS topic
    if (timeRemaining < 604800000) {
      const sns = new AWS.SNS();
      const params = {
        Message: `Vignette for ${response.data.vignette.plateNumber} is expiring on ${validUntil}`,
        Subject: "Vignette Expiring Soon",
        TopicArn: "arn:aws:sns:eu-central-1:123456789012:VignetteExpiringSoon",
      };
      await sns.publish(params).promise();
    }
  }
};

