/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

 /* globals console, document, refreshButton, deviceList, readTemperatureButton, disconnectButton, notifyTemperatureButton,
    pullDeviceDataButton, testButton, ble, temperatureValue, temperatureList, detailPage, mainPage, alert */
'use strict';

var retainer = {
    device_uuid: null,
    xgatt_service: {
        uuid: "61744710-a6e8-11e2-9e96-0800200c9a66"
    },
    xgatt_id: {
        uuid: "c5991711-0d5f-47f9-9b09-3814332a11ac",
        notifying: false
    },
    xgatt_celsius: {
        uuid: "4243ab10-502d-48e6-af3a-14c07569febc",
        notifying: false
    },
    xgatt_temperature: {
        uuid: "3ca692d0-b9a8-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_readidx: {
        uuid: "be2e55a0-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_writeidx: {
        uuid: "c3b2d730-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataout1: {
        uuid: "d3d7d610-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataout2: {
        uuid: "d3d7d611-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataout3: {
        uuid: "d3d7d712-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_overwrite: {
        uuid: "128d63d0-d3ba-11e2-8b8b-0800200c9a66",
        notifying: false
    },
    xgatt_restore: {
        uuid: "ba9de407-f0fd-4422-b617-030c4bf1a5aa",
        notifying: false
    },
    xgatt_time: {
        uuid: "d3d7d618-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_loggertype: {
        uuid: "67a9483c-8756-48e8-87c2-82c8aaff9242",
        notifying: false
    }
};


