var async = require('async');
var chalk = require('chalk');
var columnify = require('columnify');
var exec = require('child_process').exec;
var fs = require('fs-extra');
var path = require('path');

var APP_DIR = '/Users/tom/Projects/';
// var APP_DIR = '/mnt/data/vhosts/';

function listInstalls(args, doneTask) {
  fs.readdir(APP_DIR, function(error, contents) {
  var appData = {};
  async.eachSeries(contents, function eachContents(item, cb) {
    var itemDir = path.join(APP_DIR, item);

    if(!fs.statSync(itemDir).isDirectory()) {
      return cb();
    }
    loadConfig(itemDir, function(error, config) {
      // if we error here, can't be an authoring tool, so don't fail completely
      if(error) return cb();
      getVersions(config, function(error, versions) {
        // again, probably just an invalid install, don't fail
        if(error) return cb();
        checkIsLive(config, function(error, isLive) {
          if(error) return cb(error);
          if(appData[config.serverPort]) {
            console.log(`App already running on port ${config.serverPort}, please check configuration (${config.root})`);
            return cb();
          }
          appData[config.serverPort] = {
            root: config.root,
            version: {
              server: versions.server,
              framework: versions.framework
            },
            isLive: isLive
          };
          cb();
        });
      });
    });
  }, function doneEachSeries(error) {
    if(error) return console.log(error);
    printData(appData);
    doneTask();
  });
});
}

function loadConfig(dir, cb) {
  fs.readJson(path.join(dir, 'conf', 'config.json'), function(error, config) {
    if(error) return cb(error);
    // set here, as this will cause issues later
    if(config.root !== dir) config.root = dir;

    cb(null, config);
  });
}

// check if we're listening to the specified port
// TODO check and warn of any installs trying to listen to the same port
function checkIsLive(config, cb) {
  var isLive = false;
  var proc = exec(`nc -z 127.0.0.1 ${config.serverPort}; echo $?`, { stdio: [0, 'pipe', 'pipe'] }, function(error) {
    if(error) return cb(error);
    cb(null, isLive);
  });
  proc.stdout.on('data', function(data) {
    if("0" === data.trim()) isLive = true;
  });
}

function getVersions(config, done) {
  async.parallel([
    function getFrameworkVersion(cb) {
      var tenantId = config.masterTenantID;
      if(!tenantId) cb(new Error(`No masterTenantID for ${config.root}`))
      fs.readJson(path.join(config.root, 'temp', tenantId, 'adapt_framework', 'package.json'), function(error, pkg) {
        if(error) return cb(error);
        cb(null, pkg.version);
      });
    },
    function getServerVersion(cb) {
      fs.readJson(path.join(config.root, 'package.json'), function(error, pkg) {
        if(error) return cb(error);
        cb(null, pkg.version);
      });
    }
  ], function(error, data) {
    if(error || data.length < 2) {
      return done(error);
    }
    return done(null, {
      framework: data[0],
      server: data[1]
    });
  });
}

function formatData(data) {
  var organised = [];
  var keys = Object.keys(data).sort();
  for(var i = 0, count = keys.length; i < count; i++) {
    var port = keys[i];
    var item = data[port];
    organised.push({
      name: colourise(item.root.replace(APP_DIR, ''), item.isLive),
      port: colourise(port, item.isLive),
      live: colourise(item.isLive ? 'Y' : 'n', item.isLive),
      server: colourise(item.version.server, item.isLive),
      framework: colourise(item.version.framework, item.isLive)
    });
  }
  // make text grey if site isn't live
  function colourise(text, isLive) { return isLive ? text : chalk.grey(text); }

  return organised;
}

function printData(data) {
  console.log(`Showing authoring tool installs in ${chalk.underline(APP_DIR)}\n`);
  console.log(columnify(formatData(data), {
    headingTransform: function(heading) {
      return chalk.underline(heading.toUpperCase());
    },
    columnSplitter: '   ',
    config: {
      live: { align: 'center' }
    }
  }));
}

exports = module.exports = {
  function: listInstalls,
  description: "Lists and shows the status of installed authoring tools"
};
