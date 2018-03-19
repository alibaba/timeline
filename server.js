/**
 * webpackp-dev-server & 服务器端REST接口
 * @author Meng
 * @date 2016-07-14
 */

const express = require('express')
const webpack = require('webpack')
const path    = require('path')
const fs      = require('fs')
const open	  = require('open')
// const comp    = require('compression')

// create normal express app
const app = express()

// create a webpack conpiter
const config   = require('./webpack.config')
const compiler = webpack(config)

// set dev_option
var devOption = {
    noInfo: true,
    publicPath: config.output.publicPath, // 静态文件位置
    stats: { colors: true }, // 进度输出
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
}

// app.use(comp())

// use webpack middleware with compiter & dev_option
app.use(require('webpack-dev-middleware')(compiler, devOption))
// app.use(require('webpack-hot-middleware')(compiler))

app.use("/assets", express.static(__dirname + '/assets'))

app.get('/favicon.ico', (req, res)=>{ res.end("") })

// compit jade & route '/'to index.html
app.get('/html/:demoName', (req, res)=>{
    console.log('visiting demo:', req.params.demoName)
    res.sendFile(__dirname + `/demo/${req.params.demoName}.html`);
})

// listen
app.listen(3059, '0.0.0.0', (err)=>{
    if (err) {
        console.log(err)
        return
    }
    else {
        console.log('Listening @ http://localhost:3059')
		open('http://localhost:3059')
    }
})


function getDemoEntries() {
    var dirPath = path.resolve(__dirname, 'demo/')
    var entries = [];
    var reg = /.js$/;
    var pageDir = fs.readdirSync(dirPath) || [];

    for (var j = 0; j < pageDir.length; j++) {
        var filePath = path.resolve(dirPath, pageDir[j]);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile() && reg.test(pageDir[j])) {
            var name = pageDir[j].replace('.js', '');
            entries.push(name);
        }
    }
    return entries;
}