var temperatures = [];
var pulledData = [];

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        this.showMainPage();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);

        refreshButton.addEventListener('touchend', this.refreshDeviceList, false);
        deviceList.addEventListener('touchend', this.connect, false);

        readTemperatureButton.addEventListener('touchend', this.read_temperature, false);
        disconnectButton.addEventListener('touchend', this.disconnect, false);
        notifyTemperatureButton.addEventListener('touchend', this.toggleNotify_temperature, false);
        pullDeviceDataButton.addEventListener('touchend', this.pullDeviceData, false);
        testButton.addEventListener('touchend', this.testButton, false);
    },
    onDeviceReady: function() {
        app.refreshDeviceList();
    },
    refreshDeviceList: function() {
        deviceList.innerHTML = '';
        ble.scan([], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device) {
        console.log(JSON.stringify(device));
        var listItem = document.createElement('li'),
            html = '<b>' + device.name + '</b><br/>' +
            'RSSI: ' + device.rssi + '&nbsp;|&nbsp;' +
            device.id;
        listItem.dataset.deviceId = device.id;
        listItem.innerHTML = html;
        deviceList.appendChild(listItem);
    },
    connect: function(e) {
        console.log(JSON.stringify(e.target.dataset));
        retainer.device_uuid = e.target.dataset.deviceId;
        var onConnect = function() {
            console.log('Connected: ' + retainer.device_uuid);
            app.showDetailPage();
        };
        ble.connect(retainer.device_uuid, onConnect, app.onError);
    },
    disconnect: function(event) {
        var onDisconnect = function() {
            console.log('Disconnected: ' + retainer.device_uuid);
            app.showMainPage();
        };
        ble.disconnect(retainer.device_uuid, onDisconnect, app.onError);
        // TODO: Extend error handling on disconnect to handle cases in which spontaneous d/c occurs
    },
    pullDeviceData: function() {
        console.log('Starting Pull Device Data Sequence');
        Promise.all([
            app.read_readIndex(),
            app.read_writeIndex(),
            app.read_overwriteFlag()
        ])
        .then(function(values) {
            var readIdx = values[0],
                writeIdx = values[1],
                overwriteFlag = values[2],
                currentIdx,
                endIdx,
                retrievedData = [],
                asyncGetDataFromCyclicalFlash = function(currentIdx, endIdx) {
                    var p = Promise.resolve();
                    var results = [];
                    while (currentIdx <= endIdx) {
                        var wrappedFn = function(idx) { // Capture currentIdx in scope of wrappedFn for Async Execution
                            return function() { // Function Curry to make Promise Then-able
                                return app.getDataFromFlash(idx); // Returns a Promise Object
                            };
                        }
                        p = p.then(wrappedFn(currentIdx))   // While loop iterations builds Promise Chain
                            .then(function(value) {
                                results.push(value);    // Store result for each invocation of app.getDataFromflash(idx)
                            })
                            .catch(app.onError);
                        currentIdx += 1;
                    }
                    p = p.then(function() {
                        return results; // Final element of Promise Chain returns results
                    })
                    .catch(app.onError);
                    return p;
                };
            // Handle Various Cases of Cyclical Data Structure
            // If data not overwritten, pull data from readIdx-->writeIdx-1 (wrapping around cyclical boundary)
            // If data is overwritten, pull data from writeIdx+1-->writeIdx-1 (wrapping around cyclical boundary)
            if (readIdx === writeIdx && overwriteFlag === 0) {
                console.log('Case A: No new data.  Do nothing.');
                return null; // No new data. Do nothing
            } else if (readIdx < writeIdx && overwriteFlag === 0) {
                console.log('Case B: New data.  Read: readIdx-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                currentIdx = readIdx;
                endIdx = writeIdx - 1;
                retrievedData = asyncGetDataFromCyclicalFlash(currentIdx, endIdx);
                return retrievedData;
            } else if (readIdx > writeIdx && overwriteFlag === 0) {
                console.log('Case C: New data.  Read: readIdx-->125-->0-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                return new Promise(function(resolve, reject) {
                    currentIdx = readIdx;
                    endIdx = 125;
                    retrievedData = asyncGetDataFromCyclicalFlash(currentIdx, endIdx);
                    resolve(retrievedData);
                })
                .then(function(value) {
                    retrievedData = value;
                    currentIdx = 0;
                    endIdx = writeIdx - 1;
                    return asyncGetDataFromCyclicalFlash(currentIdx, endIdx)
                    .then(function(value) {
                        retrievedData = retrievedData.concat(value);
                        return retrievedData;
                    })
                    .catch(app.onError);
                })
                .catch(app.onError);
            } else {
                if (writeIdx === 125) {
                    console.log('Case D.1: New data & overwritten.  Read: 0-->124 b/c writeIdx is 125. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                    currentIdx = 0;
                    endIdx = 124;
                    retrievedData = asyncGetDataFromCyclicalFlash(currentIdx, endIdx);
                    return retrievedData;
                } else {
                    console.log('Case D.2: New data & overwritten.  Read: writeIdx+1-->125-->0-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                    return new Promise(function(resolve, reject) {
                        currentIdx = writeIdx + 1;
                        endIdx = 125;
                        retrievedData = asyncGetDataFromCyclicalFlash(currentIdx, endIdx);
                        resolve(retrievedData);
                    })
                    .then(function(value) {
                        retrievedData = value;
                        currentIdx = 0;
                        endIdx = writeIdx - 1;
                        return asyncGetDataFromCyclicalFlash(currentIdx, endIdx)
                        .then(function(value) {
                            retrievedData = retrievedData.concat(value);
                            return retrievedData;
                        })
                        .catch(app.onError);
                    })
                    .catch(app.onError);
                };
            };
        })
        .then(function(array) {
            console.log('Pulled Data: ' + JSON.stringify(array));
            console.log('----------------');
            pulledData = pulledData.concat(array);
        })
        .catch(app.onError);
    },
    getDataFromFlash: function(index) {
        return new Promise(function(resolve, reject) {
            console.log('app.getDataFromFlash(' + index + ')');
            app.write_readIndex(index)
            .then(app.read_dataout1)
            .then(function(value) {
                console.log('onRead_dataout1 for index: ' + index + ' resolve value: ' + value.rawTemperature + ' ' + value.rawTime + ' ' + value.rawCRC);
                console.log('-----');
                value['index'] = index;
                resolve(value);
            })
            .catch(app.onError);
        });
    },
    testButton: function() {
        var date = new Date();
        console.log(date);

        var deviceTime = app.read_time()
        .then(function(value) {
            console.log('1) completed app.read_time: ' + value);
            return value;
        })
        .then(function() {
            console.log('Before 2: Calling app.write_time(seconds)');
            return app.write_time(date);
        })
        .then(function(value) {
            console.log('2) completed app.write_time: ' + value);
            return value;
        })
        .then(function() {
            console.log('Before 3: Calling app.read_time()');
            return app.read_time();
        })
        .then(function(value) {
            console.log('3) completed app.read_time: ' + value);
            return value;
        })
        .catch(app.onError);

        return deviceTime;
    },
    read_time: function() {
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_time.uuid,
                resolve, reject);
        })
        .then(app.onRead_time)
        .catch(app.onError);
    },
    onRead_time: function(data) {
        return new Promise(function(resolve, reject) {
            var unixTime = new DataView(data).getUint32(0, true);
            var date = new Date(unixTime*1000);
            console.log('Read xgatt_time. Unix Time: ' + unixTime + ',  Date: ' + date.toJSON());
            resolve(date);
        });
    },
    write_time: function(date) {    // date is Javascript Date Object
        return new Promise(function(resolve, reject) {
            var unixTime = Math.floor(date.getTime()/1000); // Unix Time is specified in seconds since Jan 1, 1970
            var data = new Uint32Array([unixTime]);
            ble.write(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_time.uuid, data.buffer,
                resolve(date), reject);
        })
        .then(function(date) {
            return app.onWrite_time(date);
        })
        .catch(app.onError);
    },
    onWrite_time: function(date) {  // date is Javascript Date Object
        return new Promise(function(resolve, reject) {
            var unixTime = Math.floor(date.getTime()/1000); // Unix Time is specified in seconds since Jan 1, 1970d
            var writtenDate = new Date(unixTime*1000);      // writtenDate truncates millisecond precision from date
            console.log('Wrote xgatt_time. Unix Time: ' + unixTime + ',  Date: ' + writtenDate.toJSON());
            resolve(writtenDate);
        });
    },
    read_temperature: function(event) {
        ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                 app.onRead_temperature, app.onError);
    },
    toggleNotify_temperature: function(e) {
        if (!retainer.xgatt_temperature.notifying) {
            console.log('Registering Notification for xgatt_temperature');
            ble.startNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                function(data) {
                    if (!retainer.xgatt_temperature.notifying) {
                        retainer.xgatt_temperature.notifying = true;
                        notifyTemperatureButton.innerHTML = 'Stop Notifications';
                        console.log('Started Temperature Notifications');
                    }
                    app.onRead_temperature(data);
                }, app.onError);
        } else{
            console.log('Unregistering Notification for xgatt_temperature');
            ble.stopNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                function() {
                    retainer.xgatt_temperature.notifying = false;
                    notifyTemperatureButton.innerHTML = 'Start Notifications';
                    console.log('Stopped Temperature Notifications');
                }, app.onError);
        };
    },
    onRead_temperature: function(data) {
        var rawTemperature, numTemperature, celsius;
        rawTemperature = new Uint16Array(data);
        numTemperature = parseInt(rawTemperature[0],10);
        celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
        console.log('Raw Temperature: ' + rawTemperature[0].toString());
        console.log('Num Temperature: ' + numTemperature);
        console.log('Celsius: ' + celsius);
        temperatureValue.innerHTML = celsius.toString().substring(0,7) + '&ordm;C';
        temperatures.push(celsius);
        temperatureList.innerHTML = temperatures.join('<br/>');
        return celsius;
    },
    read_writeIndex: function() {
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_writeidx.uuid,
                resolve, reject);
        })
        .then(app.onRead_writeIndex)
        .catch(app.onError);
    },
    onRead_writeIndex: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            var writeIndex = rawBytes[0];
            console.log('Read xgatt_writeidx: ' + writeIndex.toString());
            resolve(writeIndex);
        });
    },
    write_readIndex: function(number) {
        return new Promise(function(resolve, reject) {
            //Only takes integers 0-125 to index into the cyclical flash data structure on device
            if (!(Number.isInteger(number) && number >= 0 && number <= 125)) {
                this.reject(new Error('The "Read Index" must be an integer and must be between 0-125'));
            }
            var data = new Uint8Array([number, 0x80]);
            ble.write(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_readidx.uuid, data.buffer,
                resolve(number), reject);
        })
        .then(function(index) {
            return app.onWrite_readIndex(index);
        })
        .catch(app.onError);
    },
    onWrite_readIndex: function(index) {
        return new Promise(function(resolve, reject) {
            console.log('Wrote xgatt_readidx: ' + index);
            resolve(index);
        });
    },
    read_readIndex: function() {
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_readidx.uuid,
                resolve, reject);
        })
        .then(app.onRead_readIndex)
        .catch(app.onError);
    },
    onRead_readIndex: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            var readIndex = rawBytes[0];
            console.log('Read xgatt_readidx: ' + readIndex.toString());
            resolve(readIndex);
        });
    },
    read_overwriteFlag: function() {
        return new Promise(function(resolve, reject) {
            console.log('Called read_overwriteFlag');
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_overwrite.uuid, 
                resolve, reject);
        })
        .then(app.onRead_overwriteFlag)
        .catch(app.onError);
    },
    onRead_overwriteFlag: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            var overwriteFlag = Boolean(rawBytes[0]);
            console.log('Read xgatt_overwrite: ' + overwriteFlag);
            resolve(overwriteFlag);
        });
    },
    read_dataout1: function() {
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataout1.uuid,
                resolve, reject);
        })
        .then(app.onRead_dataout1)
        .catch(app.onError);
    },
    onRead_dataout1: function(data) {    // Data Passed Back as ArrayBuffer Type
        return new Promise(function(resolve, reject) {
            var rawTemperature, rawTime, rawCRC, celsius;
            // data_packet(11): [2 bytes Temp][4 bytes Pressure][4 bytes Time][1 byte CRC]
            rawTemperature = new DataView(data).getUint16(0, true);
            rawTime = new DataView(data).getUint16(6, true);
            rawCRC = new DataView(data).getUint8(10, true)

            console.log('rawTemperature: ' + rawTemperature);
            console.log('rawTime: ' + rawTime);
            console.log('rawCRC: ' + rawCRC);

            celsius = ((rawTemperature / 16) - 1335) * (1150 / 4096);
            console.log(celsius + ' celsius');

            resolve({"celsius":celsius, "rawTemperature":rawTemperature, "rawTime":rawTime, "rawCRC":rawCRC});
        });
    },
    bytesToString: function(buffer) {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    },
    stringToBytes: function(string) {
        var array = new Uint8Array(string.length);
        for (var i = 0, l = string.length; i < l; i++) {
            array[i] = string.charCodeAt(i);
        }
        return array.buffer;
    },
    showMainPage: function() {
        console.log('Showing Main Page');
        mainPage.hidden = false;
        detailPage.hidden = true;
        app.refreshDeviceList();
        // $("#mainPage").show();   // jQuery Equivalent
        // $("#detailPage").hide();
    },
    showDetailPage: function() {
        console.log('Showing Detail Page');
        mainPage.hidden = true;
        detailPage.hidden = false;
        // $("#mainPage").hide();
        // $("#detailPage").show();
        temperatureValue.innerHTML = '---&ordm;C';
        temperatures = [];
        temperatureList.innerHTML = '';
    },
    onError: function(reason) {
        alert(reason); // TODO: Eventually use notification.alert
        console.log(reason);
    }
};

// Polyfill Functions in ES6 that are not available in ES5/Cordova
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === "number" &&
           isFinite(value) &&
           Math.floor(value) === value;
};

Number.isNumeric = Number.isNumeric || function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

// function wait(ms) {
//     return function() {
//         return new Promise(function(resolve, reject) {
//             window.setTimeout(function() {
//                 resolve();
//             }, ms);
//         });
//     }
// };

app.initialize();