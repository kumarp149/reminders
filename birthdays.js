const API_LIB = require("./api")

const LOGGER_LIB = require("./logger")

const { customAlphabet } = require("nanoid");

const axios = require('axios').default;

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
      if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
              return;
          }
          seen.add(value);
      }
      return value;
  };
};

module.exports.fetch = async function(event,context,callback){
  const MODULE_DESCRIPTION = "CONTROLLER FETCH BIRTHDAYS METHOD";
  var LOGGER = new LOGGER_LIB.Logger(customAlphabet('1234567890abcdefABCDEF',30)(),"FETCH");
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"ENTERED");
  var birthDays;
  var date = new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'});
  var currentDate = new Date(date);
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"CURRENT DATE IN IST: " + currentDate);
  if (!event.headers.hasOwnProperty("authorization") || (event.headers.hasOwnProperty("authorization") && event.headers['authorization'] !== process.env.TOKEN)){
    LOGGER.streamLog("ERROR",MODULE_DESCRIPTION,"VALID TOKEN NOT FOUND IN HEADERS");
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"YOU ARE NOT AUTHORIZED TO VIEW THIS CONTENT. TRY AGAIN WITH A VALID ACCESS TOKEN");
    await LOGGER.finish();
    return {statusCode: 404,body: JSON.stringify({message: "you are not authorized to view this content"})};
  }
  try {
    [birthDays] = await Promise.all([API_LIB.getBirthDays(parseInt(currentDate.getDate()), parseInt(currentDate.getMonth() + 1),LOGGER)]);
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,JSON.stringify(birthDays));
    if (birthDays.length == 1){
      LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"BIRTHDAYS: " + JSON.stringify(birthDays));
      if (birthDays[0].hasOwnProperty("error")){
        LOGGER.streamLog("ERROR",MODULE_DESCRIPTION, birthDays[0].error || "ERROR WITH THE API CALL");
        await LOGGER.finish();
        return {statusCode: 501,body: JSON.stringify({message: birthDays[0].error || "error with api call"})};
      } else{
        LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"BIRTHDAYS: " + birthDays.toString());
        await LOGGER.finish();
        return birthDays;
      }
    } else{
      if (birthDays.length > 1){
        LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"BIRTHDAYS: " + JSON.stringify(birthDays));
      } else{
        LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"THERE ARE NO BIRTHDAYS TODAY");
      }
      await LOGGER.finish();
      return birthDays;
    }
  } catch (error) {
    LOGGER.streamLog("ERROR",MODULE_DESCRIPTION,error || "INTERNAL SERVER ERROR");
    await LOGGER.finish();
    return {statusCode: 501,body: JSON.stringify({message: error || "Internal server error"})};
  }
}

module.exports.add = async function(event,context,callback){
  var LOGGER = new LOGGER_LIB.Logger(customAlphabet('1234567890abcdefABCDEF',30)(),"ADD");
  const MODULE_DESCRIPTION = "CONTROLLER ADD BIRTHDAYS METHOD";
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"ENTERED");
  if (!event.headers.hasOwnProperty("authorization") || (event.headers.hasOwnProperty("authorization") && event.headers['authorization'] !== process.env.TOKEN)){
    LOGGER.streamLog("ERROR",MODULE_DESCRIPTION,"VALID TOKEN NOT FOUND IN HEADERS");
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"YOU ARE NOT AUTHORIZED TO DO THIS ACTION. TRY AGAIN WITH A VALID ACCESS TOKEN");
    await LOGGER.finish();
    return {statusCode: 404,body: JSON.stringify({message: "you are not authorized to do this action"})};
  }
  const body = JSON.parse(event.body);
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,JSON.stringify(body));
  if (!body.month || !body.date || !body.gender || !body.name){
    LOGGER.streamLog("ERROR",MODULE_DESCRIPTION,"REQUIRED DATA IS NOT PRESENT IN THE REQUEST BODY");
    await LOGGER.finish();
    return {statusCode: 200,body: JSON.stringify({message: "sufficient data is not present in the request body"})};
  }
  try {
    var birthdayMonth = parseInt(body.month);
    var birthdayDate = parseInt(body.date);
    var gender = body.gender;
    var name = body.name;
    var status;
    status = await API_LIB.addBirthDay(name, gender, birthdayDate, birthdayMonth, LOGGER);
    if (status === 1) {
      LOGGER.streamLog("INFO", MODULE_DESCRIPTION, "SUCCESSFULLY REGISTERED BIRTHDAY OF " + name);
      await LOGGER.finish();
      return { statusCode: 200, body: JSON.stringify({ message: "registered the birthday successfully" }) };
    } else {
      LOGGER.streamLog("INFO", MODULE_DESCRIPTION, (status === 0) ? "FAILED REGISTERING BIRTHDAY OF " + name : "FAILED REGISTERING BIRTHDAY OF " + name + " DUE TO " + status);
      await LOGGER.finish();
      return { statusCode: 501, body: JSON.stringify({ message: (status === 0) ? "failed to register the birthday" : "failed to register the birthday due to " + status }) };
    }
  } catch (error) {
    LOGGER.streamLog("INFO", MODULE_DESCRIPTION, (error) ? "FAILED REGISTERING BIRTHDAY OF " + name : "FAILED REGISTERING BIRTHDAY OF " + name + " DUE TO " + error);
    await LOGGER.finish();
    return {statusCode: 501, body: JSON.stringify({ message: (error) ? "failed to register the birthday due to " + error : "failed to register the birthday"})};
  }
}

