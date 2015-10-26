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

 /* globals console, window, document, refreshButton, deviceList, readTemperatureButton, disconnectButton, notifyTemperatureButton,
    pullDeviceDataButton, testDataQueryButton, ble, temperatureValue, temperatureList, detailPage, mainPage, alert */
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
    xgatt_readIdx: {
        uuid: "be2e55a0-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_writeIdx: {
        uuid: "c3b2d730-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataOut1: {
        uuid: "d3d7d610-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataOut2: {
        uuid: "d3d7d611-a6e7-11e2-9e96-0800200c9a66",
        notifying: false
    },
    xgatt_dataOut3: {
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
    xgatt_loggerType: {
        uuid: "67a9483c-8756-48e8-87c2-82c8aaff9242",
        notifying: false
    }
};


var temperatures = [];

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

        readTemperatureButton.addEventListener('touchend', this.readTemperature, false);
        disconnectButton.addEventListener('touchend', this.disconnect, false);
        notifyTemperatureButton.addEventListener('touchend', this.toggleNotifyTemperature, false);
        pullDeviceDataButton.addEventListener('touchend', this.pullDeviceData, false);
        testDataQueryButton.addEventListener('touchend', this.testDataQuery, false);
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
    readTemperature: function(event) {
        console.log('Calling readTemperature');
        ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid, 
                 app.onTemperatureRead, app.onError);
    },
    toggleNotifyTemperature: function(e) {
        if (!retainer.xgatt_temperature.notifying) {
            console.log('Registering Notification for xgatt_temperature');
            ble.startNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid, function(data) {
                if (!retainer.xgatt_temperature.notifying) {
                    retainer.xgatt_temperature.notifying = true;
                    notifyTemperatureButton.innerHTML = 'Stop Notifications';
                    console.log('Started Temperature Notifications');
                }
                app.onTemperatureRead(data);
            }, app.onError);
        } else{
            console.log('Unregistering Notification for xgatt_temperature');
            ble.stopNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_temperature.uuid, function() {
                retainer.xgatt_temperature.notifying = false;
                notifyTemperatureButton.innerHTML = 'Start Notifications';
                console.log('Stopped Temperature Notifications');
            }, app.onError);
        };
    },
    onTemperatureRead: function(data) {
        var rawTemperature, numTemperature, celsius;
        rawTemperature = new Uint16Array(data);
        numTemperature = parseInt(rawTemperature[0],10);
        celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
        console.log(celsius + ' celsius');
        temperatureValue.innerHTML = celsius.toString().substring(0,7) + '&ordm;C';
        temperatures.push(celsius);
        temperatureList.innerHTML = temperatures.join('<br/>');
    },
    pullDeviceData: function() {
        console.log('Starting Pull Device Data Sequence');
        Promise.all([
            app.readLastReadIndex(),
            app.readLastWrittenIndex(),
            app.readOverwriteFlag()
        ])
        .then(function(values) {
            console.log('Promise All Then-ed');
            console.log(values);
            var readIdx = values[0], writeIdx = values[1], overwriteFlag = values[2], dataOut1_notify;
            console.log('readIdx: ' + readIdx + ", writeIdx: " + writeIdx + ", overwriteFlag: " + overwriteFlag + ", dataOut1_notify: " + dataOut1_notify);
            var currentIdx = readIdx;
            console.log('Z: ' + retainer.xgatt_dataOut1.notifying);
            while (currentIdx < writeIdx - 1) {
                app.writeLastReadIndex(currentIdx)
                .then(function(value) {
                    window.setTimeout(null, 500);
                })
                .then(app.readDataOut1)
                .then(function(value) {
                    console.log('onDataOut1Read resolve value: ' + value.rawTemperature + ' ' + value.rawTime + ' ' + value.rawCRC);
                })
                .catch(app.onError);
                // TODO: make asynchronous w/ generating array of functions binding Idx & sending to Promise.all + making writeIdx - 1 be the last to be read
                currentIdx += 1;
            }
            // TODO: cannot have while loop that asynchronously reads a single characteristic
            // DataOut shifting functionality works, but we need to always wait for dataout to come back before incrementing loop & reading next one
        })
        .catch(app.onError);
        // TODO: Change all xgatt_ to lowercase again to be consistent w/ orthodonticslogger code
    },
    testDataQuery: function() {
        app.writeLastReadIndex(9)
        .then(function(value) {
            console.log('writeLastReadIndex(9) Result: ' + value);
            return app.readDataOut1();
        })
        .then(function(value) {
            console.log('onDataOut1Read resolve value: ' + value.rawTemperature + ' ' + value.rawTime + ' ' + value.rawCRC);
            return app.writeLastReadIndex(10);
        })
        .then(function(value) {
            console.log('writeLastReadIndex(10) Result: ' + value);
            return app.readDataOut1();
        })
        .then(function(value) {
            console.log('onDataOut1Read resolve value: ' + value.rawTemperature + ' ' + value.rawTime + ' ' + value.rawCRC);
        })
        .catch(app.onError);
    },
    readLastWrittenIndex: function() {
        console.log('Called readLastWrittenIndex');
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_writeIdx.uuid,
                     resolve, reject)
        })
        .then(app.onLastWrittenIndexRead)
        .catch(app.onError);
    },
    onLastWrittenIndexRead: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            console.log('Last Written Index: ' + rawBytes[0].toString());
            console.log(rawBytes);
            var lastWrittenIndex = rawBytes[0];
            resolve(lastWrittenIndex);
        });
    },
    writeLastReadIndex: function(number) {
        return new Promise(function(resolve, reject) {
            //Only takes integers 0-125 to index into the cyclical flash data structure on device
            if (!(Number.isInteger(number) && number >= 0 && number <= 125)) {
                this.reject(new Error('The "Read Index" must be an integer and must be between 0-125'));
            }
            var data = new Uint8Array([number, 0x80]);
            ble.write(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_readIdx.uuid, data.buffer,
                resolve(number), reject);
        })
        .then(function(index) {
            return app.onLastReadIndexWrite(index);
        })
        .catch(app.onError);
    },
    onLastReadIndexWrite: function(index) {
        return new Promise(function(resolve, reject) {
            console.log('Wrote xgatt_readIdx: ' + index);
            resolve(index);
        });
    },
    readLastReadIndex: function() {
        console.log('Called readLastReadIndex');
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_readIdx.uuid, 
                     resolve, reject);
        })
        .then(app.onLastReadIndexRead)
        .catch(app.onError);
    },
    onLastReadIndexRead: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            console.log('Last Read Index: ' + rawBytes[0].toString());
            console.log(rawBytes);
            var lastReadIndex = rawBytes[0];
            resolve(lastReadIndex);
        });
    },
    readOverwriteFlag: function() {
        console.log('Called readOverwriteFlag');
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_overwrite.uuid, 
                resolve, reject);
        })
        .then(app.onOverwriteFlagRead)
        .catch(app.onError);
    },
    onOverwriteFlagRead: function(data) {
        return new Promise(function(resolve, reject) {
            var rawBytes = new Uint8Array(data);
            console.log('Overwrite Flag: ' + rawBytes[0].toString());
            var overwriteFlag = rawBytes[0];
            resolve(overwriteFlag);
        });
    },
    readDataOut1: function() {
        return new Promise(function(resolve, reject) {
            ble.read(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataOut1.uuid,
                resolve, reject);
        })
        .then(app.onDataOut1Read)
        .catch(app.onError);
    },
    onDataOut1Read: function(data) {    // Data Passed Back as ArrayBuffer Type
        console.log('onDataOut1Read');
        return new Promise(function(resolve, reject) {
            var rawTemperature, rawTime, rawCRC, numTemperature, celsius;
            var rawBytes = new Uint8Array(data);
            console.log(rawBytes);

            // data_packet(11): [2 bytes Temp][4 bytes Pressure][4 bytes Time][1 byte CRC]
            rawTemperature = new DataView(data).getUint16(0);
            rawTime = new DataView(data).getUint16(6);
            rawCRC = new DataView(data).getUint8(10)

            console.log('rawTemperature: ' + rawTemperature);
            console.log('rawTime: ' + rawTime);
            console.log('rawCRC: ' + rawCRC);

            numTemperature = parseInt(rawTemperature[0],10);
            celsius = ((numTemperature / 16) - 1335) * (1150 / 4096);
            console.log(celsius + ' celsius');

            resolve({"rawTemperature":rawTemperature, "rawTime":rawTime, "rawCRC":rawCRC});
        });
    },
    // enableNotifyDataOut1: function() {
    //     console.log('A1: DataOut1 Notifying: ' + retainer.xgatt_dataOut1.notifying);
    //     if (!retainer.xgatt_dataOut1.notifying) {
    //         return new Promise(function(resolve, reject) {
    //             console.log('Registering Notification for xgatt_dataOut1');
    //             ble.startNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataOut1.uuid,
    //                 resolve, reject);
    //             console.log('B: ' + retainer.xgatt_dataOut1.notifying);
    //             resolve(retainer.xgatt_dataOut1.notifying); // Force Success Callback on Successful Registering for Notifications
    //         })
    //         .then(function(data) {
    //             console.log('Success Callback for NotifyDataOut1');
    //             console.log(data);
    //             return app.onDataOut1Read(data);
    //         })
    //         .catch(app.onError);
    //     } else {
    //         return new Promise(function(resolve, reject) {
    //             console.log('DataOut1 Notifications Already Enabled');
    //             resolve(retainer.xgatt_dataOut1.notifying);
    //         });
    //     }
    // },
    // onDataOut1Read: function(data) {
    //     console.log('C: ' + retainer.xgatt_dataOut1.notifying);
    //     if (!retainer.xgatt_dataOut1.notifying) {
    //         // Success Callback on Successful Registering for Notifications
    //         return new Promise(function(resolve, reject) {
    //             retainer.xgatt_dataOut1.notifying = true;
    //             console.log('Started DataOut1 Notifications');
    //             console.log('D: ' + retainer.xgatt_dataOut1.notifying);
    //             resolve(retainer.xgatt_dataOut1.notifying);
    //         });
    //     } else {
    //         // Normal Notification Callback when New Data Delivered to xgatt_dataOut1
    //         return new Promise(function(resolve, reject) {
    //             var rawBytes = new Uint8Array(data);
    //             console.log('DataOut1: ' + rawBytes.toString());
    //             console.log('E: ' + retainer.xgatt_dataOut1.notifying);
    //             //resolve(rawBytes);
    //             resolve(342);
    //         });
    //     }
    // },
    // disableNotifyDataOut1: function() {
    //     console.log('A2: DataOut1 Notifying: ' + retainer.xgatt_dataOut1.notifying);
    //     if (retainer.xgatt_dataOut1.notifying) {
    //         return new Promise(function(resolve, reject) {
    //             ble.stopNotification(retainer.device_uuid, retainer.xgatt_service.uuid, retainer.xgatt_dataOut1.uuid, 
    //                 resolve, reject);
    //             console.log('F: ' + retainer.xgatt_dataOut1.notifying);
    //         })
    //         .then(function() {
    //             retainer.xgatt_dataOut1.notifying = false;
    //             console.log('Unregistered Notification for xgatt_dataOut1');
    //             console.log('G: ' + retainer.xgatt_dataOut1.notifying);
    //             return retainer.xgatt_dataOut1.notifying;
    //         })
    //         .catch(app.onError);
    //     } else {
    //         return new Promise(function(resolve, reject) {
    //             console.log('DataOut1 Notifications Already Disabled');
    //             resolve(retainer.xgatt_dataOut1.notifying);
    //         })
    //     }
    // },
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

app.initialize();