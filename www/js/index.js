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
        this.hideAllUI();
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', function() {
            if (navigator.notification) { // Override default HTML alert with native dialog
                window.alert = function(message, alertCallback, title, buttonName) {
                    navigator.notification.alert(message, alertCallback, title, buttonName);
                };
            }
        }, false);
        document.addEventListener('deviceready', this.onDeviceReady, false);
        refreshButton.addEventListener('touchend', this.refreshDeviceList, false);
        deviceList.addEventListener('touchend', this.touchDeviceListElement, false);
        readTemperatureButton.addEventListener('touchend', this.touchTemperatureButton, false);
        disconnectButton.addEventListener('touchend', this.touchDisconnectButton, false);
        notifyTemperatureButton.addEventListener('touchend', this.touchNotifyTemperatureButton, false);
        pullDeviceDataButton.addEventListener('touchend', this.touchPullDeviceDataButton, false);
        pushDataToCloudButton.addEventListener('touchend', this.touchPushDataToCloudButton, false);
        testButton.addEventListener('touchend', this.testButton, false);
    },
    onDeviceReady: function() {
        data.initialize(); // Parse initialization must be after deviceready
        app.showMainPage();
    },
    refreshDeviceList: function() {
        if(app.timeout) {
            window.clearTimeout(app.timeout);
        }
        refreshButton.style.backgroundColor = '#cccccc';
        app.timeout = window.setTimeout(function() {
            refreshButton.style.backgroundColor = '#f0f0ff';
        }, 5000);
        deviceList.innerHTML = '';
        able.scan([retainer.xgatt_service.uuid], 5, app.onDiscoverDevice)
        // TODO: Change to startScan & stopScan when move away page
        // Make scan more robust by storing device UUId in array in "onDiscoverDevice" & have UI show the array contents;
        // dynamically remove devices that move out of range
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
    touchDeviceListElement: function(e) {
        e.target.style.backgroundColor = '#cccccc';
        e.target.disabled = true;
        retainer.device_uuid = e.target.dataset.deviceId;
        able.connect(retainer.device_uuid)
            .then(function(info) { // On Each Connection, Update Device Time
                var date = new Date();
                able.write_time(date);
                e.target.style.backgroundColor = '#f0f0ff';
                e.target.disabled = false;

            })
            .then(able.read_time)
            .then(app.showDetailPage)
            .catch(app.onError);
    },
    touchDisconnectButton: function(e) {
        disconnectButton.style.backgroundColor = '#cccccc';
        disconnectButton.disabled = true;
        able.disconnect(retainer.device_uuid)
            .then(function(value) {
                disconnectButton.style.backgroundColor = '#f0f0ff';
                disconnectButton.disabled = false;
            })
            .then(app.showMainPage)
            .catch(app.onError);
    },
    touchTemperatureButton: function() {
        readTemperatureButton.style.backgroundColor = '#ff1e05';
        readTemperatureButton.disabled = true;
        able.read_temperature()
            .then(function(result) {
                console.log(result);
                temperatureValue.innerHTML = result.celsius.toString().substring(0, 7) + '&ordm;C';
                temperatures.push(result.celsius);
                temperatureList.innerHTML = temperatures.join('<br/>');
                readTemperatureButton.style.backgroundColor = '#f0f0ff';
                readTemperatureButton.disabled = false;
            });
    },
    touchNotifyTemperatureButton: function() {
        console.log('touchNotifyTemperatureButton');
        var updateUIOnNotification = function(value) {
            var celsius = value.celsius;
            temperatureValue.innerHTML = celsius.toString().substring(0, 7) + '&ordm;C';
            temperatures.push(celsius);
            temperatureList.innerHTML = temperatures.join('<br/>');
        }
        if (!retainer.xgatt_temperature.notifying) {
            able.startNotify_temperature(updateUIOnNotification)
                .then(function(value) {
                    if (retainer.xgatt_temperature.notifying) {
                        notifyTemperatureButton.innerHTML = 'Stop Notifications';
                        notifyTemperatureButton.style.backgroundColor = '#ff1e05';
                    }
                })
                .catch(app.onError);
        } else {
            able.stopNotify_temperature()
                .then(function(value) {
                    notifyTemperatureButton.innerHTML = 'Start Notifications';
                    notifyTemperatureButton.style.backgroundColor = '#f0f0ff';
                })
                .catch(app.onError);
        };
    },
    touchPullDeviceDataButton: function() {
        pullDeviceDataButton.style.backgroundColor = '#72ff52';
        pullDeviceDataButton.disabled = true;
        app.pullDeviceData()
            .then(function(value) {
                pullDeviceDataButton.style.backgroundColor = '#f0f0ff';
                pullDeviceDataButton.disabled = false;
            })
            .catch(app.onError);
    },
    touchPushDataToCloudButton: function() {
        pushDataToCloudButton.style.backgroundColor = '#1a34ff';
        pushDataToCloudButton.disabled = true;
        data.saveDataToCloud(pulledData)
            .then(function(value) {
                pushDataToCloudButton.style.backgroundColor = '#f0f0ff';
                pushDataToCloudButton.disabled = false;
            })
            .catch(app.onError);
    },
    pullDeviceData: function() {
        console.log('Starting Pull Device Data Sequence');
        return Promise.all([
                able.read_readIndex(),
                able.read_writeIndex(),
                able.read_overwriteFlag()
            ])
            .then(function(values) {
                var readIdx = values[0],
                    writeIdx = values[1],
                    overwriteFlag = values[2],
                    currentIdx,
                    endIdx,
                    retrievedData = [],
                    asyncGetDataFromFlashRange = function(currentIdx, endIdx) {
                        var p = Promise.resolve();
                        var results = [];
                        while (currentIdx <= endIdx) {
                            var wrappedFn = function(idx) { // Capture currentIdx in scope of wrappedFn for Async Execution
                                return function() { // Function Curry to make Promise Then-able
                                    return app.getDataFromFlash(idx); // Returns a Promise Object
                                };
                            }
                            p = p.then(wrappedFn(currentIdx)) // While loop iterations builds Promise Chain
                                .then(function(values) {
                                    var dataout1 = values[0],
                                        dataout2 = values[1],
                                        dataout3 = values[2];
                                    console.log('- - - - - - - - - -');
                                    results.push(dataout1, dataout2, dataout3); // Store result for each invocation of app.getDataFromflash(idx)
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
                if (readIdx === writeIdx && overwriteFlag === false) {
                    console.log('Case A: No new data.  Do nothing.');
                    return null; // No new data. Do nothing
                } else if (readIdx < writeIdx && overwriteFlag === false) {
                    console.log('Case B: New data.  Read: readIdx-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                    currentIdx = readIdx;
                    endIdx = writeIdx - 1;
                    retrievedData = asyncGetDataFromFlashRange(currentIdx, endIdx);
                    return retrievedData;
                } else if (readIdx > writeIdx && overwriteFlag === false) {
                    console.log('Case C: New data.  Read: readIdx-->125-->0-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                    return new Promise(function(resolve, reject) {
                            currentIdx = readIdx;
                            endIdx = 125;
                            retrievedData = asyncGetDataFromFlashRange(currentIdx, endIdx);
                            resolve(retrievedData);
                        })
                        .then(function(value) {
                            retrievedData = value;
                            currentIdx = 0;
                            endIdx = writeIdx - 1;
                            return asyncGetDataFromFlashRange(currentIdx, endIdx)
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
                        retrievedData = asyncGetDataFromFlashRange(currentIdx, endIdx);
                        return retrievedData;
                    } else {
                        console.log('Case D.2: New data & overwritten.  Read: writeIdx+1-->125-->0-->writeIdx-1. readIdx: ' + readIdx + ', writeIdx: ' + writeIdx + ', overwriteFlag: ' + overwriteFlag);
                        return new Promise(function(resolve, reject) {
                                currentIdx = writeIdx + 1;
                                endIdx = 125;
                                retrievedData = asyncGetDataFromFlashRange(currentIdx, endIdx);
                                resolve(retrievedData);
                            })
                            .then(function(value) {
                                retrievedData = value;
                                currentIdx = 0;
                                endIdx = writeIdx - 1;
                                return asyncGetDataFromFlashRange(currentIdx, endIdx)
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
                console.log('Pulled Data: ' + JSON.stringify(array, null, 2));
                pulledData = pulledData.concat(array);
            })
            .catch(app.onError);
    },
    getDataFromFlash: function(index) {
        return new Promise(function(resolve, reject) {
            console.log('app.getDataFromFlash(' + index + ')');
            able.write_readIndex(index)
                .then(function(index) {
                    return Promise.all([
                            able.read_dataout1(),
                            able.read_dataout2(),
                            able.read_dataout3()
                        ])
                        .then(function(values) {
                            return new Promise(function(resolve, reject) {
                                    for (var i = 0; i < values.length; i++) {
                                        values[i].flashIndex = index;
                                        values[i].flashSubindex = i;
                                        values[i].deviceUUID = retainer.device_uuid;
                                    };
                                    resolve(values);
                                })
                                .then(function(values) {
                                    return resolve(values);
                                })
                                .catch(app.onError);
                        })
                        .catch(app.onError);
                })
                .catch(app.onError);
        });
    },
    testButton: function() {
        data.saveTestObject();
    },
    hideAllUI: function() {
        mainPage.hidden = true;
        detailPage.hidden = true;
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
        alert(reason, null, 'App Error', 'Ok');
        console.log('Error in "App".');
        console.log(reason);
    }
};

// "able" = Asynchronous BLE
var able = {
    scan: function(service_uuid_array, scanTime, callback) {
        return new Promise(function(resolve, reject) {
                ble.scan(service_uuid_array, scanTime, resolve, able.onError);
            })
            .then(callback)
            .catch(able.onError);
    },
    connect: function(device_uuid) {
        var onConnect = function(info) {
            return new Promise(function(resolve, reject) {
                console.log('Connected: ' + device_uuid);
                resolve(info);
            });
        };
        return new Promise(function(resolve, reject) {
                ble.connect(device_uuid, resolve, reject);
            })
            .then(onConnect)
            .catch(able.onError);
    },
    disconnect: function(device_uuid) {
        var onDisconnect = function() {
            return new Promise(function(resolve, reject) {
                console.log('Disconnected: ' + device_uuid);
                resolve(device_uuid);
            });
        };
        return new Promise(function(resolve, reject) {
                ble.disconnect(device_uuid, resolve, reject);
            })
            .then(onDisconnect)
            .catch(able.onError);
        // TODO: Extend error handling on disconnect to handle cases in which spontaneous d/c occurs
        // TODO: Detect spontaneous d/c & then remove detailPage, show mainPage
    },
    read_time: function() {
        var onRead_time = function(data) {
            return new Promise(function(resolve, reject) {
                var unixTime = new DataView(data).getUint32(0, true);
                var date = new Date(unixTime * 1000);
                console.log('Read xgatt_time. Unix Time: ' + unixTime + ',  Date: ' + date.toJSON());
                resolve(date);
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_time.uuid,
                    resolve, reject);
            })
            .then(onRead_time)
            .catch(able.onError);
    },
    write_time: function(date) { // date is Javascript Date Object
        var onWrite_time = function(date) { // date is Javascript Date Object
            return new Promise(function(resolve, reject) {
                var unixTime = Math.floor(date.getTime() / 1000); // Unix Time is specified in seconds since Jan 1, 1970d
                var writtenDate = new Date(unixTime * 1000); // writtenDate truncates millisecond precision from date
                console.log('Wrote xgatt_time. Unix Time: ' + unixTime + ',  Date: ' + writtenDate.toJSON());
                resolve(writtenDate);
            });
        };
        return new Promise(function(resolve, reject) {
                var unixTime = Math.floor(date.getTime() / 1000); // Unix Time is specified in seconds since Jan 1, 1970
                var data = new Uint32Array([unixTime]);
                ble.write(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_time.uuid, data.buffer,
                    resolve(date), reject);
            })
            .then(function(date) {
                return onWrite_time(date);
            })
            .catch(able.onError);
    },
    read_temperature: function(event) {
        var onRead_temperature = function(data) {
            return new Promise(function(resolve, reject) {
                var rawTemperature, numTemperature, celsius;
                rawTemperature = new Uint16Array(data);
                numTemperature = parseInt(rawTemperature[0], 10);
                celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
                // console.log('Raw Temperature: ' + rawTemperature[0].toString());
                // console.log('Num Temperature: ' + numTemperature);
                // console.log('Celsius: ' + celsius);
                resolve({
                    "celsius": celsius,
                    "raw": numTemperature
                });
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                    resolve, reject);
            })
            .then(onRead_temperature)
            .catch(able.onError);
    },
    startNotify_temperature: function(onNotifyCallbackFn) { // JS Object with Celsius & Raw temperature passed as arg into user-defined onNotifyCallbackFn
        var onRead_temperature = function(data) {
            return new Promise(function(resolve, reject) {
                var rawTemperature, numTemperature, celsius;
                rawTemperature = new Uint16Array(data);
                numTemperature = parseInt(rawTemperature[0], 10);
                celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
                // console.log('Raw Temperature: ' + rawTemperature[0].toString());
                // console.log('Num Temperature: ' + numTemperature);
                // console.log('Celsius: ' + celsius);
                resolve({
                    "celsius": celsius,
                    "raw": numTemperature
                });
            });
        };
        var onStartNotification = function(data) {
            return new Promise(function(resolve, reject) {
                if (!retainer.xgatt_temperature.notifying) {
                    retainer.xgatt_temperature.notifying = true;
                    console.log('Started Temperature Notifications');
                }
                resolve(data)
            });
        };
        return new Promise(function(resolve, reject) {
                console.log('Registering Notification for xgatt_temperature');
                ble.startNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                    function(data) {
                        return onRead_temperature(data) // interpret temperature result
                            .then(onNotifyCallbackFn) // pass values into user-defined callback (for UI interaction)
                            .then(function(data) {
                                resolve(data); // Note: Resolves root Promise, not Promise chain from onRead_temperature()
                            })
                            .catch(able.onError);
                    }, reject);
            })
            .then(onStartNotification) // xgatt_temperature.notifying set only on first notification sent from device
            .catch(able.onError);
    },
    stopNotify_temperature: function() {
        var onStopNotification = function() {
            return new Promise(function(resolve, reject) {
                retainer.xgatt_temperature.notifying = false;
                //notifyTemperatureButton.innerHTML = 'Start Notifications';
                console.log('Stopped Temperature Notifications');
                resolve(retainer.xgatt_temperature.notifying);
            });
        };
        return new Promise(function(resolve, reject) {
                console.log('Unregistering Notification for xgatt_temperature');
                ble.stopNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid,
                    resolve, reject);
            })
            .then(onStopNotification)
            .catch(able.onError);
    },
    read_writeIndex: function() {
        var onRead_writeIndex = function(data) {
            return new Promise(function(resolve, reject) {
                var rawBytes = new Uint8Array(data);
                var writeIndex = rawBytes[0];
                console.log('Read xgatt_writeidx: ' + writeIndex.toString());
                resolve(writeIndex);
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_writeidx.uuid,
                    resolve, reject);
            })
            .then(onRead_writeIndex)
            .catch(able.onError);
    },
    write_readIndex: function(number) {
        var onWrite_readIndex = function(index) {
            return new Promise(function(resolve, reject) {
                console.log('Wrote xgatt_readidx: ' + index);
                resolve(index);
            });
        };
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
                return onWrite_readIndex(index);
            })
            .catch(able.onError);
    },
    read_readIndex: function() {
        var onRead_readIndex = function(data) {
            return new Promise(function(resolve, reject) {
                var rawBytes = new Uint8Array(data);
                var readIndex = rawBytes[0];
                console.log('Read xgatt_readidx: ' + readIndex.toString());
                resolve(readIndex);
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_readidx.uuid,
                    resolve, reject);
            })
            .then(onRead_readIndex)
            .catch(able.onError);
    },
    read_overwriteFlag: function() {
        var onRead_overwriteFlag = function(data) {
            return new Promise(function(resolve, reject) {
                var rawBytes = new Uint8Array(data);
                var overwriteFlag = Boolean(rawBytes[0]);
                console.log('Read xgatt_overwrite: ' + overwriteFlag);
                resolve(overwriteFlag);
            });
        };
        return new Promise(function(resolve, reject) {
                console.log('Called read_overwriteFlag');
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_overwrite.uuid,
                    resolve, reject);
            })
            .then(onRead_overwriteFlag)
            .catch(able.onError);
    },
    read_dataout1: function() {
        var onRead_dataout1 = function(data) { // Data Passed Back as ArrayBuffer Type
            return new Promise(function(resolve, reject) {
                var rawTemperature, unixTime, rawCRC, celsius, date;
                // data_packet(11): [2 bytes Temp][4 bytes Pressure][4 bytes Time][1 byte CRC]
                rawTemperature = new DataView(data).getUint16(0, true);
                unixTime = new DataView(data).getUint32(6, true);
                rawCRC = new DataView(data).getUint8(10, true)
                celsius = ((rawTemperature / 16) - 1335) * (1150 / 4096);
                date = new Date(unixTime * 1000);
                console.log('Read DataOut1. rawTemperature: ' + rawTemperature + ', rawTime: ' + unixTime + ', rawCRC: ' + rawCRC + ', celsius: ' + celsius + ', date: ' + date);
                resolve({
                    "celsius": celsius,
                    "rawTemperature": rawTemperature,
                    "deviceTime": date,
                    "deviceUnixTime": unixTime,
                    "rawCRC": rawCRC
                });
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataout1.uuid,
                    resolve, reject);
            })
            .then(onRead_dataout1)
            .catch(able.onError);
    },
    read_dataout2: function() {
        var onRead_dataout2 = function(data) { // Data Passed Back as ArrayBuffer Type
            return new Promise(function(resolve, reject) {
                var rawTemperature, unixTime, rawCRC, celsius, date;
                // data_packet(11): [2 bytes Temp][4 bytes Pressure][4 bytes Time][1 byte CRC]
                rawTemperature = new DataView(data).getUint16(0, true);
                unixTime = new DataView(data).getUint32(6, true);
                rawCRC = new DataView(data).getUint8(10, true)
                celsius = ((rawTemperature / 16) - 1335) * (1150 / 4096);
                date = new Date(unixTime * 1000);
                console.log('Read DataOut2. rawTemperature: ' + rawTemperature + ', rawTime: ' + unixTime + ', rawCRC: ' + rawCRC + ', celsius: ' + celsius + ', date: ' + date);
                resolve({
                    "celsius": celsius,
                    "rawTemperature": rawTemperature,
                    "deviceTime": date,
                    "deviceUnixTime": unixTime,
                    "rawCRC": rawCRC
                });
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataout2.uuid,
                    resolve, reject);
            })
            .then(onRead_dataout2)
            .catch(able.onError);
    },
    read_dataout3: function() {
        var onRead_dataout3 = function(data) { // Data Passed Back as ArrayBuffer Type
            return new Promise(function(resolve, reject) {
                var rawTemperature, unixTime, rawCRC, celsius, date;
                // data_packet(11): [2 bytes Temp][4 bytes Pressure][4 bytes Time][1 byte CRC]
                rawTemperature = new DataView(data).getUint16(0, true);
                unixTime = new DataView(data).getUint32(6, true);
                rawCRC = new DataView(data).getUint8(10, true)
                celsius = ((rawTemperature / 16) - 1335) * (1150 / 4096);
                date = new Date(unixTime * 1000);
                console.log('Read DataOut3. rawTemperature: ' + rawTemperature + ', rawTime: ' + unixTime + ', rawCRC: ' + rawCRC + ', celsius: ' + celsius + ', date: ' + date);
                resolve({
                    "celsius": celsius,
                    "rawTemperature": rawTemperature,
                    "deviceTime": date,
                    "deviceUnixTime": unixTime,
                    "rawCRC": rawCRC
                });
            });
        };
        return new Promise(function(resolve, reject) {
                ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataout3.uuid,
                    resolve, reject);
            })
            .then(onRead_dataout3)
            .catch(able.onError);
    },
    onError: function(reason) {
        alert(reason, null, 'Bluetooth Error', 'Ok');
        console.log('Error in "ABLE".');
        console.log(reason);
    }
}

var data = {
    initialize: function() {
        Parse.initialize('GhbTTSKlg6pCWzSSGpXzvwyMtiSTYzrwWpiDBbIz',
            'CtcPrTok6S5PgoW7eWQRQANQgeAgI9e3p6Csjlui');
    },
    saveDataToCloud: function(array) {
        return new Promise(function(resolve, reject) {
            var dataToUpload = array,
                dataPoints = [],
                DeviceData = Parse.Object.extend('deviceData1');
            if (array.length === 0) {
                alert('No new data to upload to cloud', null, 'No New Data', 'Ok');
                console.log('No New Data To Be Pushed to Parse.com');
                reject('No New Data To Be Pushed to Parse.com');
            }
            // TODO: Use Parse.Promise & Consider using destroy() in Parse API to filter array & prevent duplicate entries of data
            console.log('Uploading data to Parse.com');
            $.each(dataToUpload, function(index, value) {
                var obj = value,
                    dataPoint = new DeviceData(),
                    compareDate = new Date('February 2, 2011 03:24:00'); // BLE chip released on this date, not possible to have older data
                if (obj.deviceTime < compareDate) {
                    console.log('Invalid Data. Throwing Out: ' + JSON.stringify(obj));
                    return;
                }
                console.log('setting object');
                dataPoint.set(obj);
                dataPoints.push(dataPoint);
            });
            Parse.Object.saveAll(dataPoints, {
                success: function(list) {
                    console.log('All Data Pushed to Parse.com.  Uploaded ' + dataPoints.length + ' data objects.');
                    array.length = 0; // Clear orig. source array passed in as argument
                    resolve(dataPoints);
                },
                error: function(error) {
                    reject(error);
                    data.onError(error);
                }
            });
        })
    },
    saveTestObject: function() {
        console.log('Saving TestObject to Parse.com');
        var TestObject = Parse.Object.extend('TestObject');
        var testObject = new TestObject();
        testObject.save({
            foo: "bar"
        }, {
            success: function(object) {
                console.log('Successfully created TestObject');
            },
            error: function(model, error) {
                console.log('Failed to create TestObject');
            }
        });
    },
    onError: function(reason) {
        alert(reason, null, 'Data Error', 'Ok');
        console.log('Error in "Data".');
        console.log(reason);
    }
}

// Polyfill Functions in ES6 that are not available in ES5/Cordova
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === "number" &&
        isFinite(value) &&
        Math.floor(value) === value;
};

Number.isNumeric = Number.isNumeric || function(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function wait(ms) {
    return function() {
        return new Promise(function(resolve, reject) {
            window.setTimeout(function() {
                resolve();
            }, ms);
        });
    }
};

app.initialize();
