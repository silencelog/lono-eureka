"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cleanup;

function identity(val) {
  return val;
}

function cleanup(callback) {
  callback = callback || identity;
  process.on('cleanup', callback);
  process.on('exit', function () {
    process.emit('cleanup');
  });
  process.on('SIGINT', function () {
    callback();
    setTimeout(() => {
      process.exit();
    }, 500);
  });
  process.on('uncaughtException', function (e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
}