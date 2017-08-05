#! /usr/bin/env node
var columnify = require('columnify');
var chalk = require('chalk');
var fs = require('fs-extra');
var minimist = require("minimist");
var path = require("path");

var args = minimist(process.argv.slice(2));
var pkg = require(path.join(__dirname, "package.json"));

// entry point
processCommand();

function processCommand() {
  var command = args._[0];

  if(!command) {
    console.log('');
    // handle standard flags
    if(args.v || args.version) {
      console.log(`${pkg.name} (v${pkg.version})\n`);
    } else if(args.h || args.help) {
      showHelp();
    } else {
      console.log(`You need to specify a command to run. \n${chalk.green('Run again with the --help flag to show a list of available commands.')}\n`);
    }
    return;
  }
  try {
    var commandHandler = require(path.join(__dirname, "bin", command)).function;
  } catch(e) {
    return console.log("'" + command + "' is not a valid command.");
  }
  console.log("");
  commandHandler(args, function finishedCommand(error, data) {
    if(error) console.log(error);
    else console.log("");
    // make sure we close properly
    process.exit();
  });
}

function showHelp() {
  console.log('Available commands:\n');
  var commands = [];
  fs.readdir(path.join(__dirname, "bin"), function(error, contents) {
    contents.forEach(function(item) {
      var data = require(path.join(__dirname, "bin", item));
      commands.push({
        command: chalk.underline(item.split(".")[0]),
        description: data.description || ""
      });
    });
    console.log(columnify(commands, {
      showHeaders: false,
      columnSplitter: '   '
    }) + '\n');
  });
}
