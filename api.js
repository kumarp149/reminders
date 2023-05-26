const AWS = require('aws-sdk');
AWS.config.update({ accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_ACCESS_KEY, region: 'ap-south-1' });
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const BUCKET = process.env.S3_BUCKET;
const { PassThrough } = require('stream');
//import axios from 'axios';
const axios = require('axios').default;


const uploadStreamToS3 = async (stream, name, gender, day, month) => {
    console.log("ENTERED UPLOAD STREAM");
    const params = {
        Bucket: BUCKET,
        Key: "birthdays/" + month + "/" + day + "/" + name + "_" + gender,
        Body: stream
    }
    try {
        const data = await s3.upload(params).promise();
        console.log("UPLOADED WITH DATA: " + data);
        return 1;
    } catch (error) {
        return error;
    }
};




module.exports = {
    getBirthDays: async (day, month, LOGGER) => {
        const MODULE_DESCRIPTION = "API GETBIRTHDAYS METHOD";
        LOGGER.streamLog("INFO", MODULE_DESCRIPTION, "ENTERED");
        var result = [];
        try {
            var params = {
                Bucket: BUCKET || 'all-birthday-reminders',
                Delimiter: '',
                Prefix: 'birthdays/' + month + '/' + day
            }
            var arrOfObjects = await s3.listObjects(params).promise();
            LOGGER.streamLog("INFO", MODULE_DESCRIPTION, "BIRTHDAYS FETCHED: " + JSON.stringify(arrOfObjects));
            for (var iter = 0; iter < arrOfObjects.Contents.length; ++iter) {
                var keyName = arrOfObjects.Contents[iter].Key.replace(params.Prefix + '/', '');
                LOGGER.streamLog("INFO", MODULE_DESCRIPTION, "KEYNAME: " + keyName);
                var indexOfSeperator = keyName.lastIndexOf("_");
                if (keyName !== '') {
                    result.push([keyName.substring(0, indexOfSeperator), keyName.substring(indexOfSeperator + 1, indexOfSeperator + 2)]);
                    LOGGER.streamLog("INFO", MODULE_DESCRIPTION, "OBJECT ITERATION-" + iter + ": name [" + keyName.substring(0, indexOfSeperator) + "], gender [" + keyName.substring(indexOfSeperator + 1) + "]");
                }
            }
        } catch (err) {
            result = [{ "error": err }];
            if (err !== undefined) {
                LOGGER.streamLog("ERROR", MODULE_DESCRIPTION, err);
            } else {
                LOGGER.streamLog("ERROR", MODULE_DESCRIPTION, "UNKNOWN ERROR OCCURED");
            }
        } finally {
            return result;
        }
    },
    addBirthDay: async (name, gender, day, month, logger) => {
        const MODULE_DESCRIPTION = "API ADDBIRTHDAY METHOD";
        logger.streamLog("INFO", MODULE_DESCRIPTION, "ENTERED");
        try {
            const stream = new PassThrough();
            stream.write("Welcome");
            stream.end();
            const status = await uploadStreamToS3(stream, name, gender, day, month);
            if (status === 1) {
                logger.streamLog("INFO", MODULE_DESCRIPTION, "UPLOADED STREAM TO S3");
                return 1;
            } else {
                logger.streamLog("INFO", MODULE_DESCRIPTION, "ERROR UPLOADING STREAM TO S3: " + status || "");
                return status || 0;
            }
        } catch (error) {
            logger.streamLog("INFO", MODULE_DESCRIPTION, "ERROR UPLOADING STREAM TO S3: " + error || "");
            return error || 0;
        }
    },
    notify: async (name, gender, logger) => {
        const MODULE_DESCRIPTION = "API NOTIFY METHOD";
        logger.streamLog("INFO", MODULE_DESCRIPTION, "ENTERED");
        const requestBody = {
            "app_id": process.env.ONESIGNAL_ID,
            "included_segments": ["Subscribed Users"],
            "contents": {
                "en": "It is " + name + "'s birthday today. Wish " + ((gender == 'F') ? "her" : "him") + " a prosperous birthday"
            },
            "headings": {
                "en": "Reminder"
            }
        }
        logger.streamLog("INFO", MODULE_DESCRIPTION, "SENDING NOTIFICATION FOR YOU TO REMIND " + name.toUpperCase() + "'S BIRTHDAY");
        try {
            const response = await axios.post(process.env.ONESIGNAL_API_URL + "notifications", requestBody, {
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + process.env.ONESIGNAL_API_KEY
                }
            });
            console.log("RESPONSE FROM NOTIFY");
            console.log(response.data);
            logger.streamLog("INFO", MODULE_DESCRIPTION, "SENT YOU THE REMINDER FOR " + name.toUpperCase() + "'S BIRTHDAY");
            return 1;
        } catch (error) {
            console.log((error) ? "ERROR SENDING NOTIFICATION DUE TO " + error : "ERROR SENDING NOTIFICATION");
            logger.streamLog("INFO", MODULE_DESCRIPTION, "ERROR SENDING YOU REMINDER FOR " + name.toUpperCase() + "'S BIRTHDAY");
            return error;
        }
    }
};