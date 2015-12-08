// var p2 = new Promise(function(resolve, reject) {
//   reject(1);
// });

// p2.then(function(value) {
//   console.log(value); // 1
//   return value + 1;
// }, function(value){
//   console.log('yo are a failure');
//   return 150000;
// }).catch(function(value){
//   console.log('haha failed')
//   return [value+15, 5];
// }).then(function(value) {
//   console.log('no'); // 2
// });

// // p2.then(function(value) {
// //   console.log(value); // 1
// // });