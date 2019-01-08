/**;
 * @author Simon
 * @date 2019-01-08
 */

const express = require('express');
const webpack = require('webpack');
const path    = require('path');
const fs      = require('fs');
const open	  = require('open');

// create normal express app
const app = express();

// create a webpack conpiter
const config   = require('./webpack.config');
const compiler = webpack(config);

// set dev_option
const devOption = {
	noInfo: true,
	publicPath: config.output.publicPath, // 静态文件位置
	stats: 'minimal', // 进度输出
	historyApiFallback: true,
	headers: {
		'Access-Control-Allow-Origin': '*',
	},
};

app.use(require('webpack-dev-middleware')(compiler, devOption));

app.use("/assets", express.static(__dirname + '/assets'));
app.get('/favicon.ico', (req, res)=>{ res.end("") });

app.get('/html/:demoName', (req, res)=>{
    console.log('visiting demo:', req.params.demoName);
    res.sendFile(__dirname + `/demo/${req.params.demoName}.html`);
});

// listen

const interfaces = require('os').networkInterfaces();
let ip = 'localhost';
for (let devName in interfaces) {
	const iface = interfaces[devName];
	for (let i=0; i < iface.length; i++) {
		const alias = iface[i];
		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
			ip = alias.address;
		}
	}
}

const port = 3059;

app.listen(port, '0.0.0.0', (err)=>{
    if (err) {
        console.log(err);
        return;
    } else {
		console.log(`Listening @ http://${ip}:${port}`);
		open(`http://${ip}:${port}/html/index`);
	}
})
