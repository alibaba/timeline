// const webpack = require('webpack')
const path = require('path')
// const fs = require('fs')
// const ProgressBarPlugin = require('progress-bar-webpack-plugin')
// const TerserPlugin = require('terser-webpack-plugin')

process.noDeprecation = true

var config = {
	entry: {
		timeline: [path.resolve('./src/index.js')],
	},
	output: {
		path: path.resolve('./dist'),
		publicPath: '/', // 为使内网可访问, 不指明host
		filename: '[name].js',
		libraryTarget: 'umd',
		umdNamedDefine: true,
		globalObject: 'this',
	},
	mode: 'production',
	stats: 'normal',
	devtool: 'source-map', // 把sourcemap作为单独的文件发布上去
	module: {
		rules: [
			{
				test: /\.js$/,
				include: /src|demo/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: [['@babel/preset-env', { targets: 'defaults' }]],
						},
					},
				],
			},
		],
	},
}

module.exports = config
