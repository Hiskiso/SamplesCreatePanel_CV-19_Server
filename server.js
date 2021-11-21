const Vue = require('vue');
const server = require('express')();
const bodyParser = require('body-parser');
server.use(bodyParser.json({
    limit: '50mb'
}));

server.use(bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: true
}));

var Datastore = require('nedb');
var db = new Datastore({ filename: 'users' });
db.loadDatabase();



const template = require('fs').readFileSync('./template.html', 'utf-8');

const renderer = require('vue-server-renderer').createRenderer({
    template,
});

server.all('/create', (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "*")

    let data = null;

    if (req.body.data) {

        db.insert(req.body.data);
        db.find({}, function (err, docs) {
            err && console.error(err)
            data = docs
            console.log(data);
        });
    }

    res.json({ msg: 'ok', data })
})


server.get('/covid-cert/verify/:unrz', async (req, res) => {
    
    let certs = await new Promise((resolve, reject) => {
        db.find({}, function (err, docs) {
            resolve(docs);
        });
    });

    let cert = await certs.find((val) => val.preview.unrz.split(' ').join('') == req.params.unrz)

 if(cert !== undefined){
      if (cert.data.hash == req.query.ck) {
        
        cert =  cert && cert.preview
    }
    else {
        res.redirect("https://www.gosuslugi.ru/404")
    }
 }
 else {
    res.redirect("https://www.gosuslugi.ru/404")
}



    

    const context = {
        json: `let strjson = \`${JSON.stringify(cert)}\``
    };
    
    const app = new Vue({
        data: {
            url: req.url
        },
        template: `<div></div>`,
    });

    renderer
    .renderToString(app, context, (err, html) => {
            if (err) {
                console.log(err);
                res.status(500).end('Internal Server Error')
                return;
            }
            res.end(html);
        });
    })
    
    server.all('*', (req, res)=>{ res.redirect("https://www.gosuslugi.ru/404")})
    server.all('/covid-cert', (req, res)=>{ res.redirect("https://www.gosuslugi.ru/404")})
server.listen(8080);