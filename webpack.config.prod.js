var webpack = require('webpack')
var path = require('path')
var fs = require('fs')
var ProgressBarPlugin = require('progress-bar-webpack-plugin')

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
		libraryTarget: 'umd',
		globalObject: 'this',
	},
	mode: 'production',
	stats: 'normal',
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production'),
			},
		}),
		new ProgressBarPlugin({ width: 30 }),
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
	resolve: {
		alias: {
			src: path.join(__dirname, 'src'),
		},
		extensions: ['.js', '.scss', '.css'],
	},
	module: {
		rules: [
			// {
			// 	test: /\.worker.js$/,
			// 	include: /src|demo/,
			// 	use: [
			// 		{
			// 			loader: 'babel-loader',
			// 			options: {
			// 				cacheDirectory: true,
			// 				presets: [['@babel/preset-env']],
			// 				plugins: [
			// 					// '@babel/plugin-transform-runtime',
			// 					// '@babel/plugin-proposal-function-bind',
			// 					// ['@babel/plugin-proposal-decorators', { legacy: true }],
			// 					['@babel/plugin-proposal-class-properties', { loose: true }],
			// 					// ['@babel/plugin-proposal-async-generator-functions'],
			// 					// [
			// 					// 	'@babel/plugin-transform-async-to-generator',
			// 					// 	{
			// 					// 		module: 'bluebird',
			// 					// 		method: 'coroutine',
			// 					// 	},
			// 					// ],
			// 				],
			// 			},
			// 		},
			// 		{
			// 			loader: 'worker-loader',
			// 			options: { inline: true, name: '[name].js' },
			// 		},
			// 	],
			// },
			{
				test: /\.js$/,
				include: /src|demo/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							cacheDirectory: true,
							presets: [['@babel/preset-env']],
							plugins: [
								// '@babel/plugin-transform-runtime',
								// '@babel/plugin-proposal-function-bind',
								// ['@babel/plugin-proposal-decorators', { legacy: true }],
								['@babel/plugin-proposal-class-properties', { loose: true }],
								// ['@babel/plugin-proposal-async-generator-functions'],
								// [
								// 	'@babel/plugin-transform-async-to-generator',
								// 	{
								// 		module: 'bluebird',
								// 		method: 'coroutine',
								// 	},
								// ],
							],
						},
					},
				],
			},
		],
	},
}

module.exports = config
