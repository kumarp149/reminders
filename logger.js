const AWS = require('aws-sdk');
var os = require("os");
const BUCKET = process.env.S3_BUCKET;
const stream = require('stream');


class Logger{
    constructor(id,service){
        const MODULE_DESCRIPTION = "LOGGER CONSTRUCTOR"
        AWS.config.update({accessKeyId: process.env.ACCESS_KEY, secretAccessKey: process.env.SECRET_ACCESS_KEY, region: 'ap-south-1'});
        var currentDate = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
        var month = currentDate.getMonth() + 1;
        var date = currentDate.getDate()
        this.file = currentDate.getFullYear().toString() + ((month.toString().length < 2) ? ('0' + month) : ('' + month)) + ((date.toString().length < 2) ? ('0' + date) : ('' + date)) + "-" + id;
        this.bucket = BUCKET;
        this.prefix = "logs/" + service + "/";
        this.id = id;
        this.logContent = "";
        this.stream = new stream.PassThrough();
        this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
        this.writeStream = this.s3
            .upload({
                Bucket: BUCKET,
                Key: this.prefix + this.file + ".log",
                Body: this.stream,
            })
            .promise()
            .then(() => console.log('File uploaded to S3'))
            .catch((err) => {
                console.log("ERROR UPLOADING STREAM to AWS S3: " + err);
                console.log("WRITING LOG TO CONSOLE");
                console.log(this.logContent);
            });
        this.streamLog("INFO",MODULE_DESCRIPTION,"INITIALIZED LOGGER WITH ID: " + id);
    }

    streamLog(type,component,data){
        var date = new Date();
        var millis = date.getTime();
        this.stream.write(millis.toString() + " - " + this.id + " - [" + type + "]" + " - (" + component + "): " + data + os.EOL);
        this.logContent = this.logContent + millis.toString() + " - " + this.id + " - [" + type + "]" + " - (" + component + "): " + data + os.EOL;
    }

    async finish(){
        const MODULE_DESCRIPTION = "LOGGER FINISH";
        this.streamLog("INFO",MODULE_DESCRIPTION,"FINISHING THE LOG STREAM AND UPLOADING LOG TO S3");
        this.stream.end();
        await this.writeStream;
        AWS.config.credentials.refresh((err) => {
            if (err) {
                console.error('ERROR REFRESHING CREDENTIALS:', err);
            } else{
                console.log("SUCCESSFULLY REFRESHED CREDENTIALS");
            }
        });
    }
}

module.exports = {Logger};