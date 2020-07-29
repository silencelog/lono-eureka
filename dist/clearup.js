"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearup = clearup;

function identity(val) {
  return val;
}

function clearup(callback) {
  callback = callback || identity;
  process.on('cleanup', callback);
  process.on('exit', function () {
    process.emit('cleanup');
  });
  process.on('SIGINT', function () {
    console.log('Ctrl-C...');
    process.exit(2);
  });
  process.on('uncaughtException', function (e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
}