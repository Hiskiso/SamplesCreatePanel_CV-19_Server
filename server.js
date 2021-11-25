const Vue = require('vue');
const server = require('express')();
const bodyParser = require('body-parser');
const QRCode = require('qrcode')
server.use(bodyParser.json({
    limit: '50mb'
}));
const template = process.env.NODE_ENV == 'development' ? require('fs').readFileSync('./dev_template.html', 'utf-8') : require('fs').readFileSync('./prod_template.html', 'utf-8')

const renderer = require('vue-server-renderer').createRenderer({
    template,
});
server.use(bodyParser.urlencoded({
    limit: '50mb',
    parameterLimit: 100000,
    extended: true
}));

var Datastore = require('nedb');
var db = new Datastore({ filename: 'users' });
db.loadDatabase(); 

server.all('/create', async (req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "*")

    let data = null;

    if (req.body.data) {

        db.insert(req.body.data);
        let link = `https://www.gosuslvgi.ga/covid-cert/verify/${req.body.data.preview.unrz.split(' ').join('')}?lang=ru&ck=${req.body.data.data.hash}`
       
        let qr =  await new Promise((resolve, reject) => {
            QRCode.toDataURL(link, { errorCorrectionLevel: 'L', width: 300 },  (err, url)=> {
                resolve(url)
              })
        });

        data = {link, qr}
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
        json: `window.prdcrt = \`${JSON.stringify(cert)}\`;`
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
server.listen(5000, ()=>{console.log("Server started at port 5000...");});