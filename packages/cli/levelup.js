var levelup = require('levelup');
var leveldown = require('leveldown');
var encoding = require('encoding-down');

// 1) Create our store
var db = levelup(
    encoding(leveldown('C:/Users/ahmohame.REDMOND/Documents/apify-test1/database3'), { valueEncoding: 'json', keyEncoding: 'json' }),
);

for (i = 0; i < 100; i++) {
    db.put(`${i}`, i);
}

db.put('count', 0);

db.createReadStream().on('data', (data) => {
    db.put('count', db.get('count') + 1);
    console.log(data.key, '=', data.value);
});

console.log(`count = ${db.get('count')}`);
