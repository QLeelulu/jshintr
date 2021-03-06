
/**
 * Module dependencies.
 */

var fs = require('fs'),
    express = require('express'),
    app = module.exports = express.createServer(),
    config = require('./config.js'),
    hinter = require('./lib/hinter.js');

// Configuration
app.configure(function () {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

function combine(t, o) {
    var n;
    for (n in o) {
        if (is_own(o, n)) {
            t[n] = o[n];
        }
    }
}

// Goodness
app.get('/', function (req, res){
  var filename = ('/' + req.query.file).replace(/hint$/, '');

  fs.readFile(filename, function (err, data) {
    if (err) {
      res.render('sadface', {
        filename: filename
      });
    } else {
      var originalSource = data.toString('utf8'),
          source, result,
          errors = [],
          sourceLines,
          numLines,
          errorContext = 2;
      
      result = hinter(originalSource, config);
      source = result.source;
      
      if (!result.passed && result.errors[1]) {
        sourceLines = source.split("\n");
        numLines = sourceLines.length;
        
        result.errors.forEach(function (error) {
          if (!error) {
            return;
          }
          
          var startIndex = error.line - (errorContext + 1) > 0 ? error.line - (errorContext + 1) : 0,
              endIndex = error.line + errorContext > numLines ? numLines : error.line + errorContext,
              errorLineContents;
          
          // Generate a source except
          error.excerpt = {};
          sourceLines.slice(startIndex, endIndex).forEach(function (line, lineOffset) {
            error.excerpt[startIndex  + 1 + lineOffset] = line;
          });
          
          // Insert a span to highlight the error itself
          errorLineContents = injectString(error.excerpt[error.line], '<span>', error.character - 2);
          errorLineContents = injectString(errorLineContents, '</span>', error.character + 6);
          error.excerpt[error.line] = errorLineContents;
          
          errors.push(error);
        });
      }
      
      res.render('index', {
        errors: errors,
        skipped: errors.map(function (error) {
          return error.skipped ? error.hash : null
        }).filter(function(val) {
          return !!val;
        }).join(',')
      });
    }
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(config.port);
  console.log("Express server listening on port %d", app.address().port);
}

function injectString(string, inject, where) {
  return string.substr(0, where) + inject + string.substr(where);
}