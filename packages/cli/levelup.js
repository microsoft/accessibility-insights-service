var levelup = require('levelup')
var leveldown = require('leveldown')
var encoding = require('encoding-down')
 
// 1) Create our store
var db = levelup(encoding(leveldown('C:/Users/ahmohame.REDMOND/Documents/apify-test1/database'), { valueEncoding: 'json', keyEncoding: 'json' }))

db.createReadStream().on('data', (data) => {
    console.log(data.key, '=', data.value)
});
