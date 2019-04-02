const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')

process.noDeprecation = true

// 遍历demo下面所有目录层级，使用所有js作为entry
function getDemoEntry(dirPath, entries) {
	var reg = /.js$/
	var pageDir = fs.readdirSync(dirPath) || []

	for (var j = 0; j < pageDir.length; j++) {
		var filePath = path.resolve(dirPath, pageDir[j])
		var fileStat = fs.statSync(filePath)

		if (fileStat.isFile()) {
			if (reg.test(pageDir[j])) {
				var name = pageDir[j].replace('.js', '')

				if (entries[name]) {
					console.log('\x1b[31m')
					console.log('entry name 冲突: ' + name)
					console.log('\t', entries[name][0])
					console.log('\t', filePath)
					console.log('\x1b[0m')
				}

				entries[name] = [filePath]
			}
		} else if (fileStat.isDirectory()) {
			// 遍历子级目录
			getDemoEntry(filePath, entries)
		}
	}
	return entries
}

var ENTRY = process.env.ENTRY
var entry = {}
if (ENTRY) {
	// 手动指定一个特定entry
	entry[ENTRY] = ['./demo/' + ENTRY + '.js']
} else {
	// 查找demo目录下所有的js文件作为entry
	getDemoEntry(path.resolve(__dirname, 'demo/'), entry)
}

var config = {
	entry: entry,
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: '[name].demo.js',
		publicPath: '/static/',
		// globalObject: "this",
	},

	mode: 'development',
	plugins: [
		new ProgressBarPlugin({ width: 30 }),
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
	resolve: {
		alias: { src: path.join(__dirname, 'src') },
		extensions: ['.js', '.scss', '.css'],
	},
	module: {},
}

module.exports = config
