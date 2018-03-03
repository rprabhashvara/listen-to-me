const express = require('express');
const bodyParser = require('body-parser');
var qs = require('qs');

var serverOffer = [];
var clientAnswers = [];

var app = express();
//configure express
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
  res.sendFile('index.html');
});

app.post('/pushAnswer', function (req, res) {
    var body = qs.parse(req.body);

    // add to offers
    clientAnswers.push(body);

    res.send('{"SUCCESS": true}');
});
app.get('/pullOffers', function (req, res) {
  res.send( JSON.stringify( { "SUCCESS": true, "DATA": serverOffer  } ) );
});

app.post('/pushOffers', function (req, res) {

  var body = qs.parse(req.body);

  // add to offers
  serverOffer.push(body);

  res.send('{"SUCCESS": true}');
});
app.get('/pullAnswers', function (req, res) {

    var answers = [];
    if( clientAnswers.length > 0 ){

        for( var i = 0 ; i < clientAnswers.length; i++){
            answers.push( clientAnswers[i] );
        }

    }
    clientAnswers = [];

  res.send( JSON.stringify( { "SUCCESS": true, "DATA": answers  } ) );
});


app.listen(3000, function () {
  console.log('Listen to me on port 3000!');
});