module.exports.notify = async function(event,context,callback){
  var LOGGER = new LOGGER_LIB.Logger(customAlphabet('1234567890abcdefABCDEF',30)(),"NOTIFY");
  const MODULE_DESCRIPTION = "CONTROLLER NOTIFY METHOD";
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"ENTERED");
  if (!event.headers.hasOwnProperty("authorization") || (event.headers.hasOwnProperty("authorization") && event.headers['authorization'] !== process.env.TOKEN)){
    LOGGER.streamLog("ERROR",MODULE_DESCRIPTION,"VALID TOKEN NOT FOUND IN HEADERS");
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"YOU ARE NOT AUTHORIZED TO DO THIS ACTION. TRY AGAIN WITH A VALID ACCESS TOKEN");
    await LOGGER.finish();
    return {statusCode: 404,body: JSON.stringify({message: "you are not authorized to do this action"})};
  }

  var birthdays = [];
  var failedBirthdays = [];
  var countSent = 0;
  try {
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"FETCHING BIRTHDAYS");
    birthdays = await axios.get(process.env.GET_BIRTHDAYS,{
      "headers":{
        "Authorization": process.env.TOKEN
      }
    });
    birthdays = JSON.stringify(birthdays,getCircularReplacer());
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"BIRTHDAYS FETCHED: " + (birthdays));
    birthdays = JSON.parse(birthdays).data;
    for (let i = 0; i < birthdays.length; ++i){
      let name = birthdays[i][0];
      let gender = birthdays[i][1];
      LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"SENDING NOTIFICATION FOR " + name);
      var status;
      try {
        status = await Promise.all([API_LIB.notify(name,gender,LOGGER)]);
        if (status == 1){
          countSent++;
          LOGGER.streamLog("NOTIFICATION SUCCESSFULLY SENT FOR " + name);
        } else{
          failedBirthdays.push(name);
          LOGGER.streamLog("INFO",MODULE_DESCRIPTION,(status) ? "ERROR SENDING NOTIFICATION FOR " + name.toUpperCase() + "'S BIRTHDAY DUE TO " + status : "ERROR SENDING NOTIFICATION FOR " + name.toUpperCase() + "'S BIRTHDAY");
        }
      } catch (err) {
        LOGGER.streamLog("INFO",MODULE_DESCRIPTION,(err) ? "ERROR SENDING NOTIFICATIONS DUE TO " + err : "ERROR SENDING NOTIFICATIONS");
        await LOGGER.finish();
        return {statusCode: 501, body: JSON.stringify({
          message: (err) ? "error sending notifications for below birthdays due to " + err : "error sending notifications for below birthdays",
          failedBirthdays: failedBirthdays
        })}
      }
    }
    if (failedBirthdays.length === 0){
      LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"SUCCESSFULLY SENT NOTIFICATIONS FOR ALL THE BIRTHDAYS");
      await LOGGER.finish();
      return {statusCode: 200, body: JSON.stringify({message: "successfully sent notifications for all the birthdays"})};
    }
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"FAILED SENDING NOTIFICATIONS FOR " + JSON.parse(failedBirthdays));
    await LOGGER.finish();
    return {statusCode: 200, body: JSON.stringify({
      message: "cannot send notifications for below birthdays",
      failedBirthdays: failedBirthdays
    })}
  } catch (error) {
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,(error) ? "ERROR FETCHING BIRTHDAYS DUE TO " + error : "ERROR FETCHING BIRTHDAYS");
    await LOGGER.finish();
    return {statusCode: 501,body: JSON.stringify({message: (error) ? "error fetching birthdays due to " + error : "Error fetching birthdays"})};
  }
}

module.exports.schedule = async function(event,context,callback){
  var LOGGER = new LOGGER_LIB.Logger(customAlphabet('1234567890abcdefABCDEF',30)(),"SCHEDULE");
  const MODULE_DESCRIPTION = "CONTROLLER SCHEDULE METHOD";
  LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"ENTERED");
  try {
    const response = await axios.post(process.env.NOTIFY_BIRTHDAYS,{},{
      "headers": {
        "Authorization": process.env.TOKEN
      }
    });
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,"RESPONSE FROM NOTIFY: " + JSON.stringify(response.data));
    await LOGGER.finish();
    return {statusCode: response.status,body: JSON.stringify({message: JSON.stringify(response.data.message)})};
  } catch (error) {
    LOGGER.streamLog("INFO",MODULE_DESCRIPTION,(error) ? "ERROR CALLING SCHEDULE: " + error : "ERROR CALLING SCHEDULE");
    await LOGGER.finish();
    return {statusCode: 501,body: JSON.stringify({message: (error) ? "error fetching birthdays due to " + error : "Error fetching birthdays"})};
  }
}