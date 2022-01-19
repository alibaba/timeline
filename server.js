/**
 * Copyright(c) 2017 Alibaba Group Holding Limited
 * @author Simon
 * @date 2019-01-08
 */

const express = require('express')
const webpack = require('webpack')
const path = require('path')
const jade = require('pug')
const fs = require('fs')

// create normal express app
const app = express()

// listen
// 获取 host IP
const interfaces = require('os').networkInterfaces()
let ip = 'localhost'
for (let devName in interfaces) {
	const iface = interfaces[devName]
	for (let i = 0; i < iface.length; i++) {
		const alias = iface[i]
		if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
			ip = alias.address
		}
	}
}

const port = 3059

console.log(`Listening 👉  http://${ip}:${port} 👈 \n`)

app.listen(port, '0.0.0.0', (err) => {
	if (err) {
		console.log(err)
	}
})

const config = require('./webpack.config')
const compiler = webpack(config)

// set dev_option
const devOption = {
	stats: {
		entrypoints: false,
		modules: false,
		colors: true,
		version: true,
		warnings: false,
		hash: false,
		builtAt: false,
		performance: false,
	},
	publicPath: config.output.publicPath, // 静态文件位置
	headers: {
		'Access-Control-Allow-Origin': '*',
	},
}

// use webpack middleware with compiler & dev_option
app.use(require('webpack-dev-middleware')(compiler, devOption))

app.use(function (req, res, next) {
	req.headers['if-none-match'] = 'no-match-for-this'
	next()
})

app.use('/assets', express.static(path.join(__dirname, '/assets')))

app.get('/favicon.ico', (req, res) => {
	res.end('')
})

app.get('/html/:htmlName', (req, res) => {
	console.log('visiting html:', req.params.htmlName)
	res.sendFile(path.join(__dirname, 'demo', `${req.params.htmlName}.html`))
})

app.get('/getTime', (req, res) => {
	const data = {
		success: true,
		time: new Date().getTime(),
	}
	res.writeHead(200, { 'Content-Type': 'application/json charset=utf-8' })
	res.end(JSON.stringify(data))
})

// compile jade & route '/'to index.html
app.get('/:demoName', (req, res) => {
	console.log('visiting demo:', req.params.demoName)
	var html = jade.renderFile(path.join(__dirname, 'demo', 'entry.jade'), {
		demoName: req.params.demoName,
		ran: '?ran=' + Math.random(),
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

// compile jade & route '/'to index.html
app.get('/', (req, res) => {
	console.log('visiting index')
	const html = jade.renderFile(path.join(__dirname, 'demo', 'index.jade'), {
		demos: getDemoEntries(),
	})
	res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
	res.end(html)
})

function getDemoEntries() {
	const dirPath = path.resolve(__dirname, 'demo/')
	const entries = []
	const reg = /.js$/
	const pageDir = fs.readdirSync(dirPath) || []

	for (let j = 0; j < pageDir.length; j++) {
		const filePath = path.resolve(dirPath, pageDir[j])
		const fileStat = fs.statSync(filePath)
		if (fileStat.isFile() && reg.test(pageDir[j])) {
			const name = pageDir[j].replace('.js', '')
			entries.push(name)
		}
	}
	return entries
}
